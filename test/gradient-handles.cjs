/**
 * Test regresi Gradient Fase 1 — handle kanvas + editor multi-stop (v0.26.0):
 * [1] Helper geometri ternormalisasi + objek GradientGeom (affine/invers/handle).
 * [2] Ekspos window.* lintas-IIFE.
 * [3] Cabang render fill memakai titik ternormalisasi + stop rgba.
 * [4] Overlay panah di wireframe (drawGradientHandles) + kait render non-ekspor.
 * [5] Jalur pointer: hit-test A0, op 'gradient', reset handle saat pointerup.
 * [6] Panel: slider opacity, input offset, readout S/E, baris preset.
 * [7] CSS kelas-kelas baru.
 * [8] Logika preset (bawaan + localStorage, hapus tekan-tahan).
 * [9] Kompatibel lama: tri-state tipe + sudut + stops lama tetap didukung.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const editorCode = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');
const wireCode = fs.readFileSync(path.join(PUBLIC, 'js', 'wireframe.js'), 'utf8');
const editorHtml = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');
const css = fs.readFileSync(path.join(PUBLIC, 'css', 'transform-controller.css'), 'utf8');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

// [1] Helper geometri
console.log('[1] Helper geometri ternormalisasi');
ok(editorCode.includes('function gradDefaultPoints('), 'gradDefaultPoints ada');
ok(editorCode.includes('function ensureGradPoints('), 'ensureGradPoints ada');
ok(editorCode.includes('function gradPointsForRender('), 'gradPointsForRender ada');
ok(editorCode.includes('function gradAngleFromPoints('), 'gradAngleFromPoints ada');
ok(editorCode.includes('function stopToRgba('), 'stopToRgba ada');
ok(editorCode.includes('const GradientGeom = {'), 'objek GradientGeom ada');
ok(editorCode.includes('affineFromCorners'), 'GradientGeom.affineFromCorners ada');
ok(editorCode.includes('invert(') || editorCode.includes('invert(m)'), 'GradientGeom.invert ada');
ok(editorCode.includes('handlePositions('), 'GradientGeom.handlePositions ada');
ok(editorCode.includes('toBuffer('), 'GradientGeom.toBuffer ada');

// [2] Ekspos lintas-IIFE
console.log('[2] Ekspos window.*');
['GradientGeom', 'stopToRgba', 'gradPointsForRender', 'ensureGradPoints',
 'gradAngleFromPoints', 'gradDefaultPoints', 'syncGradDirectionUI',
 'applyGradStopOpacity', 'applyGradStopOffset'].forEach((name) => {
  ok(editorCode.includes(`window.${name} =`), `window.${name} diekspos`);
});

// [3] Cabang render
console.log('[3] Cabang render fill gradient');
ok(editorCode.includes('window.gradPointsForRender(layer, angleDeg'), 'render pakai titik ternormalisasi');
ok(editorCode.includes('window.stopToRgba(s)'), 'render pakai stop rgba');
ok(editorCode.includes('createLinearGradient(gp.sx'), 'linear dari titik S/E');
ok(/radial[\s\S]{0,400}?gp\.ex/.test(editorCode), 'radial dari titik S/E');
ok(/conic|createConicGradient/.test(editorCode), 'sweep/conic didukung');

// [4] Overlay wireframe
console.log('[4] Overlay panah wireframe');
ok(wireCode.includes('drawGradientHandles'), 'drawGradientHandles didefinisikan di wireframe.js');
ok(editorCode.includes('drawGradientHandles('), 'renderCanvasFrame memanggil drawGradientHandles');
{
  const idx = editorCode.indexOf('drawGradientHandles(p0');
  const idx2 = editorCode.indexOf('drawGradientHandles(');
  const callIdx = idx >= 0 ? idx : idx2;
  const guardWindow = editorCode.slice(Math.max(0, callIdx - 2000), callIdx);
  ok(guardWindow.includes('!isExport'), 'overlay di dalam blok guard !isExport');
}
ok(editorCode.includes('window.activeGradHandle'), 'status handle aktif via window.activeGradHandle');

// [5] Jalur pointer
console.log('[5] Jalur pointer A0 + op gradient');
ok(editorCode.includes("// A0. Gradient handles"), 'marker jalur A0 ada');
ok(editorCode.includes("activeOp = 'gradient'"), "op 'gradient' diset saat hit-test");
ok(editorCode.includes("activeOp === 'gradient'"), "cabang move untuk op 'gradient' ada");
ok(editorCode.includes('window.activeGradHandle = null'), 'reset handle saat pointerup');
ok(editorCode.includes('gradHandle: hitG'), 'startLayerState simpan handle yang di-drag');

// [6] Panel HTML
console.log('[6] Panel HTML');
['fill-grad-stop-opacity', 'fill-grad-stop-opacity-val', 'fill-grad-stop-offset',
 'fill-grad-points-readout', 'fill-grad-presets-grid', 'fill-grad-preset-save',
 'fill-grad-preset-save', 'fill-grad-opacity-row', 'fill-grad-presets-row'].forEach((id) => {
  ok(editorHtml.includes(`id="${id}"`), `#${id} ada`);
});

// [7] CSS
console.log('[7] CSS');
['.fill-grad-stop-offset', '.fill-grad-points-readout', '.fill-grad-opacity-row',
 '.fill-grad-stop-opacity', '.fill-grad-presets-grid', '.fill-grad-preset',
 '.fill-grad-preset-save'].forEach((cls) => {
  ok(css.includes(cls), `${cls} ada`);
});

// [8] Preset
console.log('[8] Logika preset');
ok(editorCode.includes('fishtool_grad_presets'), 'kunci localStorage preset ada');
ok(editorCode.includes('function gradBuiltinPresets('), 'gradBuiltinPresets ada');
ok(editorCode.includes('function gradCustomPresets('), 'gradCustomPresets ada');
ok(editorCode.includes('function renderGradPresets('), 'renderGradPresets ada');
ok(editorCode.includes('function saveGradPreset('), 'saveGradPreset ada');
ok(editorCode.includes('slice(0, 12)'), 'batas 12 preset custom');

// [9] Kompatibel lama
console.log('[9] Kompatibel lama');
ok(editorHtml.includes('data-grad-type="linear"'), 'tipe linear tetap ada');
ok(editorHtml.includes('data-grad-type="radial"'), 'tipe radial tetap ada');
ok(editorHtml.includes('data-grad-type="sweep"'), 'tipe sweep tetap ada');
ok(editorCode.includes('fillGradColor1') && editorCode.includes('fillGradColor2'), 'stops lama (color1/2) tetap dibaca');
ok(editorCode.includes('fillGradAngle'), 'sudut lama (fillGradAngle) tetap didukung');
ok(editorCode.includes('applyGradAngle'), 'slider sudut tetap berfungsi');

// ----------------------------------------------------------
console.log(`\nGradient Fase 1: ${passed} lolos, ${failed} gagal.`);
if (failed > 0) process.exit(1);
