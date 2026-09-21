/**
 * palette2.js — Paleta de componentes para el esquemático libre
 */

import { getAllComponents } from './symbols.js';

export class Palette2 {
  constructor(container) {
    this.container = container;
    this.selected  = null;
    this._onChange = null;
  }

  render() {
    const all    = getAllComponents();
    const groups = {};
    for (const item of all) {
      (groups[item.group] ??= []).push({ ...item });
    }

    this.container.innerHTML = Object.entries(groups).map(([grp, items]) => `
      <div class="palette-group">
        <div class="palette-group-title">${grp}</div>
        ${items.map(it => `
          <button class="palette-item" data-type="${findKey(it)}"
                  title="${it.label}">
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
  getSelected() { return this.selected; }
}

import { COMPONENTS } from './symbols.js';
function findKey(item) {
  for (const [k, v] of Object.entries(COMPONENTS)) {
    if (v === item || (v.label === item.label && v.group === item.group)) return k;
  }
  return '';
}
