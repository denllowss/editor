/**
 * Test regresi pilih multi-layer di timeline (v0.22.0):
 * [1] Tahan tombol mata -> mode pilih; tap mata tetap hide/show.
 * [2] Tarik pill atas-bawah -> pilih rentang; tap pill -> toggle satu-satu.
 * [3] Tap ruang kosong -> batal semua (keluar mode pilih).
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const editorCode = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');

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

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
