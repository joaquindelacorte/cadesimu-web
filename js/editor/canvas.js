/**
 * canvas.js — Renderizador SVG para el esquemático libre
 *
 * Responsabilidades:
 *   - Dibuja todos los componentes en su posición XY
 *   - Dibuja cables con ruteo ortogonal
 *   - Gestiona drag de componentes
 *   - Gestiona herramienta cable (click terminal → click terminal)
 *   - Actualiza estados energizados sin reconstruir el SVG completo
 */

import { getComponentDef } from './symbols.js';

const GRID   = 10;       // snap a 10px
const SNAP   = x => Math.round(x / GRID) * GRID;

export class SchematicCanvas {
  /**
   * @param {SVGElement} svg
   * @param {import('./schematic.js').SchematicState} schematic
   * @param {{ onComponentClick, onWireComplete, onModeChange }} callbacks
   */
  constructor(svg, schematic, callbacks = {}) {
    this.svg       = svg;
    this.schematic = schematic;
    this.cb        = callbacks;

    /** 'select' | 'wire' | 'drag' */
    this.mode = 'select';

    this._dragging   = null;   // { compId, offX, offY }
    this._wireStart  = null;   // { compId, termId, pos }
    this._wirePoints = [];     // puntos provisionales del cable activo
    this._selection  = null;   // compId seleccionado
    this._previewLine = null;  // SVGLineElement de preview mientras se dibuja

    this._layers = {};
    this._buildLayers();
    this._bindEvents();
  }

  /* ── Capas SVG ──────────────────────────────────────────────────── */

  _buildLayers() {
    // Limpiar
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

    const makeG = id => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.id = id;
      this.svg.appendChild(g);
      return g;
    };

