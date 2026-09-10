/**
 * scan.js — Motor de Scan Cycle del simulador CADESIMU Web
 *
 * Fases de cada scan (igual que un PLC real):
 *   1. Leer entradas (en este simulador las entradas ya están en vars.I)
 *   2. Ejecutar programa (evaluar cada rung de arriba a abajo)
 *   3. Escribir salidas (en este simulador ya se escriben en vars.Q durante paso 2)
 *   4. Actualizar UI (emitir evento)
 *
 * Formato de un programa (array de rungs):
 * [
 *   {
 *     id: 'rung-0',
 *     comment: 'Arranque motor',
 *     elements: [
 *       { type: 'XIC', addrType: 'I', address: '0' },
 *       { type: 'OTE', addrType: 'Q', address: '0' }
 *     ]
 *   }
 * ]
 *
 * Dentro de cada rung, los elementos se evalúan en serie (AND implícito).
 * Para ramas en paralelo (OR), usar:
 *   { type: 'BRANCH', branches: [ [elem, ...], [elem, ...] ] }
 */

import { INSTRUCTIONS } from './components/index.js';

export class ScanEngine {
  /**
   * @param {import('./variables.js').VariableTable} vars
   */
  constructor(vars) {
    this.vars = vars;
    this.program = [];    // array de rungs
    this.running = false;
    this.scanCount = 0;
    this.scanTimeMs = 0;

    this._lastTimestamp = null;
    this._rafId = null;
    this._listeners = [];
  }

  /** Carga el programa en el motor */
  loadProgram(rungs) {
    this.program = rungs;
    this.scanCount = 0;
  }

  /** Arranca el scan loop (requestAnimationFrame) */
  start() {
    if (this.running) return;
    this.running = true;
    this._lastTimestamp = performance.now();
    this._loop(this._lastTimestamp);
  }

  /** Pausa sin resetear estado */
  pause() {
    this.running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** Detiene y resetea variables al estado inicial */
  stop() {
    this.pause();
    this.vars.reset();
    this.scanCount = 0;
    this._emit('stop');
  }

  /** Ejecuta exactamente un scan y emite evento */
  step() {
    const now = performance.now();
    const delta = this._lastTimestamp ? now - this._lastTimestamp : 0;
    this._lastTimestamp = now;
    this._executeScan(delta);
  }

  /** Loop principal via rAF */
  _loop(timestamp) {
    if (!this.running) return;

    const deltaMs = this._lastTimestamp !== null
      ? timestamp - this._lastTimestamp
      : 0;
    this._lastTimestamp = timestamp;

    const t0 = performance.now();
    this._executeScan(deltaMs);
    this.scanTimeMs = performance.now() - t0;

    this._rafId = requestAnimationFrame(ts => this._loop(ts));
  }

  /** Ejecuta un ciclo de scan completo */
  _executeScan(deltaMs) {
    for (const rung of this.program) {
      this._evalRung(rung, deltaMs);
    }
    this.scanCount++;
    this._emit('scan', { scanCount: this.scanCount, scanTimeMs: this.scanTimeMs });
  }

  /**
   * Evalúa un rung.
   * Devuelve el estado final de continuidad (true/false).
   */
  _evalRung(rung, deltaMs) {
    let power = true; // la barra de alimentación siempre alimenta
    for (const el of rung.elements) {
      power = this._evalElement(el, power, deltaMs);
    }
    return power;
  }

  /** Evalúa un elemento individual */
  _evalElement(el, powerIn, deltaMs) {
    if (el.type === 'BRANCH') {
      // OR: al menos una rama tiene continuidad
      return el.branches.some(branch => {
        let p = powerIn;
        for (const e of branch) {
          p = this._evalElement(e, p, deltaMs);
        }
        return p;
      });
    }

    const fn = INSTRUCTIONS[el.type];
    if (!fn) {
      console.warn(`[CADESIMU] Instrucción desconocida: ${el.type}`);
      return false;
    }

    // TON recibe deltaMs como cuarto argumento
    if (el.type === 'TON') {
      return fn(this.vars, el, powerIn, deltaMs);
    }
    return fn(this.vars, el, powerIn);
  }

  /** Suscribe un listener de eventos del motor */
  on(event, fn) {
    this._listeners.push({ event, fn });
    return () => {
      this._listeners = this._listeners.filter(l => l.fn !== fn);
    };
  }

  _emit(event, data = {}) {
    for (const l of this._listeners) {
      if (l.event === event || l.event === '*') {
        try { l.fn(data); } catch (_) { /* no romper el scan */ }
      }
    }
  }
}
