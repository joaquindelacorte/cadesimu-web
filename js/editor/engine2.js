/**
 * engine2.js — Motor de simulación para el esquemático libre
 *
 * Diferencias con scan.js (Ladder rígido):
 *  - Opera sobre SchematicState (componentes + cables), no sobre rungs.
 *  - Propaga "tensión" a través del grafo de cables.
 *  - Resuelve bobinas → cierra/abre contactos → re-propaga.
 *  - Los timers acumulan mientras reciben tensión.
 */

const SCAN_INTERVAL_MS = 100;

export class SchematicEngine {
  /**
   * @param {import('./schematic.js').SchematicState} schematic
   */
  constructor(schematic) {
    this.schematic = schematic;
    this.running   = false;
    this.scanCount = 0;
    this._timerId  = null;
    this._listeners = [];
    this._lastTs   = 0;

    /** id → bool: estado energizado de cada componente (runtime) */
    this._energized = new Map();
    /** label → bool: estado de cada bobina (para resolver contactos) */
    this._coils = new Map();
    /** id → accumulated ms de timers */
    this._timerAcc = new Map();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastTs = performance.now();
    this._timerId = setInterval(() => {
      const now = performance.now();
      const delta = now - this._lastTs;
      this._lastTs = now;
      this._executeScan(delta);
    }, SCAN_INTERVAL_MS);
  }

  pause() {
    this.running = false;
    clearInterval(this._timerId);
    this._timerId = null;
  }

  stop() {
    this.pause();
    this._reset();
    this.scanCount = 0;
    this._emit('stop');
  }

  step() {
    const now = performance.now();
    const delta = this._lastTs ? now - this._lastTs : SCAN_INTERVAL_MS;
    this._lastTs = now;
    this._executeScan(delta);
  }

  /* ── Scan cycle ──────────────────────────────────────────────── */

  _executeScan(deltaMs) {
    const S = this.schematic;

    /* 1. Identificar nodos de alimentación (power rails virtuales)
          Los cables libres que empiezan en x < 80 y no tienen fromComp
          se asumen conectados al bus L1 → potencial = true           */
    const poweredNodes = this._findPoweredNodes();

    /* 2. Propagar tensión por cables hasta llegar a bobinas/cargas */
    this._propagate(poweredNodes, deltaMs);

    /* 3. Actualizar estados en el SchematicState para que el renderer
          lo vea directamente                                          */
    for (const [id, comp] of S.components) {
      comp.state.energized = this._energized.get(id) ?? false;
      if (comp.type === 'TIMER_COIL' || comp.type === 'TIMER_CONTACT_NO' || comp.type === 'TIMER_CONTACT_NC') {
        comp.state.accumulated = this._timerAcc.get(id) ?? 0;
      }
    }
    for (const [id, wire] of S.wires) {
      wire.energized = this._wireEnergized.has(id);
    }

    this.scanCount++;
    this._emit('scan', { scanCount: this.scanCount, deltaMs });
  }

  /* ── Grafo de propagación ────────────────────────────────────── */

  /**
   * Nodos "alimentados" = cualquier terminal conectado a un bus vertical
   * (x <= 80 en el canvas o que tenga type='power-bus').
   * En el esquema libre, el usuario tracerá cables desde X=40 (bus L/N).
   * Simplificación: un wire que no tiene fromComp pero sí tiene points[0].x <= 60
   * se considera conectado al bus de fase.
   */
  _findPoweredNodes() {
    const powered = new Set(); // claves: "compId:termId"
    for (const wire of this.schematic.wires.values()) {
      if (!wire.fromComp && wire.points.length > 0 && wire.points[0].x <= 80) {
        if (wire.toComp) powered.add(`${wire.toComp}:${wire.toTerminal}`);
      }
      // También: bus de mando (x en torno a la columna L/N configurada)
      // Por ahora: si hay un cable virtual desde x=0
    }
    return powered;
  }

  _propagate(poweredNodes, deltaMs) {
    this._energized.clear();
    this._wireEnergized = new Set();

    const S = this.schematic;

    // BFS: empezar desde todos los terminales alimentados
    const queue = [...poweredNodes]; // "compId:termId"

    const visited = new Set();

    while (queue.length) {
      const key = queue.shift();
      if (visited.has(key)) continue;
      visited.add(key);

      const [compId, termId] = key.split(':');
      const comp = S.components.get(compId);
      if (!comp) continue;

      // ¿El componente conduce desde este terminal?
      const otherTerms = this._conductingOutputs(comp, termId, deltaMs);

      for (const outTermId of otherTerms) {
        this._energized.set(compId, true);

        // Propagar a través de cables conectados al output
        for (const wire of S.wires.values()) {
          let nextKey = null;
          if (wire.fromComp === compId && wire.fromTerminal === outTermId && wire.toComp) {
            nextKey = `${wire.toComp}:${wire.toTerminal}`;
          } else if (wire.toComp === compId && wire.toTerminal === outTermId && wire.fromComp) {
            nextKey = `${wire.fromComp}:${wire.fromTerminal}`;
          }
          if (nextKey && !visited.has(nextKey)) {
            this._wireEnergized.add(wire.id);
            queue.push(nextKey);
          }
        }
      }
    }

    // Resolución de timers: acumular si bobina del timer está energizada
    for (const [id, comp] of S.components) {
      if (comp.type === 'TIMER_COIL') {
        const en = this._energized.get(id) ?? false;
        if (en) {
          const acc = (this._timerAcc.get(id) ?? 0) + deltaMs;
          this._timerAcc.set(id, Math.min(acc, comp.preset ?? 5000));
        } else {
          this._timerAcc.set(id, 0);
        }
      }
    }
  }

