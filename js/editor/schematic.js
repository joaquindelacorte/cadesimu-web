/**
 * schematic.js — Estado del esquemático (componentes + cables)
 *
 * Componentes: posicionados en XY absoluto en el canvas
 * Cables: { id, points:[{x,y}], fromComp, fromTerminal, toComp, toTerminal }
 */

import { getComponentDef } from './symbols.js';

let _id = 0;
const uid = () => `e${_id++}`;

export class SchematicState {
  constructor() {
    /** @type {Map<string, ComponentInstance>} */
    this.components = new Map();
    /** @type {Map<string, WireInstance>} */
    this.wires = new Map();
    /** Metadatos del cajetín */
    this.meta = {
      title: 'Sin título', student: '', institution: 'Universidad', date: '',
      drawingNo: '001',
    };
    this._listeners = [];
  }

  /* ── Componentes ─────────────────────────────────────────────── */

  /**
   * @param {string} type
   * @param {{x, y, label?}} opts
   */
  addComponent(type, { x = 100, y = 100, label } = {}) {
    const def = getComponentDef(type);
    if (!def) throw new Error(`Tipo desconocido: ${type}`);

    const id = uid();
    const inst = {
      id,
      type,
      x, y,
      label: label ?? `${def.defaultLabel}${this._countType(type) + 1}`,
      /** coilRef: nombre del coil que maneja sus contactos (para CONTACT_NO/NC) */
      coilRef: null,
      /** preset: para timers (ms) */
      preset: def.initialState?.preset ?? null,
      /** state: runtime state (energized, accumulated, pressed...) */
      state: { ...def.initialState },
    };
    this.components.set(id, inst);
    this._emit();
    return inst;
  }

  updateComponent(id, patch) {
    const c = this.components.get(id);
    if (!c) return;
    Object.assign(c, patch);
    this._emit();
  }

  removeComponent(id) {
    this.components.delete(id);
    // Eliminar cables conectados
    for (const [wid, w] of this.wires) {
      if (w.fromComp === id || w.toComp === id) this.wires.delete(wid);
    }
    this._emit();
  }

  moveComponent(id, x, y) {
    const c = this.components.get(id);
    if (!c) return;
    c.x = x; c.y = y;
    // Reroute attached wires
    this._rerouteWires(id);
    this._emit();
  }

  /* ── Cables ──────────────────────────────────────────────────── */

  /**
   * Agrega un cable entre dos terminales.
   * points se calculan automáticamente (ruteo ortogonal).
   */
  addWire(fromComp, fromTerminal, toComp, toTerminal) {
    const id = uid();
    const points = this._routeWire(fromComp, fromTerminal, toComp, toTerminal);
    this.wires.set(id, { id, fromComp, fromTerminal, toComp, toTerminal, points, energized: false });
    this._emit();
    return id;
  }

  /** Agrega un cable libre (sin terminales vinculadas) con puntos definidos */
  addFreeWire(points) {
    const id = uid();
    this.wires.set(id, { id, fromComp: null, fromTerminal: null, toComp: null, toTerminal: null, points: [...points], energized: false });
    this._emit();
    return id;
  }

  removeWire(id) {
    this.wires.delete(id);
    this._emit();
  }

  /* ── Posición absoluta de un terminal ────────────────────────── */

  terminalPos(compId, termId) {
    const c = this.components.get(compId);
    if (!c) return null;
    const def = getComponentDef(c.type);
    const t = def.terminals.find(t => t.id === termId);
    if (!t) return null;
    return { x: c.x + t.x, y: c.y + t.y };
  }

  /* ── Serialización ───────────────────────────────────────────── */

  toJSON() {
    return {
      version: '1',
      meta: { ...this.meta },
      components: [...this.components.values()].map(c => ({
        id: c.id, type: c.type, x: c.x, y: c.y,
        label: c.label, coilRef: c.coilRef, preset: c.preset,
      })),
      wires: [...this.wires.values()].map(w => ({
        id: w.id, fromComp: w.fromComp, fromTerminal: w.fromTerminal,
        toComp: w.toComp, toTerminal: w.toTerminal, points: w.points,
      })),
    };
  }

  fromJSON(data) {
    this.components.clear();
    this.wires.clear();
    this.meta = { ...this.meta, ...data.meta };
    for (const c of data.components ?? []) {
      const def = getComponentDef(c.type);
      if (!def) continue;
      this.components.set(c.id, {
        ...c,
        state: { ...def.initialState },
      });
      _id = Math.max(_id, parseInt(c.id.replace('e', '')) + 1);
    }
    for (const w of data.wires ?? []) {
      this.wires.set(w.id, { ...w, energized: false });
      _id = Math.max(_id, parseInt(w.id.replace('e', '')) + 1);
    }
    this._emit();
  }

  /* ── Helpers ─────────────────────────────────────────────────── */

  _countType(type) {
    let n = 0;
    for (const c of this.components.values()) if (c.type === type) n++;
    return n;
  }

  _routeWire(fromComp, fromTerminal, toComp, toTerminal) {
    const a = this.terminalPos(fromComp, fromTerminal);
    const b = this.terminalPos(toComp, toTerminal);
    if (!a || !b) return [];
    return orthogonalRoute(a, b);
  }

  _rerouteWires(compId) {
    for (const w of this.wires.values()) {
      if (w.fromComp === compId || w.toComp === compId) {
        if (w.fromComp && w.toComp) {
          w.points = this._routeWire(w.fromComp, w.fromTerminal, w.toComp, w.toTerminal);
        }
      }
    }
  }

  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  _emit() {
    for (const fn of this._listeners) try { fn(); } catch (_) {}
  }
}

/**
 * Ruteo ortogonal (mid-point).
 * A → midX → midX,B.y → B
 */
export function orthogonalRoute(a, b) {
  if (Math.abs(a.y - b.y) < 2) return [a, b]; // misma horizontal
  const midX = (a.x + b.x) / 2;
  return [
    { x: a.x, y: a.y },
    { x: midX, y: a.y },
    { x: midX, y: b.y },
    { x: b.x, y: b.y },
  ];
}
