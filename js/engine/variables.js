/**
 * variables.js — Tabla de variables del PLC simulado
 *
 * Tipos:
 *   I  — Entradas digitales (bool)
 *   Q  — Salidas digitales (bool)
 *   M  — Marcas/memorias internas (bool)
 *   T  — Temporizadores { preset, accumulated, done }
 *   C  — Contadores     { preset, accumulated, done }
 */

export class VariableTable {
  constructor() {
    this._vars = {
      I: {},
      Q: {},
      M: {},
      T: {},
      C: {},
    };
    /** listeners para reactividad (UI) */
    this._listeners = [];
  }

  /**
   * Lee una variable.
   * @param {'I'|'Q'|'M'|'T'|'C'} type
   * @param {string|number} address  — ej: '0', '1', 'MI_MARCA'
   * @returns {boolean|{preset,accumulated,done}|undefined}
   */
  get(type, address) {
    return this._vars[type]?.[address];
  }

  /**
   * Escribe una variable.
   * Para T/C, mergea el objeto parcial (no reemplaza entero).
   */
  set(type, address, value) {
    if (!this._vars[type]) throw new Error(`Tipo desconocido: ${type}`);

    if (type === 'T' || type === 'C') {
      const current = this._vars[type][address] ?? { preset: 0, accumulated: 0, done: false };
      this._vars[type][address] = { ...current, ...value };
    } else {
      this._vars[type][address] = Boolean(value);
    }

    this._notify(type, address, this._vars[type][address]);
  }

  /**
   * Lee una variable booleana de forma segura.
   * Para T/C devuelve el bit .done.
   */
  getBool(type, address) {
    const v = this.get(type, address);
    if (v === undefined) return false;
    if (type === 'T' || type === 'C') return Boolean(v.done);
    return Boolean(v);
  }

  /** Inicializa una entrada (sólo para uso del simulador/tests) */
  defineInput(address, initialValue = false) {
    this._vars.I[address] = Boolean(initialValue);
  }

  /** Inicializa una salida */
  defineOutput(address, initialValue = false) {
    this._vars.Q[address] = Boolean(initialValue);
  }

  /** Inicializa una marca */
  defineMark(address, initialValue = false) {
    this._vars.M[address] = Boolean(initialValue);
  }

  /** Inicializa un timer */
  defineTimer(address, preset = 1000) {
    this._vars.T[address] = { preset, accumulated: 0, done: false };
  }

  /** Inicializa un counter */
  defineCounter(address, preset = 0) {
    this._vars.C[address] = { preset, accumulated: 0, done: false };
  }

  /** Resetea todo a cero/false */
  reset() {
    for (const type of Object.keys(this._vars)) {
      for (const addr of Object.keys(this._vars[type])) {
        if (type === 'T' || type === 'C') {
          this._vars[type][addr] = {
            ...this._vars[type][addr],
            accumulated: 0,
            done: false,
          };
        } else {
          this._vars[type][addr] = false;
        }
      }
    }
    this._notify('*', '*', null);
  }

  /**
   * Devuelve snapshot plano para UI / export.
   * Formato: [{ type, address, value }]
   */
  snapshot() {
    const rows = [];
    for (const [type, group] of Object.entries(this._vars)) {
      for (const [address, value] of Object.entries(group)) {
        rows.push({ type, address, value });
      }
    }
    return rows;
  }

  /** Serializa a JSON (para export .cadesimu.json) */
  toJSON() {
    return JSON.parse(JSON.stringify(this._vars));
  }

  /** Carga desde JSON (para import .cadesimu.json) */
  fromJSON(data) {
    for (const type of Object.keys(this._vars)) {
      if (data[type]) {
        this._vars[type] = { ...data[type] };
      }
    }
    this._notify('*', '*', null);
  }

  /** Suscribe un listener de cambios: fn(type, address, value) */
  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  _notify(type, address, value) {
    for (const fn of this._listeners) {
      try { fn(type, address, value); } catch (_) { /* no romper el scan */ }
    }
  }
}
