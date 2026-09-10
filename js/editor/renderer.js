/**
 * renderer.js — Renderizador HTML+SVG del diagrama Ladder
 *
 * Cada rung es un div flex-row:
 *   [N] [|RAIL] [SVG elem...] [+] [RAIL|] [×]
 *
 * Los SVG de cada elemento incluyen sus stubs de wire en x=0 y x=80,
 * por lo que al ponerse side-by-side forman un cable continuo.
 */

/* ── Símbolos SVG ──────────────────────────────────────────────────── */

const ON  = '#3fb950'; // --green
const OFF = '#8b949e'; // --text-muted

function wire(col, sw) {
  return `stroke="${col}" stroke-width="${sw}" stroke-linecap="round" fill="none"`;
}

function svgSymbol(type, on) {
  const col = on ? ON : OFF;
  const sw  = on ? 2.5 : 2;
  const w   = wire(col, sw);
  const txt = `fill="${col}" stroke="none" font-family="monospace" font-size="14" font-weight="bold"`;

  switch (type) {
    case 'XIC':
      return `
        <line x1="0"  y1="30" x2="18" y2="30" ${w}/>
        <line x1="18" y1="12" x2="18" y2="48" ${w}/>
        <line x1="62" y1="12" x2="62" y2="48" ${w}/>
        <line x1="62" y1="30" x2="80" y2="30" ${w}/>`;

    case 'XIO':
      return `
        <line x1="0"  y1="30" x2="18" y2="30" ${w}/>
        <line x1="18" y1="12" x2="18" y2="48" ${w}/>
        <line x1="62" y1="12" x2="62" y2="48" ${w}/>
        <line x1="62" y1="30" x2="80" y2="30" ${w}/>
        <line x1="18" y1="48" x2="62" y2="12" ${w}/>`;

    case 'OTE':
      return `
        <line x1="0"  y1="30" x2="16" y2="30" ${w}/>
        <path d="M 27 10 Q 12 30 27 50" ${w}/>
        <path d="M 53 10 Q 68 30 53 50" ${w}/>
        <line x1="64" y1="30" x2="80" y2="30" ${w}/>`;

    case 'OTL':
      return `
        <line x1="0"  y1="30" x2="16" y2="30" ${w}/>
        <path d="M 27 10 Q 12 30 27 50" ${w}/>
        <path d="M 53 10 Q 68 30 53 50" ${w}/>
        <text x="40" y="35" text-anchor="middle" ${txt}>S</text>
        <line x1="64" y1="30" x2="80" y2="30" ${w}/>`;

    case 'OTU':
      return `
        <line x1="0"  y1="30" x2="16" y2="30" ${w}/>
        <path d="M 27 10 Q 12 30 27 50" ${w}/>
        <path d="M 53 10 Q 68 30 53 50" ${w}/>
        <text x="40" y="35" text-anchor="middle" ${txt}>R</text>
        <line x1="64" y1="30" x2="80" y2="30" ${w}/>`;

    default:
      return `<text x="5" y="35" fill="red" stroke="none" font-size="11">${type}?</text>`;
  }
}

/* ── LadderRenderer ────────────────────────────────────────────────── */

export class LadderRenderer {
  /**
   * @param {HTMLElement} container
   * @param {{
   *   onElementClick: (rungId: string, idx: number) => void,
   *   onAddElement:   (rungId: string) => void,
   *   onRemoveRung:   (rungId: string) => void,
   *   onAddRungAfter: (afterIndex: number) => void,
   * }} callbacks
   */
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
          <p>Programa vacío.</p>
          <button class="btn btn-play btn-add-first-rung">+ Agregar primer Rung</button>
        </div>`;
      this.container.querySelector('.btn-add-first-rung')
        ?.addEventListener('click', () => this.cb.onAddRungAfter?.(-1));
      return;
    }

    this.container.innerHTML =
      rungs.map((rung, i) => this._rungHTML(rung, i, vars)).join('') +
      `<div class="rung-footer">
         <button class="btn btn-add-rung" data-after="${rungs.length - 1}">+ Agregar Rung</button>
       </div>`;

    this._attach();
  }

  /* ── Actualización parcial (durante scan, sin reconstruir el DOM) ── */

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
        const lbl = dom.querySelector('.elem-label');
        if (lbl) lbl.classList.toggle('label-on', on);
      }
    }
  }

  /* ── Generación HTML ────────────────────────────────────────────── */

  _rungHTML(rung, idx, vars) {
    const elems = rung.elements;

    const elemsHTML = elems.length === 0
      ? `<div class="rung-wire-fill"></div>`
      : elems.map((el, i) => {
          const on = vars ? vars.getBool(el.addrType, el.address) : false;
          return `
            <div class="ladder-elem${on ? ' energized' : ''}"
                 data-rung="${rung.id}" data-idx="${i}"
                 title="Click para editar · ${el.type} ${el.label}">
              <svg viewBox="0 0 80 60" width="80" height="60">
                ${svgSymbol(el.type, on)}
              </svg>
              <div class="elem-label${on ? ' label-on' : ''}">${el.label}</div>
            </div>`;
        }).join('');

    return `
      <div class="rung-row" data-id="${rung.id}">
        <div class="rung-num">${idx}</div>
        <div class="power-rail"></div>
        ${elemsHTML}
        <button class="btn-inline btn-add-elem" data-rung="${rung.id}" title="Agregar elemento (seleccioná un componente primero)">+</button>
        <div class="rung-wire-short"></div>
        <div class="power-rail"></div>
        <button class="btn-inline btn-del-rung" data-rung="${rung.id}" title="Eliminar rung">×</button>
      </div>`;
  }

  /* ── Event listeners ────────────────────────────────────────────── */

  _attach() {
    // Click en elemento → editar variable
    this.container.querySelectorAll('.ladder-elem').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        this.cb.onElementClick?.(el.dataset.rung, parseInt(el.dataset.idx, 10));
      });
    });

    // Botón + en rung
    this.container.querySelectorAll('.btn-add-elem').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.cb.onAddElement?.(btn.dataset.rung);
      });
    });

    // Botón × eliminar rung
    this.container.querySelectorAll('.btn-del-rung').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('¿Eliminar este rung?')) {
          this.cb.onRemoveRung?.(btn.dataset.rung);
        }
      });
    });

    // Botón + Agregar Rung (footer)
    this.container.querySelectorAll('.btn-add-rung').forEach(btn => {
      btn.addEventListener('click', () => {
        this.cb.onAddRungAfter?.(parseInt(btn.dataset.after ?? '-1', 10));
      });
    });
  }
}
