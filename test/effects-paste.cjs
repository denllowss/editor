/**
 * Test regresi (v0.20.0):
 * [1] Rename project cepat dari dashboard (modal + menu + aksi).
 * [2] Efek Motion Blur terdaftar (plugin, galeri, smoke).
 * [3] Paste efek ke layer terpilih / semua layer + kompatibilitas targets.
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

const mainCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'main.js'), 'utf8');
const editorCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'editor.js'), 'utf8');
const effectsCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'effects.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const editorHtml = fs.readFileSync(path.join(ROOT, 'public', 'editor.html'), 'utf8');
const rackCss = fs.readFileSync(path.join(ROOT, 'public', 'css', 'effects-rack.css'), 'utf8');
const smokeCode = fs.readFileSync(path.join(ROOT, 'test', 'effects-smoke.cjs'), 'utf8');
const motionCode = fs.readFileSync(path.join(ROOT, 'public', 'effects', 'motion_blur.js'), 'utf8');
const fsmbCode = fs.readFileSync(path.join(ROOT, 'public', 'effects', 'fsmb.js'), 'utf8');
const chromaCode = fs.readFileSync(path.join(ROOT, 'public', 'effects', 'chroma_key.js'), 'utf8');
const lumaCode = fs.readFileSync(path.join(ROOT, 'public', 'effects', 'luma_key.js'), 'utf8');

// ----------------------------------------------------------
console.log('\n[1] Rename project cepat (dashboard)');
{
  ok(indexHtml.includes('id="modal-rename-project"'), 'modal rename ada');
  ok(indexHtml.includes('id="rename-input-name"'), 'input nama rename ada');
  ok(indexHtml.includes('id="rename-project-id"'), 'hidden id rename ada');
  ok(indexHtml.includes('onclick="saveRenameProjectAction()"'), 'tombol simpan rename');
  ok(mainCode.includes("label: 'Rename'"), 'item menu Rename ada');
  ok(mainCode.includes('openRenameModal(projectId, projectName)'), 'menu memanggil openRenameModal');
  ok(mainCode.includes("Modal.open('modal-rename-project')"), 'openRenameModal membuka modal rename');
  ok(mainCode.includes('renameProject(projectId, newName)'), 'save memakai FishDatabase.renameProject');
  ok(mainCode.includes('renderProjects(getVisibleProjects()'), 'daftar di-render ulang sehabis rename');
  ok(mainCode.includes("getElementById('rename-input-name')") && mainCode.includes("key === 'Enter'"), 'Enter di input rename menyimpan');
}

// ----------------------------------------------------------
console.log('\n[2] Efek Motion Blur');
{
  ok(motionCode.includes("id: 'motion-blur'"), 'plugin id motion-blur');
  ok(motionCode.includes("name: 'Motion Blur'"), 'plugin nama Motion Blur');
  ok(motionCode.includes("category: 'movement'"), 'kategori movement');
  ok(motionCode.includes("id: 'length'") && motionCode.includes("id: 'angle'") && motionCode.includes("id: 'samples'"), 'param length/angle/samples');
  ok(editorHtml.includes('<script src="effects/motion_blur.js"></script>'), 'script tag terdaftar');
  ok(editorHtml.includes('data-effect-id="motion-blur"'), 'kartu galeri ada');
  ok(editorHtml.includes('>Motion Blur</span>'), 'nama kartu galeri benar (tercari)');
  ok(smokeCode.includes("{ file: 'motion_blur.js', id: 'motion-blur' }"), 'smoke test mencakup motion-blur');
  ok(fsmbCode.includes("name: 'Motion Blur Pro'"), 'FSMB diganti nama Motion Blur Pro');
  ok(!fsmbCode.includes('FSMB (Motion Blur)'), 'nama lama FSMB habis');
  ok(editorHtml.includes('data-effect-id="fsmb"') && editorHtml.includes('>Motion Blur Pro</span>'), 'kartu galeri FSMB ikut rename');
}

// ----------------------------------------------------------
console.log('\n[3] Registry targets + kompatibilitas');
{
  ok(effectsCode.includes('targets: Array.isArray(def.targets)'), 'register meneruskan targets');
  ok(effectsCode.includes('defaultTargets'), 'defaultTargets ada');
  ok(effectsCode.includes('isApplicable(idOrDef, layerType)'), 'helper isApplicable ada');
  ok(effectsCode.includes('supportedTypes(idOrDef)'), 'helper supportedTypes ada');
  ok(effectsCode.includes("'video', 'image', 'shape', 'text', 'precomp', 'color', 'adjustment'"), 'default = 7 tipe visual');
  ok(!/defaultTargets:\s*\[[^\]]*'(audio|camera|mask)'/.test(effectsCode), 'default mengecualikan audio/kamera/mask');
  ok(chromaCode.includes("targets: ['video', 'image', 'precomp']"), 'chroma-key khusus footage');
  ok(lumaCode.includes("targets: ['video', 'image', 'precomp']"), 'luma-key khusus footage');
  ok(editorCode.includes("doesn't support"), 'pesan tolak efek tak kompatibel');
}

// ----------------------------------------------------------
console.log('\n[4] Paste ke layer terpilih / semua layer');
{
  ok(editorHtml.includes('id="btn-effects-paste-selected"'), 'tombol Paste to Selected ada');
  ok(editorHtml.includes('id="btn-effects-paste-everywhere"'), 'tombol Paste to All Layers ada');
  ok(editorCode.includes('getElementById(\'btn-effects-paste-selected\')'), 'wiring paste-selected');
  ok(editorCode.includes('getElementById(\'btn-effects-paste-everywhere\')'), 'wiring paste-everywhere');
  ok(editorCode.includes('function pasteEffectsDataToLayer(layer, dataToPaste)'), 'helper paste per-layer');
  ok(editorCode.includes('function getEffectsPasteData()'), 'helper ambil data paste');
  ok(editorCode.includes('function formatPasteToast('), 'helper ringkasan toast');
  ok(editorCode.includes('function refreshAfterEffectsPaste(layers)'), 'helper refresh terpadu');
  ok(editorCode.includes('window.selectedLayerIds'), 'paste-selected memakai multi-select');
  ok(editorCode.includes('result.skipped.push'), 'efek tak kompatibel dilewati + dicatat');
  ok(editorCode.includes('markIncompatibleGalleryCards'), 'penanda kartu tak kompatibel');
  ok(rackCss.includes('.effects-gallery-item-card.is-incompatible'), 'CSS redup kartu tak kompatibel');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
