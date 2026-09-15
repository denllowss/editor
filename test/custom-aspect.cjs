/**
 * Test custom aspect ratio (v0.16.0):
 * [1] API modul shared CustomAspect.
 * [2] parse(): format "L:T" valid & invalid.
 * [3] dimsFor(): dimensi short-side antar-resolusi, genap.
 * [4] register(): injeksi resMap runtime, preset diabaikan.
 * [5] Markup: tombol Custom + baris input di 3 grid + tag script + CSS.
 * [6] Wiring: main.js (dashboard) & editor.js (editor).
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

const CA = require(path.join(ROOT, 'public', 'js', 'custom-aspect.js'));

// ----------------------------------------------------------
console.log('\n[1] API modul shared');
{
  ['parse', 'isPreset', 'dimsFor', 'register', 'syncGrid', 'resolveGrid', 'updateCustomRow', 'flagInvalidRow']
    .forEach(fn => ok(typeof CA[fn] === 'function', 'CustomAspect.' + fn + ' tersedia'));
}

// ----------------------------------------------------------
console.log('\n[2] parse()');
{
  ok(JSON.stringify(CA.parse('16:9')) === '{"w":16,"h":9,"text":"16:9"}', 'parse 16:9 → {w,h,text}');
  ok(JSON.stringify(CA.parse(' 3:2 ')) === '{"w":3,"h":2,"text":"3:2"}', 'parse toleran spasi');
  ok(CA.parse('0:9') === null, 'tolak lebar 0');
  ok(CA.parse('16:0') === null, 'tolak tinggi 0');
  ok(CA.parse('abc') === null, 'tolak non-angka');
  ok(CA.parse('1000:9') === null, 'tolak > 999');
  ok(CA.parse('1:100') === null, 'tolak rasio < 0.1');
  ok(CA.parse('100:1') === null, 'tolak rasio > 10');
  ok(CA.parse('2.5:1') === null, 'tolak desimal (input integer saja)');
}

// ----------------------------------------------------------
console.log('\n[3] dimsFor()');
{
  const land = CA.dimsFor('1080p', '3:2');
  ok(Array.isArray(land) && land[0] === 1620 && land[1] === 1080, 'landscape 3:2 @1080p → [1620,1080]', JSON.stringify(land));
  const port = CA.dimsFor('1080p', '9:16');
  ok(Array.isArray(port) && port[0] === 1080 && port[0] < port[1], 'portrait sisi-pendek = 1080', JSON.stringify(port));
  const sq = CA.dimsFor('720p', '1:1');
  ok(Array.isArray(sq) && sq[0] === 720 && sq[1] === 720, 'square 1:1 @720p → [720,720]', JSON.stringify(sq));
  const odd = CA.dimsFor('720p', '7:5');
  ok(odd[0] % 2 === 0 && odd[1] % 2 === 0, 'kedua sisi selalu genap', JSON.stringify(odd));
  const k4 = CA.dimsFor('4K', '2:1');
  ok(k4[0] === 4320 && k4[1] === 2160, '4K short-side 2160', JSON.stringify(k4));
  ok(JSON.stringify(CA.dimsFor('1080p', 'xxx')) === '[1920,1080]', 'aspek invalid → fallback [1920,1080]');
}

// ----------------------------------------------------------
console.log('\n[4] register()');
{
  globalThis.resMap = {
    '1080p': { '16:9': [1920, 1080] },
    '720p': { '16:9': [1280, 720] },
  };
  ok(CA.register('3:2') === '3:2', 'custom 3:2 terdaftar (kembali teks normal)');
  ok(JSON.stringify(globalThis.resMap['1080p']['3:2']) === '[1620,1080]', '1080p dapat entri [1620,1080]');
  ok(JSON.stringify(globalThis.resMap['720p']['3:2']) === '[1080,720]', '720p dapat entri [1080,720]');
  ok(JSON.stringify(globalThis.resMap['4K']['3:2']) === '[3240,2160]', 'resolusi hilang dibuatkan + diisi');
  const before = JSON.stringify(globalThis.resMap['1080p']);
  ok(CA.register('16:9') === '16:9', 'preset kembali apa adanya');
  ok(JSON.stringify(globalThis.resMap['1080p']) === before, 'preset tidak mengubah resMap');
  ok(!('custom' in globalThis.resMap['1080p']), 'tidak ada kunci harfiah "custom"');
  ok(CA.register('0:5') === '0:5', 'invalid kembali apa adanya');
  ok(!('0:5' in globalThis.resMap['1080p']), 'invalid tidak menambah kunci');
  delete globalThis.resMap;
}

// ----------------------------------------------------------
console.log('\n[5] Markup + script + CSS');
{
  const indexHtml = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const editorHtml = fs.readFileSync(path.join(ROOT, 'public', 'editor.html'), 'utf8');
  const modalCss = fs.readFileSync(path.join(ROOT, 'public', 'css', 'modal.css'), 'utf8');

  const countCustom = (s) => (s.match(/data-val="custom"/g) || []).length;
  ok(countCustom(indexHtml) === 2, 'index.html: 2 tombol Custom (new + settings)');
  ok(countCustom(editorHtml) === 1, 'editor.html: 1 tombol Custom');
  ok(indexHtml.includes('id="options-aspect-ratio-custom"'), 'index: row custom new-project');
  ok(indexHtml.includes('id="options-aspect-ratio-custom-w"') && indexHtml.includes('id="options-aspect-ratio-custom-h"'), 'index: input L & T new-project');
  ok(indexHtml.includes('id="settings-options-aspect-ratio-custom-w"'), 'index: input settings');
  ok(editorHtml.includes('id="options-aspect-ratio-custom-h"'), 'editor: input custom');
  ok(indexHtml.includes('js/custom-aspect.js') && editorHtml.includes('js/custom-aspect.js'), 'tag script di kedua halaman');
  ok(modalCss.includes('.ratio-custom'), 'CSS .ratio-custom');
  ok(modalCss.includes('.aspect-custom-row'), 'CSS .aspect-custom-row');
  ok(modalCss.includes('.aspect-custom-row.is-error'), 'CSS status error');
}

// ----------------------------------------------------------
console.log('\n[6] Wiring main.js & editor.js');
{
  const mainCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'main.js'), 'utf8');
  const editorCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'editor.js'), 'utf8');

  const count = (s, sub) => s.split(sub).length - 1;
  ok(count(mainCode, 'CustomAspect.resolveGrid') === 2, 'main.js: resolveGrid di save settings + create');
  ok(mainCode.includes('CustomAspect.syncGrid'), 'main.js: syncGrid saat load settings');
  ok(mainCode.includes('CustomAspect.updateCustomRow'), 'main.js: updateCustomRow saat klik grid');
  ok(mainCode.includes('CustomAspect.flagInvalidRow'), 'main.js: flagInvalidRow + toast + abort');
  ok(count(editorCode, 'CustomAspect.resolveGrid') === 2, 'editor.js: resolveGrid di summary + save');
  ok(editorCode.includes('CustomAspect.syncGrid'), 'editor.js: syncGrid saat load settings');
  ok(editorCode.includes('CustomAspect.updateCustomRow'), 'editor.js: updateCustomRow saat klik grid');
  ok(count(editorCode, 'CustomAspect.register') >= 2, 'editor.js: register saat save + initEditorParams');
}

// ----------------------------------------------------------
console.log('\n[7] Render custom: fit box + cssRatio + changeCompositionRatio');
{
  const editorCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'editor.js'), 'utf8');
  ok(editorCode.includes('CustomAspect.parse(aspectStr)'), 'fitPreviewCanvasBox: angka aspek via parse (custom ikut)');
  ok(editorCode.includes("cssRatio = _cap2.w + ' / ' + _cap2.h"), 'updatePreviewCanvas: cssRatio custom-aware');
  ok(editorCode.includes('aspect = window.CustomAspect.register(aspect)'), 'changeCompositionRatio: register sebelum updatePreviewCanvas');
}

// ----------------------------------------------------------
console.log(`\nCustom-aspect: ${passed} lolos, ${failed} gagal.`);
if (failed > 0) process.exit(1);
