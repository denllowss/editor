/**
 * Test regresi pilih multi-layer di timeline (v0.22.0):
 * [1] Tahan tombol mata -> mode pilih; tap mata tetap hide/show.
 * [2] Tarik pill atas-bawah -> pilih rentang; tap pill -> toggle satu-satu.
 * [3] Tap ruang kosong -> batal semua (keluar mode pilih).
 * [4] (v0.23.0) Batch: tombol Delete panel + multi-move kanvas + batch cut +
 *     drawer auto-buka saat masuk mode pilih.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const editorCode = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');
const editorHtml = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');
const drawerCss = fs.readFileSync(path.join(PUBLIC, 'css', 'drawer.css'), 'utf8');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

// ----------------------------------------------------------
console.log('\n[1] Tahan tombol mata = mode pilih');
{
  ok(editorCode.includes('tahan 450ms'), 'komentar perilaku tahan mata');
  ok(/eyeHoldTimer = setTimeout\(\(\) => \{[\s\S]{0,600}?isSelectorMode = true;/.test(editorCode), 'timer tahan masuk mode pilih');
  ok(editorCode.includes('selectedLayerIds.add(layer.id)') && editorCode.includes('eyeHoldFired = true'),
    'layer ikut terpilih saat tahan');
  ok(editorCode.includes('if (eyeHoldFired) { eyeHoldFired = false; return; }'), 'klik setelah tahan tak toggle hide');
  ok(editorCode.includes("addEventListener('pointerleave', eyeHoldCancel)"), 'geser keluar membatalkan timer');
  ok(editorCode.includes('layer.hidden = !layer.hidden'), 'tap biasa tetap toggle hide');
}

// ----------------------------------------------------------
console.log('\n[2] Tarik & tap pill');
{
  ok(editorCode.includes('getLayerIndexAtY'), 'rentang tarik via indeks Y');
  ok(editorCode.includes("toggleSelectTimelineLayer(layer.id, true)"), 'tap pill toggle satu-satu');
  ok(/initialSelectedIds = new Set\(\[layer\.id\]\)/.test(editorCode), 'tarik mulai dari layer awal');
}

// ----------------------------------------------------------
console.log('\n[3] Batal via ruang kosong');
{
  ok(editorCode.includes('Stationary tap on empty timeline space'), 'tap kosong terdeteksi');
  ok(/moveDist[\s\S]{0,400}?deselectTimelineLayer\(\)/.test(editorCode), 'tap kosong memanggil deselect');
  ok(/function deselectTimelineLayer\(\)[\s\S]{0,4000}?isSelectorMode = false;/.test(editorCode),
    'deselect keluar dari mode pilih');
  ok(/function deselectTimelineLayer\(\)[\s\S]{0,4000}?selectedLayerIds\.clear\(\)/.test(editorCode),
    'deselect membersihkan pilihan');
}

// ----------------------------------------------------------
console.log('\n[4] Batch multi-pilih: delete panel + multi-move + batch cut');
{
  ok(editorHtml.includes('id="btn-layer-delete"'), 'tombol Delete ada di panel layer');
  ok(editorCode.includes('function deleteSelectedLayers()'), 'fungsi deleteSelectedLayers diekstrak');
  ok(editorCode.includes("getElementById('btn-layer-delete')"), 'tombol panel Delete terhubung');
  ok(drawerCss.includes('.layer-action-btn.is-danger'), 'varian bahaya tombol Delete');
  ok(editorCode.includes('function snapshotMoveFollowers(primaryId)'), 'helper snapshot pengikut');
  ok(editorCode.includes('snapshotMoveFollowers(selectedLayer.id)') && editorCode.includes('snapshotMoveFollowers(l.id)'),
    'snapshot di jalur primer + jalur layer-lain');
  ok(editorCode.includes('const alreadySelected = !!(selectedLayerIds && selectedLayerIds.has(l.id))'),
    'klik kanvas tak runtuhkan multi-select');
  ok(/moveFollowers\.forEach\(\(fs\) => \{[\s\S]{0,500}?fl\.posX = Number\(\(fs\.posX \+ fdx\)/.test(editorCode),
    'pengikut digeser delta dunia yang sama');
  ok(editorCode.includes("window.Drawer.open('timeline-layer-drawer')"), 'drawer dibuka saat masuk mode pilih');
  ok(editorCode.includes('function executeCutForSelection(singleFn)'), 'wrapper batch cut ada');
  ok((editorCode.match(/executeCutForSelection\(execute/g) || []).length === 7, '7 tombol cut lewat wrapper');
}

// ----------------------------------------------------------
console.log('\n[5] Centering tak mengubur lane (v0.24.0)');
{
  ok(editorCode.includes('drawerCoversTimeline'), 'drawer dock-samping diabaikan saat centering');
  ok(editorCode.includes('cardCoversSlotX'), 'overlay hanya bila menutup kolom slot');
  ok(/visibleSpan > slotRect\.height && slotRect\.top >= visibleTop && slotRect\.bottom <= visibleBottom/.test(editorCode),
    'slot terlihat-penuh tak di-scroll (semua layout)');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
