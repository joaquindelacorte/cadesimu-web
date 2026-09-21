/**
 * symbols.js — Biblioteca de símbolos IEC 60617
 *
 * Cada componente expone:
 *   type, label, group, defaultLabel
 *   width, height (viewBox del SVG)
 *   terminals: [{ id, x, y, label }] — posiciones relativas al origen
 *   svg(state) → string SVG interno
 *   conducts: 'coilRef-NO'|'coilRef-NC'|'user-NO'|'user-NC'|'timer-NO'|'load'|'load-timer'
 *   initialState: object
 */

const C_OFF = '#1a1a1a';
const C_ON  = '#cc1111';

function st(on) {
  return `stroke="${on ? C_ON : C_OFF}" stroke-width="${on ? 2.5 : 2}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
}
function fi(on) { return `fill="${on ? C_ON : C_OFF}" stroke="none"`; }
function tl(x, y, txt, on) {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="monospace" font-size="8" fill="${on ? C_ON : '#777'}" stroke="none">${txt}</text>`;
}

const DEFS = {

  /* ══════════════ CONTACTOS ══════════════════════════════════════ */

  CONTACT_NO: {
    label: 'Contacto NA', group: 'Contactos', defaultLabel: 'KM1',
    width: 80, height: 60,
    terminals: [{ id: 'in', x: 0, y: 30, label: '13' }, { id: 'out', x: 80, y: 30, label: '14' }],
    conducts: 'coilRef-NO', initialState: { energized: false },
    svg({ energized: on }) { const w = st(on); return `
      <line x1="0" y1="30" x2="22" y2="30" ${w}/>
      <line x1="22" y1="14" x2="22" y2="46" ${w}/>
      <line x1="58" y1="14" x2="58" y2="46" ${w}/>
      <line x1="58" y1="30" x2="80" y2="30" ${w}/>
      ${tl(22, 12, '13', on)} ${tl(58, 12, '14', on)}`; }
  },

  CONTACT_NC: {
    label: 'Contacto NC', group: 'Contactos', defaultLabel: 'KM1',
    width: 80, height: 60,
    terminals: [{ id: 'in', x: 0, y: 30, label: '11' }, { id: 'out', x: 80, y: 30, label: '12' }],
    conducts: 'coilRef-NC', initialState: { energized: false },
    svg({ energized: on }) { const w = st(on); return `
      <line x1="0" y1="30" x2="22" y2="30" ${w}/>
      <line x1="22" y1="14" x2="22" y2="46" ${w}/>
      <line x1="58" y1="14" x2="58" y2="46" ${w}/>
      <line x1="22" y1="44" x2="58" y2="16" ${w}/>
      <line x1="58" y1="30" x2="80" y2="30" ${w}/>
      ${tl(22, 12, '11', on)} ${tl(58, 12, '12', on)}`; }
  },

  /* ══════════════ PULSADORES ═════════════════════════════════════ */

  PB_NO: {
    label: 'Pulsador NA', group: 'Pulsadores', defaultLabel: 'S1',
    width: 80, height: 60,
    terminals: [{ id: 'in', x: 0, y: 30, label: '13' }, { id: 'out', x: 80, y: 30, label: '14' }],
    conducts: 'user-NO', initialState: { pressed: false },
    svg({ pressed: on }) { const w = st(on); return `
      <line x1="0" y1="30" x2="22" y2="30" ${w}/>
      <line x1="22" y1="20" x2="22" y2="46" ${w}/>
      <line x1="58" y1="20" x2="58" y2="46" ${w}/>
      <line x1="58" y1="30" x2="80" y2="30" ${w}/>
      <line x1="28" y1="20" x2="52" y2="20" ${w}/>
      <line x1="40" y1="11" x2="40" y2="20" ${w}/>
      <line x1="34" y1="11" x2="46" y2="11" ${w}/>
      ${tl(22, 52, '13', on)} ${tl(58, 52, '14', on)}`; }
  },

  PB_NC: {
    label: 'Pulsador NC', group: 'Pulsadores', defaultLabel: 'S0',
    width: 80, height: 60,
    terminals: [{ id: 'in', x: 0, y: 30, label: '11' }, { id: 'out', x: 80, y: 30, label: '12' }],
    conducts: 'user-NC', initialState: { pressed: false },
    svg({ pressed: on }) { const conducting = !on; const w = st(conducting); return `
      <line x1="0" y1="30" x2="22" y2="30" ${w}/>
      <line x1="22" y1="20" x2="22" y2="46" ${w}/>
      <line x1="58" y1="20" x2="58" y2="46" ${w}/>
      <line x1="22" y1="44" x2="58" y2="22" ${w}/>
      <line x1="58" y1="30" x2="80" y2="30" ${w}/>
      <line x1="28" y1="20" x2="52" y2="20" ${w}/>
      <line x1="40" y1="11" x2="40" y2="20" ${w}/>
      <line x1="34" y1="11" x2="46" y2="11" ${w}/>
      ${tl(22, 52, '11', conducting)} ${tl(58, 52, '12', conducting)}`; }
  },

  /* ══════════════ BOBINAS ════════════════════════════════════════ */

  COIL: {
    label: 'Bobina', group: 'Bobinas', defaultLabel: 'KM1',
    width: 80, height: 60,
    terminals: [{ id: 'A1', x: 0, y: 30, label: 'A1' }, { id: 'A2', x: 80, y: 30, label: 'A2' }],
    conducts: 'load', initialState: { energized: false },
    svg({ energized: on }) { const w = st(on); return `
      <line x1="0" y1="30" x2="16" y2="30" ${w}/>
      <rect x="16" y="19" width="48" height="22" rx="2" ${w}/>
      <line x1="64" y1="30" x2="80" y2="30" ${w}/>
      ${tl(16, 52, 'A1', on)} ${tl(64, 52, 'A2', on)}`; }
  },

  COIL_SET: {
    label: 'Bobina Set', group: 'Bobinas', defaultLabel: 'KM1',
    width: 80, height: 60,
    terminals: [{ id: 'A1', x: 0, y: 30, label: 'A1' }, { id: 'A2', x: 80, y: 30, label: 'A2' }],
    conducts: 'load-set', initialState: { energized: false },
    svg({ energized: on }) { const w = st(on); return `
      <line x1="0" y1="30" x2="16" y2="30" ${w}/>
      <rect x="16" y="19" width="48" height="22" rx="2" ${w}/>
      <text x="40" y="35" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" ${fi(on)}>S</text>
      <line x1="64" y1="30" x2="80" y2="30" ${w}/>
      ${tl(16, 52, 'A1', on)} ${tl(64, 52, 'A2', on)}`; }
  },

  COIL_RESET: {
    label: 'Bobina Reset', group: 'Bobinas', defaultLabel: 'KM1',
    width: 80, height: 60,
    terminals: [{ id: 'A1', x: 0, y: 30, label: 'A1' }, { id: 'A2', x: 80, y: 30, label: 'A2' }],
    conducts: 'load-reset', initialState: { energized: false },
    svg({ energized: on }) { const w = st(on); return `
      <line x1="0" y1="30" x2="16" y2="30" ${w}/>
      <rect x="16" y="19" width="48" height="22" rx="2" ${w}/>
      <text x="40" y="35" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" ${fi(on)}>R</text>
      <line x1="64" y1="30" x2="80" y2="30" ${w}/>
      ${tl(16, 52, 'A1', on)} ${tl(64, 52, 'A2', on)}`; }
  },

  /* ══════════════ TEMPORIZADORES ═════════════════════════════════ */

  TIMER_COIL: {
    label: 'Timer Bobina TON', group: 'Temporizadores', defaultLabel: 'KT1',
    width: 80, height: 60,
    terminals: [{ id: 'A1', x: 0, y: 30, label: 'A1' }, { id: 'A2', x: 80, y: 30, label: 'A2' }],
    conducts: 'load-timer', initialState: { energized: false, accumulated: 0, preset: 5000 },
    svg({ energized: on, accumulated = 0, preset = 5000 }) {
      const w = st(on);
      const pct = Math.min(1, accumulated / preset);
      const angle = pct * 2 * Math.PI - Math.PI / 2;
      const px = (48 + 7 * Math.cos(angle)).toFixed(1);
      const py = (30 + 7 * Math.sin(angle)).toFixed(1);
      const large = pct > 0.5 ? 1 : 0;
      const arc = pct > 0 && pct < 1
        ? `<path d="M48,23 A7,7 0 ${large},1 ${px},${py}" stroke="${on ? C_ON : '#aaa'}" stroke-width="1.5" fill="none"/>`
        : pct >= 1 ? `<circle cx="48" cy="30" r="7" fill="${C_ON}" opacity="0.3" stroke="none"/>` : '';
      return `
        <line x1="0" y1="30" x2="16" y2="30" ${w}/>
        <rect x="16" y="19" width="48" height="22" rx="2" ${w}/>
        <text x="28" y="35" font-family="monospace" font-size="11" font-weight="bold" ${fi(on)}>T</text>
        <circle cx="48" cy="30" r="7" stroke="${on ? C_ON : '#ccc'}" stroke-width="1" fill="none"/>
        ${arc}
        <line x1="64" y1="30" x2="80" y2="30" ${w}/>
        ${tl(16, 52, 'A1', on)} ${tl(64, 52, 'A2', on)}`; }
  },

  TIMER_CONTACT_NO: {
    label: 'Timer Contacto NA (15/16)', group: 'Temporizadores', defaultLabel: 'KT1',
    width: 80, height: 60,
    terminals: [{ id: 'in', x: 0, y: 30, label: '15' }, { id: 'out', x: 80, y: 30, label: '16' }],
    conducts: 'timer-NO', initialState: { energized: false },
    svg({ energized: on }) { const w = st(on); return `
      <line x1="0" y1="30" x2="22" y2="30" ${w}/>
      <line x1="22" y1="14" x2="22" y2="46" ${w}/>
      <line x1="58" y1="14" x2="58" y2="46" ${w}/>
      <line x1="58" y1="30" x2="80" y2="30" ${w}/>
      <line x1="32" y1="13" x2="48" y2="13" stroke="${on ? C_ON : '#bbb'}" stroke-width="1" fill="none"/>
      <text x="40" y="12" text-anchor="middle" font-family="monospace" font-size="8" fill="${on ? C_ON : '#999'}" stroke="none">T</text>
      ${tl(22, 52, '15', on)} ${tl(58, 52, '16', on)}`; }
  },

  TIMER_CONTACT_NC: {
    label: 'Timer Contacto NC (17/18)', group: 'Temporizadores', defaultLabel: 'KT1',
    width: 80, height: 60,
    terminals: [{ id: 'in', x: 0, y: 30, label: '17' }, { id: 'out', x: 80, y: 30, label: '18' }],
    conducts: 'timer-NC', initialState: { energized: false },
    svg({ energized: on }) { const conducting = !on; const w = st(conducting); return `
      <line x1="0" y1="30" x2="22" y2="30" ${w}/>
      <line x1="22" y1="14" x2="22" y2="46" ${w}/>
      <line x1="58" y1="14" x2="58" y2="46" ${w}/>
      <line x1="22" y1="44" x2="58" y2="16" ${w}/>
      <line x1="58" y1="30" x2="80" y2="30" ${w}/>
      <text x="40" y="12" text-anchor="middle" font-family="monospace" font-size="8" fill="${conducting ? C_ON : '#999'}" stroke="none">T</text>
      ${tl(22, 52, '17', conducting)} ${tl(58, 52, '18', conducting)}`; }
  },

  /* ══════════════ LÁMPARAS ═══════════════════════════════════════ */

  LAMP_R: {
    label: 'Lámpara Roja', group: 'Indicadores', defaultLabel: 'H2',
    width: 80, height: 60,
    terminals: [{ id: 'in', x: 0, y: 30, label: 'X1' }, { id: 'out', x: 80, y: 30, label: 'X2' }],
    conducts: 'load', initialState: { energized: false },
    svg({ energized: on }) {
      const w = st(on);
      const cf = on ? '#ff3030' : '#fff8f8';
      const cs = on ? '#cc1111' : '#1a1a1a';
      return `
        <line x1="0" y1="30" x2="26" y2="30" ${w}/>
        <circle cx="40" cy="30" r="13" fill="${cf}" stroke="${cs}" stroke-width="${on ? 2.5 : 2}"/>
        <line x1="30" y1="20" x2="50" y2="40" stroke="${cs}" stroke-width="${on ? 2 : 1.5}"/>
        <line x1="50" y1="20" x2="30" y2="40" stroke="${cs}" stroke-width="${on ? 2 : 1.5}"/>
        <line x1="53" y1="30" x2="80" y2="30" ${w}/>`; }
  },

  LAMP_G: {
    label: 'Lámpara Verde', group: 'Indicadores', defaultLabel: 'H1',
    width: 80, height: 60,
    terminals: [{ id: 'in', x: 0, y: 30, label: 'X1' }, { id: 'out', x: 80, y: 30, label: 'X2' }],
    conducts: 'load', initialState: { energized: false },
    svg({ energized: on }) {
      const w = st(on);
      const cf = on ? '#22cc44' : '#f8fff8';
      const cs = on ? '#1a9932' : '#1a1a1a';
      return `
        <line x1="0" y1="30" x2="26" y2="30" ${w}/>
        <circle cx="40" cy="30" r="13" fill="${cf}" stroke="${cs}" stroke-width="${on ? 2.5 : 2}"/>
        <line x1="30" y1="20" x2="50" y2="40" stroke="${cs}" stroke-width="${on ? 2 : 1.5}"/>
        <line x1="50" y1="20" x2="30" y2="40" stroke="${cs}" stroke-width="${on ? 2 : 1.5}"/>
        <line x1="53" y1="30" x2="80" y2="30" ${w}/>`; }
  },

  LAMP_Y: {
    label: 'Lámpara Amarilla', group: 'Indicadores', defaultLabel: 'H3',
    width: 80, height: 60,
    terminals: [{ id: 'in', x: 0, y: 30, label: 'X1' }, { id: 'out', x: 80, y: 30, label: 'X2' }],
    conducts: 'load', initialState: { energized: false },
    svg({ energized: on }) {
      const w = st(on);
      const cf = on ? '#ffcc00' : '#fffff0';
      const cs = on ? '#cc9900' : '#1a1a1a';
      return `
        <line x1="0" y1="30" x2="26" y2="30" ${w}/>
        <circle cx="40" cy="30" r="13" fill="${cf}" stroke="${cs}" stroke-width="${on ? 2.5 : 2}"/>
        <line x1="30" y1="20" x2="50" y2="40" stroke="${cs}" stroke-width="${on ? 2 : 1.5}"/>
        <line x1="50" y1="20" x2="30" y2="40" stroke="${cs}" stroke-width="${on ? 2 : 1.5}"/>
        <line x1="53" y1="30" x2="80" y2="30" ${w}/>`; }
  },

  /* ══════════════ PROTECCIONES ════════════════════════════════════ */

  THERMAL_CONTACT: {
    label: 'Contacto Relé Térmico NC', group: 'Protecciones', defaultLabel: 'F2',
    width: 80, height: 60,
    terminals: [{ id: 'in', x: 0, y: 30, label: '95' }, { id: 'out', x: 80, y: 30, label: '96' }],
    conducts: 'coilRef-NC', initialState: { energized: false },
    svg({ energized: tripped }) {
      const conducting = !tripped;
      const w = st(conducting);
      return `
        <line x1="0" y1="30" x2="22" y2="30" ${w}/>
        <line x1="22" y1="14" x2="22" y2="46" ${w}/>
        <line x1="58" y1="14" x2="58" y2="46" ${w}/>
        <line x1="22" y1="44" x2="58" y2="16" ${w}/>
        <path d="M28,50 Q34,56 40,50 Q46,44 52,50" stroke="${conducting ? C_ON : '#888'}" stroke-width="1.5" fill="none"/>
        <line x1="58" y1="30" x2="80" y2="30" ${w}/>
        ${tl(22, 12, '95', conducting)} ${tl(58, 12, '96', conducting)}`; }
  },

  /* ══════════════ RELÉ (KV) ══════════════════════════════════════ */

  RELAY_COIL: {
    label: 'Relé Bobina (KV)', group: 'Relés', defaultLabel: 'KV',
    width: 80, height: 60,
    terminals: [{ id: 'A1', x: 0, y: 30, label: 'A1' }, { id: 'A2', x: 80, y: 30, label: 'A2' }],
    conducts: 'load', initialState: { energized: false },
    svg({ energized: on }) { const w = st(on); return `
      <line x1="0" y1="30" x2="16" y2="30" ${w}/>
      <rect x="16" y="19" width="48" height="22" rx="2" ${w}/>
      <text x="40" y="34" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" ${fi(on)}>KV</text>
      <line x1="64" y1="30" x2="80" y2="30" ${w}/>
      ${tl(16, 52, 'A1', on)} ${tl(64, 52, 'A2', on)}`; }
  },
};

export function getComponentDef(type) { return DEFS[type]; }
export function getAllComponents()    { return Object.values(DEFS); }
export { DEFS as COMPONENTS };
