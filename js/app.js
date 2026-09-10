/**
 * app.js — Entry point de CADESIMU Web
 *
 * Conecta el motor de scan con la UI.
 * Fase 0: demo con un programa hardcodeado para validar el motor.
 */

import { VariableTable } from './engine/variables.js';
import { ScanEngine }    from './engine/scan.js';

// ─── Variables del PLC ───────────────────────────────────────────────
const vars = new VariableTable();

// Definir variables de demo
vars.defineInput('0', false);   // I.0 — Pulsador arranque
vars.defineInput('1', false);   // I.1 — Pulsador paro (NC → normalmente true)
vars.defineOutput('0', false);  // Q.0 — Motor
vars.defineMark('0', false);    // M.0 — Memoria auxiliar
vars.set('I', '1', true);       // I.1 arranca en TRUE (pulsador NC)

// ─── Programa demo: arranque con retención (latch) ───────────────────
//
//   Rung 0: [I.0]--[/I.1]--[M.0 XIC en paralelo con I.0]--( Q.0 )
//   Rung 1: Q.0 → M.0
//
const program = [
  {
    id: 'rung-0',
    comment: 'Arranque con retención',
    elements: [
      {
        type: 'BRANCH',
        branches: [
          [ { type: 'XIC', addrType: 'I', address: '0' } ],  // pulsador arranque
          [ { type: 'XIC', addrType: 'M', address: '0' } ],  // retención
        ]
      },
      { type: 'XIO', addrType: 'I', address: '1' },   // pulsador paro (NC)
      { type: 'OTE', addrType: 'Q', address: '0' },   // salida motor
    ]
  },
  {
    id: 'rung-1',
    comment: 'Retención memoria',
    elements: [
      { type: 'XIC', addrType: 'Q', address: '0' },
      { type: 'OTE', addrType: 'M', address: '0' },
    ]
  }
];

// ─── Motor ───────────────────────────────────────────────────────────
const engine = new ScanEngine(vars);
engine.loadProgram(program);

// ─── UI: elementos del DOM ───────────────────────────────────────────
const btnPlay   = document.getElementById('btn-play');
const btnPause  = document.getElementById('btn-pause');
const btnStop   = document.getElementById('btn-stop');
const btnStep   = document.getElementById('btn-step');
const badge     = document.getElementById('status-badge');
const scanCount = document.getElementById('scan-counter');
const varTbody  = document.getElementById('var-tbody');
const sbScan    = document.getElementById('sb-scan');
const sbTime    = document.getElementById('sb-time');

// ─── Renderizado de variables ─────────────────────────────────────────
function renderVars() {
  const rows = vars.snapshot();
  varTbody.innerHTML = '';

  for (const { type, address, value } of rows) {
    const tr = document.createElement('tr');

    let displayVal;
    let valClass;
    if (type === 'T' || type === 'C') {
      displayVal = `${value.accumulated}/${value.preset}`;
      valClass = value.done ? 'var-val-true' : 'var-val-false';
    } else {
      displayVal = value ? '1' : '0';
      valClass = value ? 'var-val-true' : 'var-val-false';
    }

    tr.innerHTML = `
      <td class="var-addr">${type}.${address}</td>
      <td class="${valClass}">${displayVal}</td>
    `;

    // Click en entrada → toggle (para demo interactivo)
    if (type === 'I') {
      tr.style.cursor = 'pointer';
      tr.title = 'Click para togglear';
      tr.addEventListener('click', () => {
        vars.set('I', address, !vars.getBool('I', address));
        renderVars();
      });
    }

    varTbody.appendChild(tr);
  }
}

// ─── Actualizar estado del badge ──────────────────────────────────────
function setBadge(state) {
  badge.textContent = state;
  badge.className = '';
  if (state === 'RUNNING') badge.classList.add('running');
  if (state === 'PAUSED')  badge.classList.add('paused');
}

// ─── Eventos del motor ────────────────────────────────────────────────
engine.on('scan', ({ scanCount: sc, scanTimeMs: t }) => {
  renderVars();
  scanCount.textContent = `Scan #${sc}`;
  sbScan.textContent = sc;
  sbTime.textContent = `${t.toFixed(2)} ms`;
});

engine.on('stop', () => {
  renderVars();
  setBadge('DETENIDO');
  scanCount.textContent = 'Scan #0';
});

// ─── Botones ──────────────────────────────────────────────────────────
btnPlay.addEventListener('click', () => {
  engine.start();
  setBadge('RUNNING');
});

btnPause.addEventListener('click', () => {
  engine.pause();
  setBadge('PAUSED');
});

btnStop.addEventListener('click', () => {
  engine.stop();
  setBadge('DETENIDO');
});

btnStep.addEventListener('click', () => {
  engine.step();
  setBadge('PAUSED');
  renderVars();
});

// ─── Init ─────────────────────────────────────────────────────────────
renderVars();
setBadge('DETENIDO');
console.log('[CADESIMU] Motor listo. Usá Play para arrancar.');
