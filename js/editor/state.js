/**
 * state.js — Estado del programa (lista de rungs)
 * Fuente única de verdad del editor.
 */

export class ProgramState {
  constructor() {
    this.rungs = [];
    this._nextId = 0;
    this._listeners = [];
  }

  /* ── Rungs ────────────────────────────────────────────────────────── */

  /** Agrega un rung al final, o después del índice indicado */
  addRung(afterIndex = -1) {
    const rung = { id: `rung-${this._nextId++}`, comment: '', elements: [] };
    if (afterIndex < 0 || afterIndex >= this.rungs.length) {
      this.rungs.push(rung);
    } else {
      this.rungs.splice(afterIndex + 1, 0, rung);
    }
    this._emit();
    return rung;
  }

  removeRung(rungId) {
    const idx = this.rungs.findIndex(r => r.id === rungId);
    if (idx === -1) return;
    this.rungs.splice(idx, 1);
    this._emit();
  }

  /* ── Elementos ────────────────────────────────────────────────────── */

  /**
   * Agrega un elemento al final del rung.
   * @returns {{ rungId, elemIndex, el }} para abrir el modal inmediatamente
   */
  addElement(rungId, type) {
    const rung = this.rungs.find(r => r.id === rungId);
    if (!rung) return null;
    const el = this._defaultElement(type);
    rung.elements.push(el);
    const elemIndex = rung.elements.length - 1;
    this._emit();
    return { rungId, elemIndex, el };
  }

  updateElement(rungId, elemIndex, patch) {
    const rung = this.rungs.find(r => r.id === rungId);
    if (!rung || !rung.elements[elemIndex]) return;
    Object.assign(rung.elements[elemIndex], patch);
    // Reconstruir label
    const el = rung.elements[elemIndex];
    el.label = `${el.addrType}.${el.address}`;
    this._emit();
  }

  removeElement(rungId, elemIndex) {
    const rung = this.rungs.find(r => r.id === rungId);
    if (!rung) return;
    rung.elements.splice(elemIndex, 1);
    this._emit();
  }

  /* ── Serialización ────────────────────────────────────────────────── */

  /** Deep clone para el motor (sin referencias al estado del editor) */
  toRungs() {
    return JSON.parse(JSON.stringify(this.rungs));
  }

  /** Carga desde JSON (import de archivo) */
  fromJSON(rungs) {
    this.rungs = JSON.parse(JSON.stringify(rungs));
    this._nextId = this.rungs.length + 1;
    this._emit();
  }

  /* ── Eventos ──────────────────────────────────────────────────────── */

  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  _emit() {
    for (const fn of this._listeners) {
      try { fn(this.rungs); } catch (_) {}
    }
  }

  /* ── Helpers ──────────────────────────────────────────────────────── */

  _defaultElement(type) {
    const isCoil = ['OTE', 'OTL', 'OTU'].includes(type);
    const addrType = isCoil ? 'Q' : 'I';
    const address  = '0';
    return { type, addrType, address, label: `${addrType}.${address}` };
  }
}
