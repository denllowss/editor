/**
 * Test drag mulus di mobile (v0.17.0):
 * [1] CSS: kanvas + pad + dial tidak direbut browser (touch-action dkk).
 * [2] Rect kanvas dibekukan per gestur (tanpa reflow tiap move).
 * [3] Sampel sentuh terbaru (coalesced) saat drag kanvas.
 * [4] Sinkron panel Transform digabung 1x/frame + flush saat lepas.
 * [5] recordLayerPropertyChange ringan saat gestur (invalidate ditunda,
 *     refresh timeline/graph digabung via rAF).
 * [6] Move Pad: sensitivitas dibekukan (tanpa reflow tiap move).
 * [7] Rotate Dial: render digabung via rAF + flush saat lepas.
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
const editorCss = fs.readFileSync(path.join(ROOT, 'public', 'css', 'editor.css'), 'utf8');
const ctrlCss = fs.readFileSync(path.join(ROOT, 'public', 'css', 'transform-controller.css'), 'utf8');
const count = (s, sub) => s.split(sub).length - 1;

// ----------------------------------------------------------
console.log('\n[1] CSS anti-rebut gestur');
{
  const canvasRule = editorCss.slice(editorCss.indexOf('.editor-active-canvas {'), editorCss.indexOf('.editor-active-canvas {') + 500);
  ok(canvasRule.includes('touch-action: none'), 'kanvas: touch-action none');
  ok(canvasRule.includes('-webkit-touch-callout: none'), 'kanvas: tanpa callout iOS');
  ok(canvasRule.includes('-webkit-tap-highlight-color: transparent'), 'kanvas: tanpa sorot tap');
  ok(canvasRule.includes('-webkit-user-select: none'), 'kanvas: tanpa seleksi teks iOS');
  ok(ctrlCss.includes('-webkit-touch-callout: none'), 'pad/dial: tanpa callout iOS');
}

// ----------------------------------------------------------
console.log('\n[2] Cache rect kanvas per gestur');
{
  ok(editorCode.includes('let cachedCanvasRect = null'), 'variabel cache dideklarasikan');
  ok(editorCode.includes('cachedCanvasRect = activeCanvasEl.getBoundingClientRect()'), 'rect dibekukan saat pointerdown');
  ok(editorCode.includes('(activeOp && cachedCanvasRect) ? cachedCanvasRect'), 'move pakai rect beku');
  ok(count(editorCode, 'cachedCanvasRect = null') >= 2, 'cache dibersihkan saat gestur selesai');
}

// ----------------------------------------------------------
console.log('\n[3] Coalesced events');
{
  ok(editorCode.includes("const moveEvts = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : null"),
    'pointermove baca sampel coalesced');
  ok(editorCode.includes('moveEvts[moveEvts.length - 1]'), 'posisi pakai sampel terbaru');
}

// ----------------------------------------------------------
console.log('\n[4] Throttle sinkron panel Transform');
{
  ok(editorCode.includes('function requestTransformUiSync(extraFn)'), 'helper throttle ada');
  ok(editorCode.includes('function flushTransformUiSync()'), 'helper flush ada');
  ok(count(editorCode, 'requestTransformUiSync(') >= 7, 'semua cabang drag pakai throttle (moveAnchor/move/kamera/scale/shape)');
  ok(editorCode.includes('if (didMove) flushTransformUiSync();'), 'flush sinkron saat pointerup');
  // Tidak ada lagi panggil sync langsung di handler pointermove kanvas
  const moveStart = editorCode.indexOf("window.addEventListener('pointermove', (e) => {");
  const moveEnd = editorCode.indexOf('const onPointerEnd = (e) => {');
  const moveBody = editorCode.slice(moveStart, moveEnd);
  ok(!moveBody.includes('syncTransformControllerValues();') || moveBody.includes('requestTransformUiSync'),
    'handler move tidak sync langsung tiap event');
  ok(!/[^a-zA-Z]syncShapeControllerUI\(\);/.test(moveBody.replace('requestTransformUiSync(syncShapeControllerUI)', '')),
    'handler move tidak sync shape langsung tiap event');
}

// ----------------------------------------------------------
console.log('\n[5] recordLayerPropertyChange ringan');
{
  ok(editorCode.includes('function requestDeferredRecordUi()'), 'helper refresh rAF ada');
  ok(editorCode.includes('requestDeferredRecordUi();'), 'cabang keyframe pakai refresh rAF');
  ok(editorCode.includes('const _inGesture = !!window.isTransformInteracting'), 'status gestur dibaca');
  ok(count(editorCode, '!_inGesture && typeof invalidatePreviewCacheForLayer') === 2, 'kedua invalidate ditunda saat gestur');
  ok(editorCode.includes('updateTimelineKeyframeMarkersHighlight'), 'highlight marker ikut di-refresh');
}

// ----------------------------------------------------------
console.log('\n[6] Move Pad tanpa reflow');
{
  ok(editorCode.includes('let padSensX = 1'), 'variabel sensitivitas beku ada');
  ok(editorCode.includes('padSensX = Math.max(0.5, Math.min(1.2, _srX * 0.35))'), 'sensitivitas dihitung saat pointerdown');
  const padMoveStart = editorCode.indexOf("movePad.addEventListener('pointermove'");
  const padMoveEnd = editorCode.indexOf('const onMoveEnd = (e) => {');
  const padMoveBody = editorCode.slice(padMoveStart, padMoveEnd);
  ok(!padMoveBody.includes('getBoundingClientRect'), 'handler move pad tanpa getBoundingClientRect');
}

// ----------------------------------------------------------
console.log('\n[7] Rotate Dial via rAF');
{
  ok(editorCode.includes('function requestRotateRedraw()'), 'helper rAF dial ada');
  ok(editorCode.includes('function flushRotateRedraw()'), 'helper flush dial ada');
  ok(editorCode.includes('requestRotateRedraw();'), 'move dial pakai rAF');
  ok(editorCode.includes('flushRotateRedraw();'), 'flush dial saat lepas');
}

// ----------------------------------------------------------
console.log(`\nTouch-drag: ${passed} lolos, ${failed} gagal.`);
if (failed > 0) process.exit(1);
