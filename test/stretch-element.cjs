/**
 * Test regresi Stretch Element di menu ⋯ layer (v0.24.0):
 * [1] Item menu + centang ada dan terhubung toggle.
 * [2] Toggle batch per layer terpilih + state popover.
 * [3] Op scale: OFF = kunci proporsional, ON = bebas melar.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const editorCode = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');
const editorHtml = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');
const popoverCss = fs.readFileSync(path.join(PUBLIC, 'css', 'popover.css'), 'utf8');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

// ----------------------------------------------------------
console.log('\n[1] Item menu ⋯ + centang');
{
  ok(editorHtml.includes('id="popover-btn-stretch"'), 'item Stretch Element di popover-layer-actions');
  ok(editorHtml.includes('id="popover-stretch-check"'), 'elemen centang ada');
  ok(popoverCss.includes('.popover-menu-item.is-on .popover-menu-check'), 'gaya centang saat ON');
  ok(editorCode.includes("getElementById('popover-btn-stretch')"), 'tombol terhubung ke JS');
}

// ----------------------------------------------------------
console.log('\n[2] Toggle batch + state');
{
  ok(editorCode.includes('function toggleStretchElement()'), 'fungsi toggle ada');
  ok(/function toggleStretchElement\(\)[\s\S]{0,800}?targets\.forEach\(\(l\) => \{ l\.stretchElement = turnOn;/.test(editorCode),
    'toggle berlaku ke semua layer terpilih');
  ok(editorCode.includes('window.toggleStretchElement = toggleStretchElement'), 'toggle diekspos global');
  ok(/3c\. Stretch Element State[\s\S]{0,1200}?classList\.toggle\('is-on'/.test(editorCode),
    'state popover sinkron centang');
  ok(/3c\. Stretch Element State[\s\S]{0,1200}?setAttribute\('disabled', 'true'\)/.test(editorCode),
    'item disabled saat tak ada pilihan');
}

// ----------------------------------------------------------
console.log('\n[3] Kunci proporsional di op scale');
{
  ok(editorCode.includes('targetLayer.stretchElement === false'), 'flag OFF memicu kunci aspek');
  ok(/Stretch Element OFF[\s\S]{0,1500}?newH = Math\.max\(10, newW \/ lockAspect\)/.test(editorCode),
    'tarik tepi horizontal ikut mengunci tinggi');
  ok(/Stretch Element OFF[\s\S]{0,1500}?newW = Math\.max\(10, newH \* lockAspect\)/.test(editorCode),
    'tarik tepi vertikal ikut mengunci lebar');
  ok(/Stretch Element OFF[\s\S]{0,1500}?chosenRatio = Math\.max\(ratioW, ratioH\)/.test(editorCode),
    'tarik sudut ikut rasio dominan');
  ok(editorCode.includes('l.stretchElement !== false'), 'default bawaan = ON (bebas, perilaku lama)');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
