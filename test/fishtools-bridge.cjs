/**
 * Test routing FishToolsBridge (panel FishTool di editor).
 *
 * - Semua tombol CF_* memanggil efek yang benar (termasuk preset).
 * - SHKE di-remap ke OSCILLATE (pengganti web) — tidak lagi error.
 * - SEMUA data-tool di Extension/extension.html dieksekusi tanpa throw.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUBLIC = path.join(__dirname, '..', 'public');
let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

// ----------------------------------------------------------
// Sandbox: stub editor secukupnya untuk routing bridge
// ----------------------------------------------------------
function createEditorSandbox() {
  const calls = { appliedEffects: [], execFishTool: [], beatNull: [], saves: 0, redraws: 0, rackSyncs: 0 };
  const layer = {
    id: 'l1', name: 'Layer 1', type: 'video',
    startSec: 0, durationSec: 5, effects: [],
    anchorX: 0, anchorY: 0, posX: 0, posY: 0,
  };
  const win = {
    console,
    currentProjectState: { name: 'Test', resolution: '1080p', aspectRatio: '16:9', layers: [layer] },
    selectedLayerIds: new Set(['l1']),
    selectedLayerId: 'l1',
    currentPixelsPerSecond: 80,
    currentPlaybackSec: 1.0,
    applyEffectToSelectedLayers(effectId) {
      calls.appliedEffects.push(effectId);
      layer.effects.push({ id: 'fx_' + effectId, type: effectId, name: effectId });
    },
    saveCurrentProjectLayers() { calls.saves++; },
    redrawComposition() { calls.redraws++; },
    syncEffectsRackUI() { calls.rackSyncs++; },
    // CATATAN: editor asli TIDAK punya window.executeFishTool (dispatcher
    // terpusat belum ada), jadi bridge selalu memakai handler internalnya.
    // Stub itu hanya ditambahkan di kasus delegasi khusus di bawah.
    applyBeatNullTool(name) { calls.beatNull.push(name); return 'true'; },
    selectTimelineLayer() {},
  };
  const sandbox = {
    console, Math, Object, Array, JSON, parseInt, isNaN, Set, Map,
    window: win,
  };
  sandbox.window.window = win;
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(PUBLIC, 'js', 'fishtools-adapter.js'), 'utf8');
  vm.runInContext(code, sandbox, { filename: 'fishtools-adapter.js' });
  return { sandbox, win, calls, layer };
}

function lastFx(layer) {
  return layer.effects[layer.effects.length - 1];
}

// ----------------------------------------------------------
// 1. CF_* routing + preset
// ----------------------------------------------------------
console.log('\n[1] CF_* routing');
{
  const t = createEditorSandbox();
  const run = (name, ...a) => t.win.FishToolsBridge.executeTool(name, ...a);

  run('CF_COLORIZE');
  ok(t.calls.appliedEffects[0] === 'colorize', 'CF_COLORIZE → colorize');
  ok(/^#[0-9a-f]{6}$/.test(lastFx(t.layer).color || ''), 'CF_COLORIZE: warna acak', lastFx(t.layer).color);

  run('CF_SCANLINE');
  run('CF_MONO');
  run('CF_GLOW_AURA');
  run('CF_SOLID_AURA');
  ok(t.calls.appliedEffects.slice(1, 5).join(',') === 'scanline,mono,glow-aura,solid-aura',
    'CF_SCANLINE/MONO/GLOW_AURA/SOLID_AURA tepat');

  const n0 = t.calls.appliedEffects.length;
  run('CF_STARBURST');
  ok(t.calls.appliedEffects.slice(n0).join(',') === 'star-burst,bevel,drop-shadow', 'CF_STARBURST → 3 efek berurutan');

  const n1 = t.calls.appliedEffects.length;
  run('CF_GRID');
  ok(t.calls.appliedEffects.slice(n1).join(',') === 'grid,bevel,drop-shadow', 'CF_GRID → 3 efek berurutan');

  const n2 = t.calls.appliedEffects.length;
  run('CF_RADIO');
  ok(t.calls.appliedEffects.slice(n2).join(',') === 'radio-waves,bevel,drop-shadow', 'CF_RADIO → 3 efek berurutan');

  run('CF_SHATTER_SIMPLE');
  const s1 = lastFx(t.layer);
  ok(s1.type === 'shatter' && s1.progress === 35 && s1.duration === 1.2 && s1.force === 550,
    'CF_SHATTER_SIMPLE → preset cepat', JSON.stringify({ p: s1.progress, d: s1.duration, f: s1.force }));

  run('CF_SHATTER_SLOW');
  const s2 = lastFx(t.layer);
  ok(s2.type === 'shatter' && s2.progress === 12 && s2.duration === 6.0 && s2.force === 200,
    'CF_SHATTER_SLOW → preset lambat', JSON.stringify({ p: s2.progress, d: s2.duration, f: s2.force }));

  const n3 = t.calls.appliedEffects.length;
  run('CF_DROP_BEVEL');
  ok(t.calls.appliedEffects.slice(n3).join(',') === 'bevel,drop-shadow', 'CF_DROP_BEVEL → bevel + drop-shadow');
}

// ----------------------------------------------------------
// 2. SHKE remap
// ----------------------------------------------------------
console.log('\n[2] SHKE remap');
{
  const t = createEditorSandbox();
  const res = t.win.FishToolsBridge.executeTool('SHKE');
  ok(t.calls.beatNull.length === 1 && t.calls.beatNull[0] === 'OSCILLATE',
    'SHKE → applyBeatNullTool("OSCILLATE")', JSON.stringify(t.calls.beatNull));
  ok(typeof res === 'string' && res.indexOf('disabled') === -1, 'SHKE tidak lagi error disabled');

  // dispatcher terpusat (jika suatu saat ada) menerima nama hasil remap
  const t2 = createEditorSandbox();
  t2.win.executeFishTool = (name, ...a) => { t2.calls.execFishTool.push([name, ...a]); return 'true'; };
  t2.win.FishToolsBridge.executeTool('SHKE');
  ok(t2.calls.execFishTool.length === 1 && t2.calls.execFishTool[0][0] === 'SHKE',
    'delegasi dispatcher (pre-existing) meneruskan SHKE apa adanya');
}

// ----------------------------------------------------------
// 3. Tanpa layer: peringatan ramah (bukan crash)
// ----------------------------------------------------------
console.log('\n[3] Guard tanpa layer');
{
  const t = createEditorSandbox();
  t.win.currentProjectState.layers = [];
  t.win.selectedLayerIds = new Set();
  t.win.selectedLayerId = null;
  const res = t.win.FishToolsBridge.executeTool('CF_MONO');
  let parsed = null;
  try { parsed = JSON.parse(res); } catch (_) {}
  ok(parsed && parsed.error === true && /select at least one layer/i.test(parsed.message || ''),
    'CF_MONO tanpa layer → warn JSON ramah');
}

// ----------------------------------------------------------
// 4. Sweep SEMUA tombol panel: tanpa throw
// ----------------------------------------------------------
console.log('\n[4] Sweep semua data-tool panel');
{
  const html = fs.readFileSync(path.join(PUBLIC, 'Extension', 'extension.html'), 'utf8');
  const tools = [...new Set([...html.matchAll(/data-tool="([A-Z0-9_]+)"/g)].map((m) => m[1]))];
  ok(tools.length > 50, `${tools.length} tombol ditemukan di panel`);
  const t = createEditorSandbox();
  let threw = [];
  for (const name of tools) {
    try {
      t.win.FishToolsBridge.executeTool(name);
    } catch (e) {
      threw.push(name + ':' + (e && e.message));
    }
  }
  // tombol konteks: BLUR/LENS dengan arg true (klik kanan), MIR true
  for (const [name, arg] of [['BLUR', true], ['LENS', true], ['MIR', true]]) {
    try { t.win.FishToolsBridge.executeTool(name, arg); }
    catch (e) { threw.push(name + '(alt):' + (e && e.message)); }
  }
  ok(threw.length === 0, `executeTool tanpa throw (${tools.length}+3 kasus)`, threw.slice(0, 3).join(' | '));
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
