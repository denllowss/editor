/**
 * Regression test for the shape-editor Roundness control.
 * Covers the plugin contour/path pipeline used by the canvas and wireframe.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const context = { console };
context.window = context;
vm.createContext(context);

for (const file of [
  'public/js/shapes.js',
  'public/shapes/rectangle.js',
  'public/shapes/triangle.js',
  'public/shapes/polygon.js'
]) {
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, file), 'utf8'),
    context,
    { filename: file }
  );
}

const registry = context.FishShapesRegistry;
let passed = 0;
let failed = 0;
function ok(condition, label) {
  if (condition) {
    passed++;
    console.log('  ✅ ' + label);
  } else {
    failed++;
    console.log('  ❌ ' + label);
  }
}

console.log('\n[Roundness] plugin defaults and controls');
for (const type of ['rectangle', 'triangle', 'polygon']) {
  const def = registry.get(type);
  ok(!!def, `${type} terdaftar`);
  ok(!!(def && def.controls.roundness), `${type} mengekspos kontrol Roundness`);
  ok(!!(def && Object.prototype.hasOwnProperty.call(def.defaultProps, 'roundness')),
    `${type} memiliki default roundness`);
}

console.log('\n[Roundness] contour changes when the value changes');
const dimensions = { w: 300, h: 240 };
const props = {
  rectangle: { sizeX: 300, sizeY: 240, roundness: 0 },
  triangle: { sizeX: 300, sizeY: 240, step: 3, roundness: 0 },
  polygon: { sizeX: 300, sizeY: 240, sides: 6, roundness: 0 }
};
for (const type of Object.keys(props)) {
  const sharp = registry.getContour(type, props[type], dimensions.w, dimensions.h);
  const roundedProps = { ...props[type], roundness: 36 };
  const rounded = registry.getContour(type, roundedProps, dimensions.w, dimensions.h);
  ok(rounded.length > sharp.length, `${type} menghasilkan contour berbeda saat roundness > 0`);
}

console.log('\n[Roundness] polygon canvas path uses rounded corners');
const calls = [];
const fakeContext = {
  moveTo(...args) { calls.push(['moveTo', ...args]); },
  lineTo(...args) { calls.push(['lineTo', ...args]); },
  quadraticCurveTo(...args) { calls.push(['quadraticCurveTo', ...args]); },
  closePath() { calls.push(['closePath']); }
};
registry.drawPath(
  fakeContext,
  'polygon',
  { sizeX: 300, sizeY: 300, sides: 6, roundness: 36 },
  150,
  150,
  300,
  300
);
ok(calls.filter(call => call[0] === 'quadraticCurveTo').length === 6,
  'polygon drawPath membuat satu kurva di setiap sudut');
ok(calls.some(call => call[0] === 'lineTo'),
  'polygon drawPath mempertahankan segmen lurus antarsudut');

console.log('\n[Roundness] editor binding and persistence hooks');
const editorCode = fs.readFileSync(path.join(ROOT, 'public/js/editor.js'), 'utf8');
ok(editorCode.includes("updateShapeOtherProp('roundness', newR, false)"),
  'drag Roundness menulis shapeProps.roundness');
ok(editorCode.includes('saveCurrentProjectLayers()'),
  'controller memiliki hook penyimpanan setelah drag');
ok(editorCode.includes('Number.isFinite(Number(shapeProps.roundness))'),
  'layer lama mendapat nilai default roundness');
ok(!editorCode.includes("initRound + delta * 0.5"),
  'sensitivitas lama yang sering kembali ke 0 sudah dihapus');
ok(editorCode.includes('Math.round(initRound + delta)'),
  'Roundness tidak dibatasi max pada kontrol UI');
ok(!editorCode.includes('const maxR = Math.min(Number(layer.shapeProps?.sizeX)'),
  'clamp max ukuran shape di jog Roundness sudah dihapus');

console.log(`\nHasil Roundness: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