    this._layers.wires      = makeG('layer-wires');
    this._layers.components = makeG('layer-components');
    this._layers.labels     = makeG('layer-labels');
    this._layers.terminals  = makeG('layer-terminals');
    this._layers.preview    = makeG('layer-preview');
  }

  /* ── Render completo ────────────────────────────────────────────── */

  render() {
    this._clearLayer('wires');
    this._clearLayer('components');
    this._clearLayer('labels');
    this._clearLayer('terminals');

    for (const wire of this.schematic.wires.values()) {
      this._renderWire(wire);
    }

    for (const comp of this.schematic.components.values()) {
      this._renderComponent(comp);
    }
  }

  /* ── Render de un cable ─────────────────────────────────────────── */

  _renderWire(wire) {
    if (!wire.points || wire.points.length < 2) return;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.dataset.wireId = wire.id;

    const color = wire.energized ? '#cc1111' : '#1a1a1a';
    const sw    = wire.energized ? 2.5 : 2;

    for (let i = 0; i < wire.points.length - 1; i++) {
      const a = wire.points[i], b = wire.points[i + 1];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', sw);
      line.setAttribute('stroke-linecap', 'round');
      g.appendChild(line);
    }

    // Nodo de conexión si hay bifurcación (simplificado: en los extremos con comp)
    this._layers.wires.appendChild(g);
  }

  /* ── Render de un componente ────────────────────────────────────── */

  _renderComponent(comp) {
    const def = getComponentDef(comp.type);
    if (!def) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.dataset.compId = comp.id;
    g.setAttribute('transform', `translate(${comp.x}, ${comp.y})`);
    g.style.cursor = 'move';

    // SVG del símbolo
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    inner.setAttribute('viewBox', `0 0 ${def.width} ${def.height}`);
    inner.setAttribute('width', def.width);
    inner.setAttribute('height', def.height);
    inner.setAttribute('overflow', 'visible');
    inner.innerHTML = def.svg(comp.state);
    g.appendChild(inner);

    // Highlight si seleccionado
    if (this._selection === comp.id) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', -4); rect.setAttribute('y', -4);
      rect.setAttribute('width', def.width + 8); rect.setAttribute('height', def.height + 8);
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', '#388bfd');
      rect.setAttribute('stroke-width', '1.5');
      rect.setAttribute('stroke-dasharray', '4,3');
      rect.setAttribute('rx', '4');
      g.insertBefore(rect, g.firstChild);
    }

    this._layers.components.appendChild(g);

    // Label encima del componente
    const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lbl.setAttribute('x', comp.x + def.width / 2);
    lbl.setAttribute('y', comp.y - 4);
    lbl.setAttribute('text-anchor', 'middle');
    lbl.setAttribute('font-family', 'monospace');
    lbl.setAttribute('font-size', '10');
    lbl.setAttribute('font-weight', 'bold');
    lbl.setAttribute('fill', comp.state.energized ? '#cc1111' : '#333');
    lbl.textContent = comp.label;
    this._layers.labels.appendChild(lbl);

    // Terminales (puntos de conexión)
    for (const t of def.terminals) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const tx = comp.x + t.x, ty = comp.y + t.y;
      circle.setAttribute('cx', tx); circle.setAttribute('cy', ty);
      circle.setAttribute('r', '5');
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', 'transparent');
      circle.setAttribute('stroke-width', '8'); // hit area generosa
      circle.dataset.compId = comp.id;
      circle.dataset.termId = t.id;
      circle.style.cursor = this.mode === 'wire' ? 'crosshair' : 'default';
      this._layers.terminals.appendChild(circle);
    }
  }

  /* ── Actualización de estados (sin reconstruir todo) ────────────── */

  updateStates() {
    // Actualizar símbolos de componentes
    for (const comp of this.schematic.components.values()) {
      const g = this._layers.components.querySelector(`[data-comp-id="${comp.id}"]`);
      if (!g) continue;
      const def = getComponentDef(comp.type);
      if (!def) continue;
      const inner = g.querySelector('svg');
      if (inner) inner.innerHTML = def.svg(comp.state);

      // Label color
      const lbl = this._layers.labels.querySelector ?
        [...this._layers.labels.children].find(el =>
          Math.abs(parseFloat(el.getAttribute('x')) - (comp.x + def.width / 2)) < 1
        ) : null;
      if (lbl) lbl.setAttribute('fill', comp.state.energized ? '#cc1111' : '#333');
    }

    // Actualizar cables
    for (const wire of this.schematic.wires.values()) {
      const g = this._layers.wires.querySelector(`[data-wire-id="${wire.id}"]`);
      if (!g) continue;
      const color = wire.energized ? '#cc1111' : '#1a1a1a';
      const sw    = wire.energized ? '2.5' : '2';
      for (const line of g.querySelectorAll('line')) {
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', sw);
      }
    }
  }

  /* ── Herramienta cable ──────────────────────────────────────────── */

  setMode(mode) {
    this.mode = mode;
    this._wireStart  = null;
    this._wirePoints = [];
    this._clearLayer('preview');
    this.svg.style.cursor = mode === 'wire' ? 'crosshair' : 'default';
    // Cambiar cursor de terminales
    for (const circle of this._layers.terminals.children) {
      circle.style.cursor = mode === 'wire' ? 'crosshair' : 'default';
    }
  }

  /* ── Event binding ──────────────────────────────────────────────── */

  _bindEvents() {
    // Drag de componentes
    this._layers.components.addEventListener('mousedown', e => {
      if (this.mode !== 'select') return;
      const g = e.target.closest('[data-comp-id]');
      if (!g) return;
      const compId = g.dataset.compId;
      const comp   = this.schematic.components.get(compId);
      if (!comp) return;
      this._selection = compId;

      const svgRect = this.svg.getBoundingClientRect();
      this._dragging = {
        compId,
        offX: e.clientX - svgRect.left - comp.x,
        offY: e.clientY - svgRect.top  - comp.y,
      };
      e.preventDefault();
    });

    // Click en terminales → herramienta cable
    this._layers.terminals.addEventListener('click', e => {
      if (this.mode !== 'wire') return;
      const circle = e.target.closest('[data-comp-id]');
      if (!circle) return;
      const compId = circle.dataset.compId;
      const termId = circle.dataset.termId;
      const pos    = this.schematic.terminalPos(compId, termId);
      if (!pos) return;

      if (!this._wireStart) {
        this._wireStart = { compId, termId, pos };
        this._renderPreviewDot(pos);
      } else {
        // Completar cable
        this.schematic.addWire(this._wireStart.compId, this._wireStart.termId, compId, termId);
        this._wireStart = null;
        this._clearLayer('preview');
        this.render();
        this.cb.onWireComplete?.();
      }
    });

    // Click en componente (select/propiedades)
    this._layers.components.addEventListener('click', e => {
      if (this.mode !== 'select') return;
      const g = e.target.closest('[data-comp-id]');
      if (!g) return;
      this._selection = g.dataset.compId;
      this.render();
      this.cb.onComponentClick?.(g.dataset.compId);
    });

    // Click en canvas vacío → deseleccionar
    this.svg.addEventListener('click', e => {
      if (e.target === this.svg || e.target.tagName === 'rect') {
        if (this._selection) { this._selection = null; this.render(); }
      }
    });

    // Mouse move: drag + preview cable
    window.addEventListener('mousemove', e => {
      if (this._dragging) {
        const svgRect = this.svg.getBoundingClientRect();
        const nx = SNAP(e.clientX - svgRect.left - this._dragging.offX);
        const ny = SNAP(e.clientY - svgRect.top  - this._dragging.offY);
        this.schematic.moveComponent(this._dragging.compId, nx, ny);
        this.render();
      } else if (this.mode === 'wire' && this._wireStart) {
        const svgRect = this.svg.getBoundingClientRect();
        const mx = e.clientX - svgRect.left;
        const my = e.clientY - svgRect.top;
        this._updatePreviewLine(this._wireStart.pos, { x: mx, y: my });
      }
    });

    window.addEventListener('mouseup', () => { this._dragging = null; });

    // Escape cancela herramienta cable
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this._wireStart = null;
        this._clearLayer('preview');
        if (this.mode === 'wire') { this.setMode('select'); this.cb.onModeChange?.('select'); }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this._selection) {
        this.schematic.removeComponent(this._selection);
        this._selection = null;
        this.render();
      }
    });
  }

  /* ── Helpers preview cable ──────────────────────────────────────── */

  _renderPreviewDot(pos) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', pos.x); c.setAttribute('cy', pos.y);
    c.setAttribute('r', '4'); c.setAttribute('fill', '#1f6feb');
    this._layers.preview.appendChild(c);
  }

  _updatePreviewLine(from, to) {
    if (this._previewLine) this._layers.preview.removeChild(this._previewLine);
    const { orthogonalRoute } = schematicModule;
    const pts = orthogonalRoute(from, to);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i+1];
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', a.x); l.setAttribute('y1', a.y);
      l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
      l.setAttribute('stroke', '#1f6feb');
      l.setAttribute('stroke-width', '1.5');
      l.setAttribute('stroke-dasharray', '5,4');
      l.setAttribute('stroke-linecap', 'round');
      g.appendChild(l);
    }
    this._previewLine = g;
    this._layers.preview.appendChild(g);
  }

  /* ── Helpers SVG ────────────────────────────────────────────────── */

  _clearLayer(name) {
    const l = this._layers[name];
    while (l.firstChild) l.removeChild(l.firstChild);
  }

  getSelectedId() { return this._selection; }
}

// Importar orthogonalRoute sin circular
import { orthogonalRoute as _ortho } from './schematic.js';
const schematicModule = { orthogonalRoute: _ortho };
