/**
 * Test v0.18.0:
 * [1] Template editor: browser-back dari overlay auto-open → index.html.
 * [2] Eyedropper lintas-platform (fallback sampling kanvas tanpa API Chromium).
 * [3] Gradien: kontrol arah (slider + pad tarik + keyboard).
 * [4] Gradien: warna custom stop aktif (color input + hex + picker lengkap).
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

const editorCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'editor.js'), 'utf8');
const tplCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'template-editor.js'), 'utf8');
const cpCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'color-picker.js'), 'utf8');
const editorHtml = fs.readFileSync(path.join(ROOT, 'public', 'editor.html'), 'utf8');
const ctrlCss = fs.readFileSync(path.join(ROOT, 'public', 'css', 'transform-controller.css'), 'utf8');

// ----------------------------------------------------------
console.log('\n[1] Template back → halaman Projects');
{
  ok(tplCode.includes('async open(autoOpened = false)'), 'open() terima flag auto-open');
  ok(tplCode.includes('this._autoOpened = !!autoOpened'), 'flag auto-open disimpan');
  ok(tplCode.includes("} else if (this._autoOpened) {"), 'popstate bercabang untuk auto-open');
  ok(tplCode.includes("window.location.href = 'index.html';"), 'auto-open + back → index.html');
  ok(editorCode.includes('window.FishTemplateEditor.open(true)'), 'auto-open impor oper flag true');
  ok(tplCode.includes('this.close(true);'), 'buka manual tetap tutup-ke-editor');
}

// ----------------------------------------------------------
console.log('\n[2] Eyedropper lintas-platform');
{
  ok(!cpCode.includes('requires Chromium'), 'tidak ada lagi alert khusus-Chromium');
  ok(cpCode.includes('_pickFromCanvasFallback()'), 'fallback sampling kanvas ada');
  ok(cpCode.includes("document.getElementById('editor-active-canvas')"), 'fallback ambil dari kanvas komposisi');
  ok(cpCode.includes("window.addEventListener('pointerdown', onDown, true)"), 'intersepsi capture sebelum drag layer');
  ok(cpCode.includes('getImageData(px, py, 1, 1)'), 'sampling 1px via getImageData');
  ok(cpCode.includes('rgbToHex(d[0], d[1], d[2])'), 'sampel dikonversi ke hex');
  ok(cpCode.includes("e.key === 'Escape'"), 'ESC membatalkan mode pick');
  ok(cpCode.includes('_disarmCanvasPick'), 'disarm melepas listener + badge + kursor');
  ok(cpCode.includes('konten eksternal'), 'kanvas tercemar ditangani jujur');
  ok(cpCode.includes(':not(.color-picker-tab-btn)'), 'binding eyedropper tunggal (tanpa dobel-pick)');
}

// ----------------------------------------------------------
console.log('\n[3] Arah gradien');
{
  ok(editorHtml.includes('id="fill-grad-dir-pad"'), 'HTML: pad arah');
  ok(editorHtml.includes('id="fill-grad-angle"'), 'HTML: slider sudut');
  ok(editorHtml.includes('id="fill-grad-angle-val"'), 'HTML: tampilan sudut');
  ok(editorHtml.includes('id="fill-grad-dir-arrow"'), 'HTML: panah arah');
  ok(ctrlCss.includes('.fill-grad-dir-pad'), 'CSS: pad arah');
  ok(ctrlCss.includes('.fill-grad-angle-slider'), 'CSS: slider sudut');
  ok(editorCode.includes('function applyGradAngle(layer, angleDeg, commit)'), 'applyGradAngle ada');
  ok(editorCode.includes('function syncGradDirectionUI(layer)'), 'syncGradDirectionUI ada');
  ok(editorCode.includes('function initGradDirectionControls()'), 'init Grad controls ada');
  ok(editorCode.includes('Math.atan2(dx, -dy)'), 'seret pad → sudut (konvensi CSS)');
  ok(editorCode.includes('linear-gradient(${a}deg'), 'pratinjau pad cocok render kanvas');
  ok(editorCode.includes('rotate(${a - 90}deg)'), 'panah diputar sesuai sudut');
  ok(editorCode.includes('syncGradDirectionUI(layer);\n      syncGradCustomColorUI(layer);'), 'render handles sinkronkan kontrol arah');
  ok(editorCode.includes("e.key === 'ArrowRight'"), 'keyboard atas/bawah/kiri/kanan');
}

// ----------------------------------------------------------
console.log('\n[4] Warna custom stop gradien');
{
  ok(editorHtml.includes('id="fill-grad-custom-color"'), 'HTML: input color native');
  ok(editorHtml.includes('id="fill-grad-custom-hex"'), 'HTML: kolom hex');
  ok(editorHtml.includes('id="fill-grad-more-color"'), 'HTML: tombol picker lengkap');
  ok(editorHtml.includes('id="fill-grad-stop-num"'), 'HTML: nomor stop aktif');
  ok(ctrlCss.includes('.fill-grad-custom-row'), 'CSS: baris custom');
  ok(editorCode.includes('function applyGradStopColor(layer, hex, commit)'), 'applyGradStopColor ada');
  ok(editorCode.includes('/^#[0-9a-fA-F]{3}$/'), 'validasi hex 3-digit');
  ok(editorCode.includes('/^#[0-9a-fA-F]{6}$/'), 'validasi hex 6-digit');
  ok(editorCode.includes('function syncGradCustomColorUI(layer)'), 'syncGradCustomColorUI ada');
  ok(editorCode.includes('syncGradCustomColorUI(layer);'), 'ganti stop aktif sinkronkan baris custom');
  ok(editorCode.includes('initGradDirectionControls();'), 'initFillController pasang binding');
}

// ----------------------------------------------------------
console.log(`\nColor-gradient: ${passed} lolos, ${failed} gagal.`);
if (failed > 0) process.exit(1);