  /**
   * Dado un componente y el terminal de entrada, devuelve los terminales
   * de salida si el componente conduce.
   */
  _conductingOutputs(comp, inTermId, deltaMs) {
    const def_conducts = this._getConduces(comp);

    switch (def_conducts) {
      case 'coilRef-NO': {
        // Cierra si su coilRef está energizado
        const coilOn = this._isCoilOn(comp.coilRef ?? comp.label);
        return coilOn ? ['out'] : [];
      }
      case 'coilRef-NC': {
        const coilOn = this._isCoilOn(comp.coilRef ?? comp.label);
        return !coilOn ? ['out'] : [];
      }
      case 'user-NO': {
        return comp.state.pressed ? ['out'] : [];
      }
      case 'user-NC': {
        return !comp.state.pressed ? ['out'] : [];
      }
      case 'timer-NO': {
        const label = comp.coilRef ?? comp.label;
        const timerDone = this._isTimerDone(label);
        return timerDone ? ['out'] : [];
      }
      case 'timer-NC': {
        const label = comp.coilRef ?? comp.label;
        const timerDone = this._isTimerDone(label);
        return !timerDone ? ['out'] : [];
      }
      case 'load':
      case 'load-set':
      case 'load-reset':
      case 'load-timer': {
        // La carga absorbe la tensión; actualiza el coil
        if (inTermId === 'A1') {
          this._energized.set(comp.id, true);
          this._coils.set(comp.label, true);
        }
        return [];
      }
      default:
        return ['out'];
    }
  }

  _getConduces(comp) {
    const { getComponentDef } = schematicSymbols;
    // Import dinámico no disponible aquí; usamos tabla local
    return CONDUCTS_MAP[comp.type] ?? 'passthrough';
  }

  _isCoilOn(label) {
    for (const [id, comp] of this.schematic.components) {
      if ((comp.type === 'COIL' || comp.type === 'RELAY_COIL' || comp.type === 'COIL_SET' || comp.type === 'COIL_RESET' || comp.type === 'TIMER_COIL') &&
          comp.label === label) {
        return this._energized.get(id) ?? false;
      }
    }
    return false;
  }

  _isTimerDone(label) {
    for (const [id, comp] of this.schematic.components) {
      if (comp.type === 'TIMER_COIL' && comp.label === label) {
        const acc = this._timerAcc.get(id) ?? 0;
        return acc >= (comp.preset ?? 5000);
      }
    }
    return false;
  }

  _reset() {
    this._energized.clear();
    this._coils.clear();
    this._timerAcc.clear();
    this._wireEnergized = new Set();
    for (const comp of this.schematic.components.values()) {
      const def = getCompDef(comp.type);
      if (def) comp.state = { ...def.initialState };
    }
    for (const wire of this.schematic.wires.values()) wire.energized = false;
  }

  on(event, fn) {
    this._listeners.push({ event, fn });
    return () => { this._listeners = this._listeners.filter(l => l.fn !== fn); };
  }
  _emit(event, data = {}) {
    for (const l of this._listeners) {
      if (l.event === event || l.event === '*') try { l.fn(data); } catch (_) {}
    }
  }
}

/* ── Mapa conducts (copia ligera para evitar import circular) ─── */
const CONDUCTS_MAP = {
  CONTACT_NO:       'coilRef-NO',
  CONTACT_NC:       'coilRef-NC',
  PB_NO:            'user-NO',
  PB_NC:            'user-NC',
  COIL:             'load',
  COIL_SET:         'load-set',
  COIL_RESET:       'load-reset',
  TIMER_COIL:       'load-timer',
  TIMER_CONTACT_NO: 'timer-NO',
  TIMER_CONTACT_NC: 'timer-NC',
  LAMP_R:           'load',
  LAMP_G:           'load',
  LAMP_Y:           'load',
  THERMAL_CONTACT:  'coilRef-NC',
  RELAY_COIL:       'load',
};

// Re-import para _reset()
import { getComponentDef as getCompDef } from './symbols.js';
const schematicSymbols = { getComponentDef: getCompDef };
