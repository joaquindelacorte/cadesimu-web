/**
 * props.js — Panel de propiedades del componente seleccionado
 */

import { getComponentDef } from './symbols.js';

export class PropsPanel {
  constructor(container, onUpdate) {
    this.container = container;
    this.onUpdate  = onUpdate;
    this._compId   = null;
  }

  show(comp) {
    if (!comp) { this.clear(); return; }
    this._compId = comp.id;
    const def = getComponentDef(comp.type);

    this.container.innerHTML = `
      <div class="props-title">${def?.label ?? comp.type}</div>

      <div class="form-row">
        <label>Etiqueta</label>
        <input id="prop-label" type="text" value="${comp.label}">
      </div>

      ${def?.conducts?.startsWith('coilRef') || def?.conducts?.startsWith('timer') ? `
      <div class="form-row">
        <label>Referencia bobina</label>
        <input id="prop-coilref" type="text" value="${comp.coilRef ?? ''}"
               placeholder="Ej: KM1">
      </div>` : ''}

      ${comp.type === 'TIMER_COIL' ? `
      <div class="form-row">
        <label>Preset (ms)</label>
        <input id="prop-preset" type="number" min="100" step="100" value="${comp.preset ?? 5000}">
      </div>` : ''}

      <div class="props-actions">
        <button class="btn btn-play" id="prop-save">Guardar</button>
        <button class="btn btn-stop" id="prop-delete">Eliminar</button>
      </div>`;

    this.container.querySelector('#prop-save')?.addEventListener('click', () => {
      const label   = this.container.querySelector('#prop-label')?.value.trim();
      const coilRef = this.container.querySelector('#prop-coilref')?.value.trim() || null;
      const preset  = parseInt(this.container.querySelector('#prop-preset')?.value ?? '5000');
      this.onUpdate(this._compId, { label, coilRef, preset: isNaN(preset) ? null : preset });
    });

    this.container.querySelector('#prop-delete')?.addEventListener('click', () => {
      this.onUpdate(this._compId, null); // null = eliminar
      this.clear();
    });
  }

  clear() {
    this.container.innerHTML = `<div class="props-empty">Seleccioná un componente para editar sus propiedades.</div>`;
    this._compId = null;
  }
}
