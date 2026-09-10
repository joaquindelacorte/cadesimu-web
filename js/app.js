/**
 * app.js — Entry point CADESIMU Web (Fase 1: editor visual)
 *
 * Orquesta: ProgramState ← → LadderRenderer + Palette + Modal + ScanEngine
 */

import { VariableTable }  from './engine/variables.js';
import { ScanEngine }     from './engine/scan.js';
import { ProgramState }   from './editor/state.js';
import { LadderRenderer } from './editor/renderer.js';
import { Palette }        from './editor/palette.js';
import { VariableModal }  from './editor/modal.js';
import { exportProject, downloadProject, importProjectFromFile, parseProject } from './io/json.js';

/* ═══════════════════════════════════════════════════════════════════════
   Estado global
═══════════════════════════════════════════════════════════════════════ */
const vars    = new VariableTable();
const prog    = new ProgramState();
const engine  = new ScanEngine(vars);
const modal   = new VariableModal();

/* ═══════════════════════════════════════════════════════════════════════
   DOM refs
═══════════════════════════════════════════════════════════════════════ */
const ladderArea   = document.getElementById('ladder-area');
const paletteEl    = document.getElementById('palette');
const varTbody     = document.getElementById('var-tbody');
const badge        = document.getElementById('status-badge');
const scanCountEl  = document.getElementById('scan-counter');
const sbScan       = document.getElementById('sb-scan');
const sbTime       = document.getElementById('sb-time');

const btnPlay      = document.getElementById('btn-play');
const btnPause     = document.getElementById('btn-pause');
const btnStop      = document.getElementById('btn-stop');
const btnStep      = document.getElementById('btn-step');
const btnNewRung   = document.getElementById('btn-new-rung');
const btnExport    = document.getElementById('btn-export');
const btnImport    = document.getElementById('btn-import');

/* ═══════════════════════════════════════════════════════════════════════
   Paleta
═══════════════════════════════════════════════════════════════════════ */
const palette = new Palette(paletteEl);
palette.render();

/* ═══════════════════════════════════════════════════════════════════════
   Renderer
═══════════════════════════════════════════════════════════════════════ */
const renderer = new LadderRenderer(ladderArea, {
  onAddElement(rungId) {
    const type = palette.getSelected();
    if (!type) { toast('Primero seleccioná un componente de la paleta.', 'warn'); return; }
    prog.addElement(rungId, type);
  },
  async onElementClick(rungId, idx) {
    const rung = prog.rungs.find(r => r.id === rungId);
    if (!rung) return;
    const el = rung.elements[idx];
    if (!el) return;
    const result = await modal.open({ addrType: el.addrType, address: el.address });
    if (!result) return;
    prog.updateElement(rungId, idx, result);
    // Asegurar que la variable esté definida en la tabla
    ensureVar(result.addrType, result.address);
    fullRender();
  },
  onRemoveRung(rungId) { prog.removeRung(rungId); },
  onAddRungAfter(afterIndex) { prog.addRung(afterIndex); },
});

/* ═══════════════════════════════════════════════════════════════════════
   Variables — asegurar existencia antes de leer
═══════════════════════════════════════════════════════════════════════ */
function ensureVar(type, address) {
  if (vars.get(type, address) === undefined) {
    if      (type === 'I') vars.defineInput(address, false);
    else if (type === 'Q') vars.defineOutput(address, false);
    else if (type === 'M') vars.defineMark(address, false);
  }
}

