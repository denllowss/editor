/**
 * Test regresi Stroke universal + Drop Shadow (Fase 2, v0.27.0):
 * [1] Plugin outline terdaftar: id, kategori, 5 param + default benar.
 * [2] Fungsional render outline (mock ctx): passthrough, box, alpha.
 * [3] Fungsional render drop-shadow (mock ctx): properti shadow + 1 draw.
 * [4] Kabel UI: script tag + kartu galeri.
 * [5] Stroke bawaan shape & teks tetap ada (tidak regresi).
 * [6] Drop shadow 3D di engine + paritas ekspor via renderCanvasFrame.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUBLIC = path.join(__dirname, '..', 'public');
const editorCode = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');
const engineCode = fs.readFileSync(path.join(PUBLIC, 'js', 'fishtool-engine.js'), 'utf8');
const exportCode = fs.readFileSync(path.join(PUBLIC, 'js', 'FishExport-Enggine.js'), 'utf8');
const editorHtml = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

// ---------- Harness mock canvas ----------
function mockCtx() {
  return {
    ops: [],
    canvas: { width: 800, height: 600 },
    save() { this.ops.push(['save']); },
    restore() { this.ops.push(['restore']); },
    clearRect(x, y, w, h) { this.ops.push(['clearRect', x, y, w, h]); },
    fillRect(x, y, w, h) { this.ops.push(['fillRect', x, y, w, h]); },
    strokeRect(x, y, w, h) { this.ops.push(['strokeRect', x, y, w, h]); },
    drawImage(el, x, y, w, h) { this.ops.push(['drawImage', el && el.__tag, x, y, w, h]); },
    set fillStyle(v) { this.ops.push(['fillStyle', v]); },
    set strokeStyle(v) { this.ops.push(['strokeStyle', v]); },
    set lineWidth(v) { this.ops.push(['lineWidth', v]); },
    set globalCompositeOperation(v) { this.ops.push(['gco', v]); },
    set shadowColor(v) { this.ops.push(['shadowColor', v]); },
    set shadowBlur(v) { this.ops.push(['shadowBlur', v]); },
    set shadowOffsetX(v) { this.ops.push(['shadowOffsetX', v]); },
    set shadowOffsetY(v) { this.ops.push(['shadowOffsetY', v]); }
  };
}
const createdCanvases = [];
function loadPlugin(file) {
  const defs = new Map();
  const sandbox = {
    console,
    FishEffectsRegistry: { register(def) { defs.set(def.id, def); } },
    document: {
      createElement(tag) {
        const c = { __tag: 'canvas:' + createdCanvases.length, width: 0, height: 0, _ctx: mockCtx() };
        c._ctx.canvas = c;
        c.getContext = () => c._ctx;
        createdCanvases.push(c);
        return c;
      }
    }
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(PUBLIC, 'effects', file), 'utf8'), sandbox, { filename: file });
  return defs;
}

// [1] Registrasi outline
console.log('[1] Registrasi plugin outline');
const outlineDefs = loadPlugin('outline.js');
const outline = outlineDefs.get('outline');
ok(!!outline, 'outline terdaftar di registry');
ok(outline && outline.category === 'layer', 'kategori layer');
const oParams = {};
(outline ? outline.params : []).forEach(p => { oParams[p.id] = p; });
ok(oParams.width && oParams.width.default === 8 && oParams.width.max === 100, 'param width (default 8, max 100)');
ok(oParams.color && oParams.color.type === 'color', 'param color bertipe color');
ok(oParams.opacity && oParams.opacity.default === 100, 'param opacity (default 100)');
ok(oParams.mode && oParams.mode.type === 'select' && oParams.mode.default === 'alpha', 'param mode alpha/box (default alpha)');
ok(oParams.quality && oParams.quality.default === 'fast', 'param quality (default fast)');
ok(outline && typeof outline.render === 'function', 'outline punya render()');

const fakeEl = { __tag: 'IMG' };

// [2] Fungsional outline
console.log('[2] Fungsional render outline');
{
  // 2a. Passthrough saat width=0 (nol overhead offscreen)
  const before = createdCanvases.length;
  const ctx = mockCtx();
  outline.render(ctx, fakeEl, {}, { x: 10, y: 20, w: 100, h: 50 }, { width: 0, color: '#fff', opacity: 100, mode: 'alpha' });
  const draws = ctx.ops.filter(o => o[0] === 'drawImage');
  ok(draws.length === 1 && draws[0][1] === 'IMG', 'width=0 → 1 drawImage passthrough');
  ok(createdCanvases.length === before, 'width=0 → tanpa alokasi offscreen');
}
{
  // 2b. Mode box: draw + strokeRect di tengah tepi
  const ctx = mockCtx();
  outline.render(ctx, fakeEl, {}, { x: 10, y: 20, w: 100, h: 50 }, { width: 6, color: '#ff0000', opacity: 50, mode: 'box' });
  const lw = ctx.ops.find(o => o[0] === 'lineWidth');
  const sr = ctx.ops.find(o => o[0] === 'strokeRect');
  const ss = ctx.ops.find(o => o[0] === 'strokeStyle');
  ok(lw && lw[1] === 6, 'box: lineWidth = width');
  ok(sr && sr[1] === 10 && sr[2] === 20 && sr[3] === 100 && sr[4] === 50, 'box: strokeRect pas bounds');
  ok(ss && ss[1] === 'rgba(255, 0, 0, 0.5)', 'box: warna rgba + opacity');
}
{
  // 2c. Mode alpha fast: offscreen pad + 8 sampel + tint source-in + 2 draw utama
  const ctx = mockCtx();
  outline.render(ctx, fakeEl, {}, { x: 0, y: 0, w: 100, h: 50 }, { width: 8, color: '#00ff00', opacity: 100, mode: 'alpha', quality: 'fast' });
  const off = createdCanvases[createdCanvases.length - 1];
  const pad = Math.ceil(8) + 1;
  ok(off.width === 100 + pad * 2 && off.height === 50 + pad * 2, `alpha: offscreen ${off.width}x${off.height} = bounds + 2*pad`);
  const offDraws = off._ctx.ops.filter(o => o[0] === 'drawImage');
  ok(offDraws.length === 8, 'alpha fast: 8 sampel dilasi');
  // Sampel tersebar melingkar pada radius=width dari titik pad
  const pts = offDraws.map(o => [o[2] - pad, o[3] - pad]);
  const radii = pts.map(([dx, dy]) => Math.hypot(dx, dy));
  ok(radii.every(r => Math.abs(r - 8) < 1e-9), 'alpha: semua sampel tepat di radius width');
  const angs = pts.map(([dx, dy]) => Math.atan2(dy, dx)).sort((a, b) => a - b);
  const gaps = angs.map((a, i) => (i === 0 ? a - angs[angs.length - 1] + 2 * Math.PI : a - angs[i - 1]));
  ok(gaps.every(g => Math.abs(g - Math.PI / 4) < 1e-9), 'alpha: 8 sampel merata tiap 45°');
  const gcos = off._ctx.ops.filter(o => o[0] === 'gco').map(o => o[1]);
  ok(gcos.includes('source-in'), 'alpha: tint via source-in');
  const fs = off._ctx.ops.find(o => o[0] === 'fillStyle');
  ok(fs && fs[1] === 'rgba(0, 255, 0, 1)', 'alpha: tint warna benar');
  const main = ctx.ops.filter(o => o[0] === 'drawImage');
  ok(main.length === 2 && main[1][1] === 'IMG', 'alpha: siluet di belakang + layer di atas');
}
{
  // 2d. Mode alpha smooth: 16 sampel + daur-ulang offscreen yang sama
  const nBefore = createdCanvases.length;
  const prevOff = createdCanvases[createdCanvases.length - 1];
  const opsBefore = prevOff ? prevOff._ctx.ops.length : 0;
  const ctx = mockCtx();
  outline.render(ctx, fakeEl, {}, { x: 0, y: 0, w: 100, h: 50 }, { width: 8, color: '#fff', opacity: 100, mode: 'alpha', quality: 'smooth' });
  const off = createdCanvases[createdCanvases.length - 1];
  const offDraws = off._ctx.ops.slice(opsBefore).filter(o => o[0] === 'drawImage');
  ok(offDraws.length === 16, 'alpha smooth: 16 sampel dilasi');
  ok(createdCanvases.length === nBefore, 'offscreen didaur-ulang (tanpa alokasi baru)');
}

// [3] Fungsional drop-shadow
console.log('[3] Fungsional render drop-shadow');
const dsDefs = loadPlugin('drop_shadow.js');
const ds = dsDefs.get('drop-shadow');
ok(!!ds && typeof ds.render === 'function', 'drop-shadow terdaftar + punya render()');
{
  const ctx = mockCtx();
  ds.render(ctx, fakeEl, {}, { x: 0, y: 0, w: 100, h: 50 }, { color: '#000000', opacity: 75, distance: 15, angle: 135, blur: 10 });
  const get = (k) => { const o = ctx.ops.find(o => o[0] === k); return o && o[1]; };
  const exp = Math.cos(135 * Math.PI / 180) * 15;
  const eyp = Math.sin(135 * Math.PI / 180) * 15;
  ok(get('shadowColor') === 'rgba(0, 0, 0, 0.75)', 'shadowColor rgba + opacity');
  ok(Math.abs(get('shadowOffsetX') - exp) < 1e-9 && Math.abs(get('shadowOffsetY') - eyp) < 1e-9, 'offset dari angle+distance');
  ok(get('shadowBlur') === 10, 'shadowBlur = blur');
  ok(ctx.ops.filter(o => o[0] === 'drawImage').length === 1, '1x drawImage');
}

// [4] Kabel UI
console.log('[4] Kabel UI');
ok(editorHtml.includes('<script src="effects/outline.js"></script>'), 'script tag outline.js');
ok(editorHtml.includes('data-effect-id="outline"'), 'kartu galeri outline');
ok(editorHtml.includes('data-effect-id="drop-shadow"'), 'kartu galeri drop-shadow');

// [5] Stroke bawaan tak regresi
console.log('[5] Stroke bawaan shape & teks');
ok(editorCode.includes('sctx.strokeStyle = layer.strokeColor'), 'render stroke shape ada');
ok(editorCode.includes('layer.textProps.strokeWidth'), 'stroke teks (textProps) ada');
ok(editorHtml.includes('jog-text-stroke-width'), 'kontrol stroke teks di panel');

// [6] Engine 3D + ekspor
console.log('[6] Engine + paritas ekspor');
ok(engineCode.includes("f.type === 'drop-shadow'"), 'engine terapkan drop-shadow jalur 3D');
ok(engineCode.includes("f.type !== 'drop-shadow'"), 'drop-shadow dikecualikan dari praproses 2D (ditangani khusus)');
ok(exportCode.includes("window.renderCanvasFrame(exportCanvas"), 'ekspor via renderCanvasFrame (efek ikut)');

// ----------------------------------------------------------
console.log(`\nStroke+Shadow Fase 2: ${passed} lolos, ${failed} gagal.`);
if (failed > 0) process.exit(1);
