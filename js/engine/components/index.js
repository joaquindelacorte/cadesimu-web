/**
 * components/index.js — Instrucciones Ladder del MVP
 *
 * Cada instrucción es una función pura:
 *   fn(vars, rung) → boolean (continuidad de potencia que sale)
 *
 * Convención de rung element:
 *   { type: 'XIC'|'XIO'|'OTE'|..., address: 'I.0', ... }
 */

import { VariableTable } from '../variables.js';

/**
 * XIC — Examine If Closed (Contacto Normalmente Abierto)
 * Pasa potencia si la variable está en TRUE.
 */
export function XIC(vars, element, powerIn) {
  if (!powerIn) return false;
  return vars.getBool(element.addrType, element.address);
}

/**
 * XIO — Examine If Open (Contacto Normalmente Cerrado)
 * Pasa potencia si la variable está en FALSE.
 */
export function XIO(vars, element, powerIn) {
  if (!powerIn) return false;
  return !vars.getBool(element.addrType, element.address);
}

/**
 * OTE — Output Energize (Bobina normal)
 * Activa la salida según el estado de potencia entrante.
 */
export function OTE(vars, element, powerIn) {
  vars.set(element.addrType, element.address, powerIn);
  return powerIn;
}

/**
 * OTL — Output Latch (Set/Retención)
 * Sólo activa; nunca desactiva.
 */
export function OTL(vars, element, powerIn) {
  if (powerIn) vars.set(element.addrType, element.address, true);
  return powerIn;
}

/**
 * OTU — Output Unlatch (Reset)
 * Sólo desactiva; nunca activa.
 */
export function OTU(vars, element, powerIn) {
  if (powerIn) vars.set(element.addrType, element.address, false);
  return powerIn;
}

/**
 * TON — Timer On Delay
 * element extra: { preset: ms }
 * Cuando powerIn=true acumula tiempo; cuando powerIn=false resetea.
 * Requiere pasar `deltaMs` en rung.__deltaMs (lo inyecta el scan loop).
 */
export function TON(vars, element, powerIn, deltaMs = 0) {
  const addr = element.address;
  const preset = element.preset ?? vars.get('T', addr)?.preset ?? 1000;

  if (!vars.get('T', addr)) vars.defineTimer(addr, preset);

  const t = vars.get('T', addr);

  if (powerIn) {
    const acc = Math.min(t.accumulated + deltaMs, preset);
    const done = acc >= preset;
    vars.set('T', addr, { preset, accumulated: acc, done });
  } else {
    vars.set('T', addr, { preset, accumulated: 0, done: false });
  }

  return vars.get('T', addr).done;
}

/**
 * CTU — Counter Up
 * Incrementa en el flanco ascendente de powerIn.
 * Requiere que element tenga un campo `_lastPower` para detectar flanco.
 */
export function CTU(vars, element, powerIn) {
  const addr = element.address;
  const preset = element.preset ?? vars.get('C', addr)?.preset ?? 0;

  if (!vars.get('C', addr)) vars.defineCounter(addr, preset);

  const c = vars.get('C', addr);
  const risingEdge = powerIn && !element._lastPower;

  if (risingEdge) {
    const acc = c.accumulated + 1;
    const done = acc >= preset;
    vars.set('C', addr, { preset, accumulated: acc, done });
  }

  element._lastPower = powerIn;
  return vars.get('C', addr).done;
}

/**
 * RES — Reset (para Timers y Counters)
 * Cuando powerIn=true pone accumulated=0 y done=false.
 */
export function RES(vars, element, powerIn) {
  if (!powerIn) return false;
  const type = element.addrType; // 'T' o 'C'
  const current = vars.get(type, element.address);
  if (current) {
    vars.set(type, element.address, { accumulated: 0, done: false });
  }
  return true;
}

/** Mapa de instrucciones disponibles */
export const INSTRUCTIONS = { XIC, XIO, OTE, OTL, OTU, TON, CTU, RES };
