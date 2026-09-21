/**
 * app.js — Entry point CADESIMU Web (Fase 2: editor de esquemático libre)
 */

import { SchematicState }  from './editor/schematic.js';
import { SchematicEngine } from './editor/engine2.js';
import { SchematicCanvas } from './editor/canvas.js';
import { Palette2 }        from './editor/palette2.js';
import { PropsPanel }      from './editor/props.js';
import { exportProject, downloadProject, importProjectFromFile } from './io/json.js';
import { getComponentDef } from './editor/symbols.js';

/* ═══════════════════════════════════════════════════════════════════════
   Estado
═══════════════════════════════════════════════════════════════════════ */
const schematic = new SchematicState();
const engine    = new SchematicEngine(schematic);

/* ═══════════════════════════════════════════════════════════════════════
   DOM
═══════════════════════════════════════════════════════════════════════ */
const svgEl        = document.getElementById('schematic-svg');
const paletteEl    = document.getElementById('palette');
const propsEl      = document.getElementById('props-panel');
const badge        = document.getElementById('status-badge');
const scanCountEl  = document.getElementById('scan-counter');
const sbScan       = document.getElementById('sb-scan');
const sbTime       = document.getElementById('sb-time');

const btnPlay      = document.getElementById('btn-play');
const btnPause     = document.getElementById('btn-pause');
const btnStop      = document.getElementById('btn-stop');
const btnStep      = document.getElementById('btn-step');
const btnWire      = document.getElementById('btn-wire');
const btnExport    = document.getElementById('btn-export');
const btnImport    = document.getElementById('btn-import');

/* ═══════════════════════════════════════════════════════════════════════
   Canvas
═══════════════════════════════════════════════════════════════════════ */
const canvas = new SchematicCanvas(svgEl, schematic, {
  onComponentClick(compId) {
    const comp = schematic.components.get(compId);
    props.show(comp);
  },
  onWireComplete() {
    // Volver al modo select después de trazar un cable
    setMode('select');
  },
  onModeChange(mode) {
    updateModeUI(mode);
  },
});

/* ═══════════════════════════════════════════════════════════════════════
   Paleta
═══════════════════════════════════════════════════════════════════════ */
const palette = new Palette2(paletteEl);
palette.render();
palette.onSelect(type => {
  if (!type) return;
  // Click doble en la paleta = colocar en el canvas en posición default
  // Aquí: colocar con una posición incremental para no apilar
  const count = schematic.components.size;
  const x = SNAP(80 + (count % 6) * 120);
  const y = SNAP(80 + Math.floor(count / 6) * 100);
  const comp = schematic.addComponent(type, { x, y });
  canvas.render();
  canvas.cb.onComponentClick(comp.id);
});

function SNAP(v) { return Math.round(v / 10) * 10; }

/* ═══════════════════════════════════════════════════════════════════════
   Propiedades
═══════════════════════════════════════════════════════════════════════ */
const props = new PropsPanel(propsEl, (compId, patch) => {
  if (patch === null) {
    schematic.removeComponent(compId);
    canvas.render();
    props.clear();
  } else {
    schematic.updateComponent(compId, patch);
    canvas.render();
  }
});
props.clear();

/* ═══════════════════════════════════════════════════════════════════════
   Modo herramienta
═══════════════════════════════════════════════════════════════════════ */
function setMode(mode) {
  canvas.setMode(mode);
  updateModeUI(mode);
}

function updateModeUI(mode) {
  btnWire?.classList.toggle('active-tool', mode === 'wire');
  svgEl.style.cursor = mode === 'wire' ? 'crosshair' : 'default';
}

/* ═══════════════════════════════════════════════════════════════════════
   Toolbar
═══════════════════════════════════════════════════════════════════════ */
btnWire?.addEventListener('click', () => {
  const newMode = canvas.mode === 'wire' ? 'select' : 'wire';
  setMode(newMode);
  toast(newMode === 'wire'
    ? 'Modo cable: click en terminal origen → terminal destino. ESC para cancelar.'
    : 'Modo selección');
});

btnPlay?.addEventListener('click', () => {
  engine.start();
  setBadge('RUNNING');
});

btnPause?.addEventListener('click', () => {
  engine.pause();
  setBadge('PAUSED');
});

btnStop?.addEventListener('click', () => {
  engine.stop();
  canvas.render();
  setBadge('DETENIDO');
});

btnStep?.addEventListener('click', () => {
  engine.step();
  canvas.updateStates();
  setBadge('PAUSED');
});

btnExport?.addEventListener('click', () => {
  const data = schematic.toJSON();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${data.meta.title.replace(/\s+/g,'_')}.cadesimu.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Exportado ✓');
});

btnImport?.addEventListener('click', async () => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.cadesimu.json,application/json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        schematic.fromJSON(data);
        engine.stop();
        canvas.render();
        setBadge('DETENIDO');
        toast('Importado ✓');
      } catch (err) {
        toast(`Error: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

/* ═══════════════════════════════════════════════════════════════════════
   Motor events
═══════════════════════════════════════════════════════════════════════ */
let _t0 = 0;
engine.on('scan', ({ scanCount, deltaMs }) => {
  canvas.updateStates();
  scanCountEl.textContent = `Scan #${scanCount}`;
  sbScan.textContent = scanCount;
  sbTime.textContent = `${deltaMs.toFixed(1)} ms`;
});

engine.on('stop', () => {
  canvas.render();
  setBadge('DETENIDO');
  scanCountEl.textContent = 'Scan #0';
});

/* ═══════════════════════════════════════════════════════════════════════
   Cajetín
═══════════════════════════════════════════════════════════════════════ */
document.querySelectorAll('[data-meta]').forEach(el => {
  const key = el.dataset.meta;
  el.addEventListener('input', () => {
    schematic.meta[key] = el.textContent.trim();
  });
  el.textContent = schematic.meta[key] ?? '';
});

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════════════════════════ */
function setBadge(state) {
  badge.textContent = state;
  badge.className = '';
  if (state === 'RUNNING') badge.classList.add('running');
  if (state === 'PAUSED')  badge.classList.add('paused');
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ═══════════════════════════════════════════════════════════════════════
   Arranque
═══════════════════════════════════════════════════════════════════════ */
canvas.render();
setBadge('DETENIDO');
console.log('[CADESIMU] Fase 2 — Editor de esquemático libre. Seleccioná componente en paleta → aparece en canvas.');
