/**
 * palette.js — Paleta lateral de componentes.
 * El usuario selecciona un tipo aquí; luego hace click en "+" de un rung.
 */

export const PALETTE_ITEMS = [
  { type: 'XIC', label: 'Contacto NA',  symbol: '—[ ]—',  group: 'Contactos' },
  { type: 'XIO', label: 'Contacto NC',  symbol: '—[/]—',  group: 'Contactos' },
  { type: 'OTE', label: 'Bobina',       symbol: '—( )—',  group: 'Bobinas'   },
  { type: 'OTL', label: 'Set (S)',      symbol: '—(S)—',  group: 'Bobinas'   },
  { type: 'OTU', label: 'Reset (R)',    symbol: '—(R)—',  group: 'Bobinas'   },
];

export class Palette {
  /** @param {HTMLElement} container */
  constructor(container) {
    this.container = container;
    this.selected  = null;
    this._onChange = null;
  }

  render() {
    const groups = {};
    for (const item of PALETTE_ITEMS) {
      (groups[item.group] ??= []).push(item);
    }

    this.container.innerHTML = Object.entries(groups).map(([grp, items]) => `
      <div class="palette-group">
        <div class="palette-group-title">${grp}</div>
        ${items.map(it => `
          <button class="palette-item" data-type="${it.type}"
                  title="${it.label}">
            <span class="palette-symbol">${it.symbol}</span>
            <span class="palette-name">${it.label}</span>
          </button>`).join('')}
      </div>`).join('');

    this.container.querySelectorAll('.palette-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.palette-item').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selected = btn.dataset.type;
        this._onChange?.(this.selected);
      });
    });
  }

  onSelect(fn) { this._onChange = fn; }

  /** Devuelve el tipo seleccionado o null */
  getSelected() { return this.selected; }
}