function ensureAllVars() {
  for (const rung of prog.rungs) {
    for (const el of rung.elements) {
      ensureVar(el.addrType, el.address);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Render completo (reconstruye el DOM del ladder y la tabla de variables)
═══════════════════════════════════════════════════════════════════════ */
function fullRender() {
  ensureAllVars();
  renderer.render(prog.rungs, vars);
  renderVarTable();
}

/* ═══════════════════════════════════════════════════════════════════════
   Tabla de variables (sidebar)
═══════════════════════════════════════════════════════════════════════ */
function renderVarTable() {
  const rows = vars.snapshot()
    .filter(r => r.type === 'I' || r.type === 'Q' || r.type === 'M');

  if (rows.length === 0) {
    varTbody.innerHTML = `<tr><td colspan="3" class="var-empty">Sin variables</td></tr>`;
    return;
  }

  varTbody.innerHTML = rows.map(({ type, address, value }) => {
    const boolVal = Boolean(value);
    const valClass = boolVal ? 'var-val-true' : 'var-val-false';
    const canToggle = type === 'I';
    const toggleBtn = canToggle
      ? `<button class="var-toggle" data-type="${type}" data-addr="${address}"
                 title="Toggle">
           ${boolVal ? '⬛' : '⬜'}
         </button>`
      : '';
    return `
      <tr>
        <td class="var-addr">${type}.${address}</td>
        <td class="${valClass}">${boolVal ? '1' : '0'}</td>
        <td>${toggleBtn}</td>
      </tr>`;
  }).join('');

  // Toggle de entradas
  varTbody.querySelectorAll('.var-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const { type, addr } = btn.dataset;
      vars.set(type, addr, !vars.getBool(type, addr));
      if (!engine.running) {
        renderVarTable();
        renderer.updateStates(prog.rungs, vars);
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   Badge / status bar
═══════════════════════════════════════════════════════════════════════ */
function setBadge(state) {
  badge.textContent = state;
  badge.className = '';
  if (state === 'RUNNING') badge.classList.add('running');
  if (state === 'PAUSED')  badge.classList.add('paused');
}

/* ═══════════════════════════════════════════════════════════════════════
   Motor de scan → actualización ligera (sin reconstruir DOM)
═══════════════════════════════════════════════════════════════════════ */
engine.on('scan', ({ scanCount, scanTimeMs }) => {
  renderer.updateStates(prog.rungs, vars);
  renderVarTable();
  scanCountEl.textContent = `Scan #${scanCount}`;
  sbScan.textContent = scanCount;
  sbTime.textContent = `${scanTimeMs.toFixed(2)} ms`;
});

engine.on('stop', () => {
  fullRender();
  setBadge('DETENIDO');
  scanCountEl.textContent = 'Scan #0';
});

/* ═══════════════════════════════════════════════════════════════════════
   Toolbar: Play / Pause / Stop / Step
═══════════════════════════════════════════════════════════════════════ */
btnPlay.addEventListener('click', () => {
  ensureAllVars();
  engine.loadProgram(prog.toRungs());
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
  if (!engine.running) {
    ensureAllVars();
    engine.loadProgram(prog.toRungs());
  }
  engine.step();
  setBadge('PAUSED');
  renderer.updateStates(prog.rungs, vars);
  renderVarTable();
});

/* ═══════════════════════════════════════════════════════════════════════
   Toolbar: Nuevo rung
═══════════════════════════════════════════════════════════════════════ */
btnNewRung?.addEventListener('click', () => {
  prog.addRung(prog.rungs.length - 1);
});

/* ═══════════════════════════════════════════════════════════════════════
   Export / Import
═══════════════════════════════════════════════════════════════════════ */
btnExport?.addEventListener('click', () => {
  ensureAllVars();
  const project = exportProject({
    vars,
    rungs: prog.toRungs(),
    meta:  { title: 'Mi programa CADESIMU', author: '' },
  });
  downloadProject(project);
  toast('Proyecto exportado ✓');
});

btnImport?.addEventListener('click', async () => {
  const { ok, project, error } = await importProjectFromFile();
  if (!ok) { toast(error ?? 'Error al importar', 'error'); return; }

  prog.fromJSON(project.rungs);
  vars.fromJSON(project.variables);
  engine.stop();
  fullRender();
  toast('Proyecto importado ✓');
});

/* ═══════════════════════════════════════════════════════════════════════
   Toast
═══════════════════════════════════════════════════════════════════════ */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

/* ═══════════════════════════════════════════════════════════════════════
   ProgramState → recarga el motor en caliente cuando cambia el programa
   (sólo si ya estaba corriendo)
═══════════════════════════════════════════════════════════════════════ */
prog.onChange(() => {
  fullRender();
  if (engine.running) {
    engine.loadProgram(prog.toRungs());
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   Arranque
═══════════════════════════════════════════════════════════════════════ */
fullRender();
setBadge('DETENIDO');
console.log('[CADESIMU] Fase 1 lista. Seleccioná un componente → + Rung → +  para armar el circuito.');
