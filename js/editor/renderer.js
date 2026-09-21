/**
 * renderer.js — Renderizador estilo CADe_SIMU (IEC 60617)
 *
 * Fondo blanco · líneas negras → rojas al energizarse
 * Símbolos IEC: contactos | |  |/|  bobinas rectangulares
 */

/* ── Colores ──────────────────────────────────────────────────────── */
const C_OFF = '#1a1a1a';
const C_ON  = '#cc1111';
const C_DIM = '#999';

/* ── SVG base ─────────────────────────────────────────────────────── */
function w(on) {
  return `stroke="${on ? C_ON : C_OFF}" stroke-width="${on ? 2.5 : 2}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
}
function tw(on) {
  return `fill="${on ? C_ON : C_OFF}" stroke="none"`;
}

/*
 * Todos los símbolos usan viewBox="0 0 80 60"
 * El cable horizontal está en y=30.
 * x=0 y x=80 son los puntos de conexión.
 */
function svgSymbol(type, on) {
  const ww = w(on);
  const t  = tw(on);

  switch (type) {

    /* ── Contacto NA  —| |— ──────────────────────────────────────── */
    case 'XIC':
      return `
        <line x1="0"  y1="30" x2="24" y2="30" ${ww}/>
        <line x1="24" y1="14" x2="24" y2="46" ${ww}/>
        <line x1="56" y1="14" x2="56" y2="46" ${ww}/>
        <line x1="56" y1="30" x2="80" y2="30" ${ww}/>`;

    /* ── Contacto NC  —|/|— ──────────────────────────────────────── */
    case 'XIO':
      return `
        <line x1="0"  y1="30" x2="24" y2="30" ${ww}/>
        <line x1="24" y1="14" x2="24" y2="46" ${ww}/>
        <line x1="56" y1="14" x2="56" y2="46" ${ww}/>
        <line x1="56" y1="30" x2="80" y2="30" ${ww}/>
        <line x1="24" y1="44" x2="56" y2="16" ${ww}/>`;

    /* ── Bobina OTE  —[ ]— ───────────────────────────────────────── */
    case 'OTE':
      return `
        <line x1="0"  y1="30" x2="16" y2="30" ${ww}/>
        <rect x="16" y="19" width="48" height="22" rx="2" ${ww}/>
        <line x1="64" y1="30" x2="80" y2="30" ${ww}/>`;

    /* ── Bobina Set  —[S]— ───────────────────────────────────────── */
    case 'OTL':
      return `
        <line x1="0"  y1="30" x2="16" y2="30" ${ww}/>
        <rect x="16" y="19" width="48" height="22" rx="2" ${ww}/>
        <text x="40" y="35" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" ${t}>S</text>
        <line x1="64" y1="30" x2="80" y2="30" ${ww}/>`;

    /* ── Bobina Reset  —[R]— ─────────────────────────────────────── */
    case 'OTU':
      return `
        <line x1="0"  y1="30" x2="16" y2="30" ${ww}/>
        <rect x="16" y="19" width="48" height="22" rx="2" ${ww}/>
        <text x="40" y="35" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" ${t}>R</text>
        <line x1="64" y1="30" x2="80" y2="30" ${ww}/>`;

    default:
      return `
        <line x1="0"  y1="30" x2="80" y2="30" stroke="#f00" stroke-width="1" fill="none"/>
        <text x="5" y="26" fill="red" stroke="none" font-size="9">${type}?</text>`;
  }
}

/* ── LadderRenderer ───────────────────────────────────────────────── */
export class LadderRenderer {
  constructor(container, callbacks) {
    this.container = container;
    this.cb = callbacks;
  }

  /* ── Render completo ────────────────────────────────────────────── */
  render(rungs, vars) {
    if (rungs.length === 0) {
      this.container.innerHTML = `
        <div class="ladder-empty">
          <div class="ladder-empty-icon">⚡</div>
          <p>Programa vacío</p>
          <button class="btn btn-add-first-rung">+ Agregar primer Rung</button>
        </div>`;
      this.container.querySelector('.btn-add-first-rung')
        ?.addEventListener('click', () => this.cb.onAddRungAfter?.(-1));
      return;
    }

    this.container.innerHTML =
      rungs.map((rung, i) => this._rungHTML(rung, i, vars)).join('') +
      `<div class="rung-footer">
         <button class="btn-add-rung" data-after="${rungs.length - 1}">＋ Agregar Rung</button>
       </div>`;

    this._attach();
  }

  /* ── Actualización ligera durante scan ──────────────────────────── */
  updateStates(rungs, vars) {
    for (const rung of rungs) {
      for (let i = 0; i < rung.elements.length; i++) {
        const el  = rung.elements[i];
        const on  = vars.getBool(el.addrType, el.address);
        const dom = this.container.querySelector(
          `[data-rung="${rung.id}"][data-idx="${i}"]`
        );
        if (!dom) continue;
        dom.classList.toggle('energized', on);
        const svg = dom.querySelector('svg');
        if (svg) svg.innerHTML = svgSymbol(el.type, on);

        // actualizar wire izquierdo del elemento
        const wire = dom.querySelector('.elem-wire-left');
        if (wire) wire.classList.toggle('wire-on', on);

        const lbl = dom.querySelector('.elem-label');
        if (lbl) lbl.classList.toggle('label-on', on);
      }

      // actualizar wire fill (cuando no hay elementos)
      const fill = this.container.querySelector(`.rung-wire-fill[data-rung="${rung.id}"]`);
      if (fill) fill.classList.toggle('wire-on', false);
    }
  }

  /* ── Genera HTML de un rung ─────────────────────────────────────── */
  _rungHTML(rung, idx, vars) {
    const elems = rung.elements;

    const elemsHTML = elems.length === 0
      ? `<div class="rung-wire-fill" data-rung="${rung.id}"></div>`
      : elems.map((el, i) => {
          const on = vars ? vars.getBool(el.addrType, el.address) : false;
          const isCoil = ['OTE','OTL','OTU'].includes(el.type);
          return `
            <div class="ladder-elem${on ? ' energized' : ''}${isCoil ? ' is-coil' : ''}"
                 data-rung="${rung.id}" data-idx="${i}"
                 title="Click para editar · ${el.type} ${el.label}">
              <div class="elem-label${on ? ' label-on' : ''}">${el.label}</div>
              <svg viewBox="0 0 80 60" width="80" height="60" xmlns="http://www.w3.org/2000/svg">
                ${svgSymbol(el.type, on)}
              </svg>
            </div>`;
        }).join('');

    const hasElems = elems.length > 0;

    return `
      <div class="rung-row" data-id="${rung.id}">
        <div class="rung-num">${idx}</div>

        <!-- Rail izquierdo -->
        <div class="power-rail-left"></div>

        <!-- Contenido del rung -->
        <div class="rung-content">
          ${elemsHTML}
          <button class="btn-add-elem" data-rung="${rung.id}" title="Insertar componente (seleccioná uno en la paleta)">＋</button>
          <!-- wire de cierre hacia el rail derecho -->
          <div class="rung-wire-right${hasElems ? '' : ' wire-empty'}"></div>
        </div>

        <!-- Rail derecho -->
        <div class="power-rail-right"></div>

        <!-- Eliminar rung -->
        <button class="btn-del-rung" data-rung="${rung.id}" title="Eliminar rung">×</button>
      </div>`;
  }

  /* ── Event listeners ────────────────────────────────────────────── */
  _attach() {
    this.container.querySelectorAll('.ladder-elem').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        this.cb.onElementClick?.(el.dataset.rung, parseInt(el.dataset.idx, 10));
      });
    });

    this.container.querySelectorAll('.btn-add-elem').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.cb.onAddElement?.(btn.dataset.rung);
      });
    });

    this.container.querySelectorAll('.btn-del-rung').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('¿Eliminar este rung?')) this.cb.onRemoveRung?.(btn.dataset.rung);
      });
    });

    this.container.querySelectorAll('.btn-add-rung').forEach(btn => {
      btn.addEventListener('click', () => {
        this.cb.onAddRungAfter?.(parseInt(btn.dataset.after ?? '-1', 10));
      });
    });
  }
}
