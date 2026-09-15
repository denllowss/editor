/**
 * Smoke test efek-efek tambahan (tanpa browser).
 *
 * - Memuat tiap file effects/*.js baru di sandbox VM dengan stub
 *   window/document/canvas-2d minimal.
 * - Validasi skema registrasi (id unik, kategori, params).
 * - Menjalankan render() dengan default, nilai ekstrem, dan waktu
 *   berbeda — memastikan tidak ada throw.
 * - Assert deterministik untuk efek piksel (posterize, halftone)
 *   dan animasi grain (static stabil, animated berubah per frame).
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUBLIC = path.join(__dirname, '..', 'public');
const NEW_EFFECTS = [
  { file: 'pixelate.js', id: 'pixelate' },
  { file: 'zoom_blur.js', id: 'zoom-blur' },
  { file: 'film_grain.js', id: 'film-grain' },
  { file: 'halftone.js', id: 'halftone' },
  { file: 'posterize.js', id: 'posterize' },
  { file: 'kaleidoscope.js', id: 'kaleidoscope' },
  { file: 'gaussian_blur.js', id: 'gaussian-blur' },
  { file: 'directional_blur.js', id: 'directional-blur' },
  { file: 'threshold.js', id: 'threshold' },
  { file: 'gradient_map.js', id: 'gradient-map' },
  { file: 'replace_color.js', id: 'replace-color' },
  { file: 'chroma_key.js', id: 'chroma-key' },
  { file: 'luma_key.js', id: 'luma-key' },
  { file: 'mirror.js', id: 'mirror' },
  { file: 'offset.js', id: 'offset' },
  { file: 'find_edges.js', id: 'find-edges' },
  { file: 'wipe.js', id: 'wipe' },
  { file: 'glow.js', id: 'glow' },
  { file: 'motion_blur.js', id: 'motion-blur' },
  // Batch gaya AE/AM (v0.19.0)
  { file: 'noise.js', id: 'noise' },
  { file: 'spin_blur.js', id: 'spin-blur' },
  { file: 'radial_wipe.js', id: 'radial-wipe' },
  { file: 'venetian_blinds.js', id: 'venetian-blinds' },
  { file: 'strobe.js', id: 'strobe' },
  { file: 'glitch.js', id: 'glitch' },
  { file: 'light_sweep.js', id: 'light-sweep' },
  { file: 'tritone.js', id: 'tritone' },
  { file: 'leave_color.js', id: 'leave-color' },
  { file: 'emboss.js', id: 'emboss' },
  { file: 'solarize.js', id: 'solarize' },
  { file: 'camera_shake.js', id: 'camera-shake' },
  { file: 'four_color_gradient.js', id: 'four-color-gradient' },
  { file: 'circle.js', id: 'circle' },
];
const KNOWN_CATEGORIES = ['lightning', 'layer', 'expression', 'warp', 'movement', 'background'];
const KNOWN_TYPES = ['number', 'color', 'select', 'switch', 'boolean', 'angle', 'curve'];

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) {
    passed++;
    console.log('  ✅ ' + label);
  } else {
    failed++;
    console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : ''));
  }
}

// ----------------------------------------------------------
// Stub canvas 2D + document + window
// ----------------------------------------------------------
const allCtxs = [];
let putSeq = 0;

function makeCtx(canvas) {
  const state = { canvas };
  const ctx = new Proxy(state, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'getImageData') {
        return (sx, sy, sw, sh) => {
          // Pola deterministik: abu-abu (128,64,192) + alpha penuh
          const data = new Uint8ClampedArray(sw * sh * 4);
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 128; data[i + 1] = 64; data[i + 2] = 192; data[i + 3] = 255;
          }
          return { data, width: sw, height: sh };
        };
      }
      if (prop === 'createImageData') {
        return (sw, sh) => ({ data: new Uint8ClampedArray(sw * sh * 4), width: sw, height: sh });
      }
      if (prop === 'putImageData') {
        return (img) => {
          t.__lastPut = { data: Buffer.from(img.data), width: img.width, height: img.height };
          t.__putSeq = ++putSeq;
        };
      }
      if (prop === 'createPattern') return () => ({ __pattern: true });
      if (prop === 'measureText') return () => ({ width: 10 });
      return () => {}; // semua method lain: no-op
    },
    set(t, prop, value) { t[prop] = value; return true; },
  });
  allCtxs.push(ctx);
  return ctx;
}

function makeCanvas(w, h) {
  const c = { width: w || 300, height: h || 150, tagName: 'CANVAS', __ctx: null };
  c.getContext = () => {
    if (!c.__ctx) c.__ctx = makeCtx(c);
    return c.__ctx;
  };
  return c;
}

function resetPuts() {
  for (const c of allCtxs) { c.__lastPut = null; c.__putSeq = 0; }
  putSeq = 0;
}

function getPuts() {
  return allCtxs
    .filter((c) => c.__lastPut)
    .sort((a, b) => b.__putSeq - a.__putSeq)
    .map((c) => c.__lastPut);
}

// ----------------------------------------------------------
// Muat efek di sandbox VM
// ----------------------------------------------------------
function createSandbox() {
  const reg = { defs: [], register(d) { this.defs.push(d); } };
  const sb = {
    console, Math, Object, Array, parseInt, isNaN, JSON,
    Uint8ClampedArray, Uint8Array, Float32Array,
    window: null, document: null,
  };
  sb.window = { FishEffectsRegistry: reg };
  sb.document = {
    createElement: (tag) => (String(tag).toLowerCase() === 'canvas' ? makeCanvas() : { tagName: String(tag).toUpperCase() }),
  };
  vm.createContext(sb);
  return { sandbox: sb, registry: reg };
}

function loadEffect(sb, file) {
  const code = fs.readFileSync(path.join(PUBLIC, 'effects', file), 'utf8');
  vm.runInContext(code, sb, { filename: file });
}

const { sandbox, registry } = createSandbox();
for (const e of NEW_EFFECTS) loadEffect(sandbox, e.file);

// ----------------------------------------------------------
// 1. Registrasi
// ----------------------------------------------------------
console.log('\n[1] Registrasi efek');
ok(registry.defs.length === NEW_EFFECTS.length,
  `${registry.defs.length}/${NEW_EFFECTS.length} efek terdaftar`, JSON.stringify(registry.defs.map((d) => d.id)));
const ids = registry.defs.map((d) => d.id);
ok(new Set(ids).size === ids.length, 'semua id unik');
for (const e of NEW_EFFECTS) ok(ids.includes(e.id), `id "${e.id}" terdaftar`);

// ----------------------------------------------------------
// 2. Skema definisi
// ----------------------------------------------------------
console.log('\n[2] Skema definisi');
function buildFx(def) {
  const fx = { type: def.id };
  for (const p of def.params) {
    if (p.type === 'switch' || p.type === 'boolean') fx[p.id] = p.default !== undefined ? p.default : 1;
    else if (p.type === 'color') fx[p.id] = p.default || '#ffffff';
    else if (p.type === 'select') fx[p.id] = p.default || (p.options && p.options[0]);
    else fx[p.id] = p.default !== undefined ? p.default : 0;
  }
  return fx;
}
for (const def of registry.defs) {
  ok(!!def.name, `${def.id}: punya nama`, def.name);
  ok(KNOWN_CATEGORIES.includes(def.category), `${def.id}: kategori valid`, def.category);
  ok(typeof def.render === 'function', `${def.id}: punya render()`);
  ok(Array.isArray(def.params) && def.params.length > 0, `${def.id}: punya ${def.params.length} param`);
  for (const p of def.params) {
    const valid = p.id && p.label && KNOWN_TYPES.includes(p.type);
    ok(valid, `${def.id}.param "${p.id}" (${p.type}) valid`);
    if (p.type === 'select') ok(Array.isArray(p.options) && p.options.length > 0, `${def.id}.${p.id}: punya options`);
    if (p.type === 'number') ok(p.min !== undefined && p.max !== undefined, `${def.id}.${p.id}: punya min/max`);
  }
}

// ----------------------------------------------------------
// 3. Smoke render: default + ekstrem + waktu bervariasi
// ----------------------------------------------------------
console.log('\n[3] Smoke render()');
const bounds = { x: 5, y: 7, w: 160, h: 90 };
const mainCanvas = makeCanvas(640, 360);
const mainCtx = mainCanvas.getContext('2d');
const fakeEl = makeCanvas(320, 180);

function tryRender(def, fx, t, label) {
  try {
    def.render(mainCtx, fakeEl, { _currentSec: t }, bounds, fx, t);
    ok(true, label);
  } catch (err) {
    ok(false, label, String(err && err.message || err));
  }
}

for (const def of registry.defs) {
  tryRender(def, buildFx(def), 1.25, `${def.id}: render default @t=1.25`);
  // ekstrem: semua number → min, lalu max
  const fxMin = buildFx(def);
  const fxMax = buildFx(def);
  for (const p of def.params) {
    if (p.type === 'number') { fxMin[p.id] = p.min; fxMax[p.id] = p.max; }
    if (p.type === 'color') { fxMin[p.id] = '#000000'; fxMax[p.id] = '#ff00ff'; }
    if (p.type === 'switch' || p.type === 'boolean') { fxMin[p.id] = 0; fxMax[p.id] = 1; }
  }
  tryRender(def, fxMin, 0, `${def.id}: render nilai-min @t=0`);
  tryRender(def, fxMax, 9.75, `${def.id}: render nilai-max @t=9.75`);
  // tiap opsi select
  for (const p of def.params) {
    if (p.type !== 'select') continue;
    for (const opt of p.options) {
      const fx = buildFx(def);
      fx[p.id] = opt;
      tryRender(def, fx, 2.5, `${def.id}: select ${p.id}="${opt}"`);
    }
  }
  // fx kosong (jalur default) + el video belum siap
  tryRender(def, {}, 0.5, `${def.id}: render fx kosong (default)`);
  try {
    const videoEl = { tagName: 'VIDEO', readyState: 0, videoWidth: 0, videoHeight: 0 };
    def.render(mainCtx, videoEl, {}, bounds, buildFx(def), 0.5);
    ok(true, `${def.id}: guard video-belum-siap`);
  } catch (err) {
    ok(false, `${def.id}: guard video-belum-siap`, String(err && err.message || err));
  }
}

// ----------------------------------------------------------
// 4. Assert deterministik piksel & animasi
// ----------------------------------------------------------
console.log('\n[4] Assert deterministik');
function getDef(id) {
  return registry.defs.find((d) => d.id === id);
}

// Posterize levels=2 pada (128,64,192) → (255,0,255)
{
  const def = getDef('posterize');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { levels: 2, mix: 100 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[0] === 255 && px[1] === 0 && px[2] === 255 && px[3] === 255,
    'posterize L=2: (128,64,192)→(255,0,255)', JSON.stringify(px));
}

// Halftone mono levels=2: lum(128,64,192)=0.34 + bayer(0,0)→ hitam
{
  const def = getDef('halftone');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { cellSize: 6, levels: 2, mode: 'mono', mix: 100 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[0] === 0 && px[1] === 0 && px[2] === 0 && px[3] === 255,
    'halftone mono L=2 @piksel(0,0): hitam', JSON.stringify(px));
}

// Halftone color: ketiga channel terkuantisasi ke {0,255}
{
  const def = getDef('halftone');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { cellSize: 6, levels: 2, mode: 'color', mix: 100 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  const valid = px && [px[0], px[1], px[2]].every((v) => v === 0 || v === 255);
  ok(valid, 'halftone color L=2: channel ∈ {0,255}', JSON.stringify(px));
}

// Threshold 50 pada lum 34% → hitam; threshold 0 → putih
{
  const def = getDef('threshold');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { threshold: 50, mix: 100 }, 0);
  let puts = getPuts();
  let px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[0] === 0 && px[1] === 0 && px[2] === 0 && px[3] === 255,
    'threshold 50: lum 34% → hitam', JSON.stringify(px));
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { threshold: 0, mix: 100 }, 0);
  puts = getPuts();
  px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[0] === 255 && px[1] === 255 && px[2] === 255 && px[3] === 255,
    'threshold 0: → putih', JSON.stringify(px));
}

// Gradient Map default (hitam→abu→putih) pada lum 86.85 → abu 87
{
  const def = getDef('gradient-map');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { shadow: '#000000', midtone: '#808080', highlight: '#ffffff', mix: 100 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[0] === 87 && px[1] === 87 && px[2] === 87 && px[3] === 255,
    'gradient-map default: → (87,87,87)', JSON.stringify(px));
}

// Replace Color: sumber = warna piksel → penuh jadi target
{
  const def = getDef('replace-color');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { source: '#8040c0', target: '#ff0000', tolerance: 100, softness: 0, mix: 100 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[0] === 255 && px[1] === 0 && px[2] === 0 && px[3] === 255,
    'replace-color: → merah penuh', JSON.stringify(px));
}

// Chroma Key: hijau di piksel ungu → dipertahankan; kunci = warna piksel → alpha 0
{
  const def = getDef('chroma-key');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { keyColor: '#00ff00', tolerance: 30, softness: 15, despill: 0 }, 0);
  let puts = getPuts();
  let px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[0] === 128 && px[1] === 64 && px[2] === 192 && px[3] === 255,
    'chroma-key hijau: piksel dipertahankan', JSON.stringify(px));
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { keyColor: '#8040c0', tolerance: 30, softness: 0, despill: 0 }, 0);
  puts = getPuts();
  px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[3] === 0, 'chroma-key tepat: alpha → 0', JSON.stringify(px));
}

// Luma Key Darker 50 pada lum 34% → alpha 0
{
  const def = getDef('luma-key');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { mode: 'Key Out Darker', threshold: 50, softness: 10 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[3] === 0, 'luma-key darker 50: alpha → 0', JSON.stringify(px));
}

// Find Edges pada bidang seragam → hitam (magnitudo 0)
{
  const def = getDef('find-edges');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { sensitivity: 100, invert: 0, mix: 100 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[0] === 0 && px[1] === 0 && px[2] === 0 && px[3] === 255,
    'find-edges seragam: → hitam', JSON.stringify(px));
}

// Render grain di instance fresh (tanpa cache) untuk uji determinisme seed
function freshGrainRender(fx, t) {
  const fresh = createSandbox();
  loadEffect(fresh.sandbox, 'film_grain.js');
  const def = fresh.registry.defs[0];
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, fx, t);
  const puts = getPuts();
  return puts.length ? puts[0] : null;
}

// Grain statis: waktu beda → noise identik (seed tak tergantung waktu)
{
  const fx = { amount: 50, size: 1, animated: 0, mono: 1, blendMode: 'overlay' };
  const a = freshGrainRender(fx, 1.0);
  const b = freshGrainRender(fx, 9.0);
  ok(a && b && Buffer.compare(a.data, b.data) === 0, 'film-grain statis: deterministik (stabil antar waktu)');
}

// Grain animated: frame beda → noise beda (seed per frame)
{
  const fx = { amount: 50, size: 1, animated: 1, mono: 1, blendMode: 'overlay' };
  const a = freshGrainRender(fx, 1.0);
  const b = freshGrainRender(fx, 2.0);
  ok(a && b && Buffer.compare(a.data, b.data) !== 0, 'film-grain animated: berubah per frame');
}

// Grain: render ulang param sama memakai cache tile (tanpa regenerasi)
{
  const def = getDef('film-grain');
  const fx = { amount: 50, size: 3, animated: 0, mono: 0, blendMode: 'overlay' };
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, fx, 3.0);
  const first = getPuts().length;
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, fx, 7.0);
  const second = getPuts().length;
  ok(first === 1 && second === 0, 'film-grain: tile di-cache (render ulang tanpa regenerasi)');
}

// ---- Batch AE/AM: assert deterministik piksel (stub abu (128,64,192)) ----

// Solarize thr=128: (128,64,192) → (127,64,63)
{
  const def = getDef('solarize');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { threshold: 128, blend: 100 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[0] === 127 && px[1] === 64 && px[2] === 63 && px[3] === 255,
    'solarize thr=128: (128,64,192)→(127,64,63)', JSON.stringify(px));
}

// Tritone default pada lum 86.8 → abu ±1
{
  const def = getDef('tritone');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { shadows: '#000000', midtones: '#888888', highlights: '#ffffff', intensity: 100 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && Math.abs(px[0] - 93) <= 1 && px[0] === px[1] && px[1] === px[2],
    'tritone: lum→abu netral ±1', JSON.stringify(px));
}

// Leave-color merah pada (128,64,192) → abu (jauh dari kunci)
{
  const def = getDef('leave-color');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { keyColor: '#ff0000', tolerance: 25, softness: 30, saturation: 0 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && Math.abs(px[0] - 87) <= 1 && px[0] === px[1] && px[1] === px[2],
    'leave-color: non-kunci → abu ±1', JSON.stringify(px));
}

// Emboss pada bidang seragam → 128 (diff 0)
{
  const def = getDef('emboss');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { angle: 135, depth: 3, intensity: 80 }, 0);
  const puts = getPuts();
  const px = puts.length ? Array.from(puts[0].data.slice(0, 4)) : null;
  ok(px && px[0] === 128 && px[1] === 128 && px[2] === 128 && px[3] === 255,
    'emboss seragam: → 128', JSON.stringify(px));
}

// Noise: buffer digambar + deterministik per bucket waktu
{
  const def = getDef('noise');
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { amount: 50, size: 2, colorMode: 'mono', speed: 8, seed: 5 }, 1.0);
  const a = getPuts().length ? getPuts()[0] : null;
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { amount: 50, size: 2, colorMode: 'mono', speed: 8, seed: 5 }, 1.0);
  const b = getPuts().length ? getPuts()[0] : null;
  resetPuts();
  def.render(mainCtx, fakeEl, {}, bounds, { amount: 50, size: 2, colorMode: 'mono', speed: 8, seed: 5 }, 2.0);
  const c = getPuts().length ? getPuts()[0] : null;
  ok(a && b && Buffer.compare(a.data, b.data) === 0, 'noise: frame sama → identik');
  ok(a && c && Buffer.compare(a.data, c.data) !== 0, 'noise: frame beda → berubah');
}

// ----------------------------------------------------------
console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
