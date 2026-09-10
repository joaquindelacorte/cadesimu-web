/**
 * tests/engine.test.js — Tests del motor de scan cycle
 *
 * Runner: Node.js puro (sin dependencias externas).
 * Ejecutar: node tests/engine.test.js
 *
 * Nota: los módulos usan import/export (ESM).
 * Requiere Node 18+ con --experimental-vm-modules o se ejecuta como .mjs.
 */

import { VariableTable } from '../js/engine/variables.js';
import { ScanEngine }    from '../js/engine/scan.js';
import { XIC, XIO, OTE, OTL, OTU, TON, CTU } from '../js/engine/components/index.js';
import { exportProject, parseProject }         from '../js/io/json.js';

// ─── Mini test runner ─────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function assert(condition, msg = 'Assertion failed') {
  if (!condition) throw new Error(msg);
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg ?? `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ─── SUITE: VariableTable ─────────────────────────────────────────────
console.log('\n📋 VariableTable');

test('get/set boolean', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.set('I', '0', true);
  assert(v.get('I', '0') === true);
});

test('getBool falsy coercion', () => {
  const v = new VariableTable();
  assert(v.getBool('I', '99') === false, 'Variable no definida debe ser false');
});

test('set Q output', () => {
  const v = new VariableTable();
  v.defineOutput('0');
  v.set('Q', '0', true);
  assert(v.getBool('Q', '0') === true);
});

test('defineTimer / get timer', () => {
  const v = new VariableTable();
  v.defineTimer('T0', 5000);
  const t = v.get('T', 'T0');
  assert(t.preset === 5000);
  assert(t.accumulated === 0);
  assert(t.done === false);
});

test('timer getBool returns .done', () => {
  const v = new VariableTable();
  v.defineTimer('T0', 1000);
  v.set('T', 'T0', { done: true });
  assert(v.getBool('T', 'T0') === true);
});

test('reset() clears all vars', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.defineOutput('0');
  v.defineTimer('T0', 1000);
  v.set('I', '0', true);
  v.set('Q', '0', true);
  v.set('T', 'T0', { accumulated: 800 });
  v.reset();
  assert(v.getBool('I', '0') === false);
  assert(v.getBool('Q', '0') === false);
  assertEqual(v.get('T', 'T0').accumulated, 0);
});

test('toJSON / fromJSON round-trip', () => {
  const v1 = new VariableTable();
  v1.defineInput('0');
  v1.set('I', '0', true);
  const json = v1.toJSON();

  const v2 = new VariableTable();
  v2.fromJSON(json);
  assert(v2.getBool('I', '0') === true);
});

test('onChange listener fires on set', () => {
  const v = new VariableTable();
  v.defineOutput('0');
  let fired = false;
  v.onChange(() => { fired = true; });
  v.set('Q', '0', true);
  assert(fired, 'Listener no disparó');
});

test('snapshot() devuelve todas las vars', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.defineOutput('0');
  v.defineOutput('1');
  const snap = v.snapshot();
  assertEqual(snap.length, 3);
});

// ─── SUITE: Instrucciones ─────────────────────────────────────────────
console.log('\n⚙️  Instrucciones Ladder');

test('XIC pasa cuando variable es true', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.set('I', '0', true);
  assert(XIC(v, { addrType: 'I', address: '0' }, true) === true);
});

test('XIC no pasa cuando variable es false', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.set('I', '0', false);
  assert(XIC(v, { addrType: 'I', address: '0' }, true) === false);
});

test('XIC no pasa cuando powerIn=false (sin importar variable)', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.set('I', '0', true);
  assert(XIC(v, { addrType: 'I', address: '0' }, false) === false);
});

test('XIO pasa cuando variable es false', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.set('I', '0', false);
  assert(XIO(v, { addrType: 'I', address: '0' }, true) === true);
});

test('XIO no pasa cuando variable es true', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.set('I', '0', true);
  assert(XIO(v, { addrType: 'I', address: '0' }, true) === false);
});

test('OTE activa salida con powerIn=true', () => {
  const v = new VariableTable();
  v.defineOutput('0');
  OTE(v, { addrType: 'Q', address: '0' }, true);
  assert(v.getBool('Q', '0') === true);
});

test('OTE desactiva salida con powerIn=false', () => {
  const v = new VariableTable();
  v.defineOutput('0');
  v.set('Q', '0', true);
  OTE(v, { addrType: 'Q', address: '0' }, false);
  assert(v.getBool('Q', '0') === false);
});

test('OTL no desactiva con powerIn=false', () => {
  const v = new VariableTable();
  v.defineOutput('0');
  v.set('Q', '0', true);
  OTL(v, { addrType: 'Q', address: '0' }, false);
  assert(v.getBool('Q', '0') === true, 'OTL no debe desactivar');
});

test('OTU no activa con powerIn=false', () => {
  const v = new VariableTable();
  v.defineOutput('0');
  OTU(v, { addrType: 'Q', address: '0' }, false);
  assert(v.getBool('Q', '0') === false, 'OTU no debe activar');
});

test('TON acumula tiempo y activa done', () => {
  const v = new VariableTable();
  const el = { addrType: 'T', address: 'T0', preset: 100 };
  TON(v, el, true, 60);  // 60ms acumulado → no done
  assert(v.get('T', 'T0').done === false);
  TON(v, el, true, 50);  // 60+50=110ms → done
  assert(v.get('T', 'T0').done === true);
});

test('TON resetea cuando powerIn=false', () => {
  const v = new VariableTable();
  const el = { addrType: 'T', address: 'T0', preset: 100 };
  TON(v, el, true, 60);
  TON(v, el, false, 0);
  assertEqual(v.get('T', 'T0').accumulated, 0);
});

test('CTU incrementa en flanco ascendente', () => {
  const v = new VariableTable();
  const el = { addrType: 'C', address: 'C0', preset: 3, _lastPower: false };
  CTU(v, el, true);   // flanco ↑ → acc=1
  CTU(v, el, true);   // sin flanco → acc=1
  CTU(v, el, false);  // flanco ↓
  CTU(v, el, true);   // flanco ↑ → acc=2
  assertEqual(v.get('C', 'C0').accumulated, 2);
});

// ─── SUITE: ScanEngine ───────────────────────────────────────────────
console.log('\n🔄 ScanEngine');

// Mock de performance para Node.js
if (typeof performance === 'undefined') {
  global.performance = { now: () => Date.now() };
}
// Mock de requestAnimationFrame (no existe en Node)
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

test('step() ejecuta el programa y actualiza variables', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.defineOutput('0');
  v.set('I', '0', true);

  const program = [
    {
      id: 'r0',
      comment: 'test',
      elements: [
        { type: 'XIC', addrType: 'I', address: '0' },
        { type: 'OTE', addrType: 'Q', address: '0' },
      ]
    }
  ];

  const engine = new ScanEngine(v);
  engine.loadProgram(program);
  engine.step();

  assert(v.getBool('Q', '0') === true, 'Q.0 debe activarse con I.0=true');
});

test('step() no activa Q si I=false', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.defineOutput('0');
  v.set('I', '0', false);

  const engine = new ScanEngine(v);
  engine.loadProgram([
    { id: 'r0', comment: '', elements: [
      { type: 'XIC', addrType: 'I', address: '0' },
      { type: 'OTE', addrType: 'Q', address: '0' },
    ]}
  ]);
  engine.step();
  assert(v.getBool('Q', '0') === false);
});

test('stop() resetea variables y scanCount', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.defineOutput('0');
  v.set('I', '0', true);

  const engine = new ScanEngine(v);
  engine.loadProgram([
    { id: 'r0', comment: '', elements: [
      { type: 'XIC', addrType: 'I', address: '0' },
      { type: 'OTE', addrType: 'Q', address: '0' },
    ]}
  ]);
  engine.step();
  engine.stop();

  assertEqual(engine.scanCount, 0);
  assert(v.getBool('Q', '0') === false, 'stop() debe resetear Q.0');
});

test('BRANCH (OR) funciona en rung', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.defineInput('1');
  v.defineOutput('0');
  v.set('I', '0', false);
  v.set('I', '1', true);   // rama 2 activa

  const engine = new ScanEngine(v);
  engine.loadProgram([
    { id: 'r0', comment: '', elements: [
      {
        type: 'BRANCH',
        branches: [
          [ { type: 'XIC', addrType: 'I', address: '0' } ],
          [ { type: 'XIC', addrType: 'I', address: '1' } ],
        ]
      },
      { type: 'OTE', addrType: 'Q', address: '0' },
    ]}
  ]);
  engine.step();
  assert(v.getBool('Q', '0') === true, 'BRANCH OR debe pasar si al menos una rama es true');
});

test('evento scan se emite en step()', () => {
  const v = new VariableTable();
  const engine = new ScanEngine(v);
  engine.loadProgram([]);
  let eventFired = false;
  engine.on('scan', () => { eventFired = true; });
  engine.step();
  assert(eventFired, 'Evento scan no se emitió');
});

// ─── SUITE: Export / Import JSON ─────────────────────────────────────
console.log('\n📦 Export / Import JSON');

test('exportProject genera schema v1 válido', () => {
  const v = new VariableTable();
  v.defineInput('0');
  v.set('I', '0', true);
  const rungs = [{ id: 'r0', comment: 'test', elements: [] }];
  const p = exportProject({ vars: v, rungs, meta: { title: 'Demo', author: 'Alumno' } });

  assertEqual(p.version, '1');
  assertEqual(p.meta.title, 'Demo');
  assertEqual(p.meta.author, 'Alumno');
  assert(Array.isArray(p.rungs));
  assert(typeof p.meta.created === 'string');
  assert(typeof p.meta.modified === 'string');
});

test('parseProject acepta JSON válido v1', () => {
  const v = new VariableTable();
  const p = exportProject({ vars: v, rungs: [] });
  const result = parseProject(JSON.stringify(p));
  assert(result.ok === true, result.error);
});

test('parseProject rechaza JSON sin version', () => {
  const result = parseProject('{"rungs":[]}');
  assert(result.ok === false);
});

test('parseProject rechaza version incorrecta', () => {
  const result = parseProject('{"version":"99","rungs":[]}');
  assert(result.ok === false);
});

test('parseProject rechaza JSON malformado', () => {
  const result = parseProject('{invalid json}');
  assert(result.ok === false);
});

test('round-trip completo: export → parse → variables OK', () => {
  const v1 = new VariableTable();
  v1.defineInput('0');
  v1.defineOutput('0');
  v1.set('I', '0', true);

  const rungs = [{ id: 'r0', comment: '', elements: [] }];
  const exported = exportProject({ vars: v1, rungs, meta: { title: 'Test RT' } });
  const { ok, project } = parseProject(JSON.stringify(exported));

  assert(ok);
  const v2 = new VariableTable();
  v2.fromJSON(project.variables);
  assert(v2.getBool('I', '0') === true, 'I.0 debe ser true tras round-trip');
});

// ─── Resumen ──────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Resultado: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
