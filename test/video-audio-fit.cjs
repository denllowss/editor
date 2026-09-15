/**
 * Test statis: alat Convert Video→Audio + Fit/Regangkan ke aspek (video & foto).
 *
 * - Tombol Extract Audio di action grid drawer (khusus video).
 * - Baris tombol Pas/Regangkan di pane Scale transform (khusus video & foto).
 * - Wiring editor.js + reuse toolbox window.applyToolboxFitToComp.
 * - Jaminan: ekstraksi TIDAK menghapus layer video (mute + sisip audio).
 * - CSS tombol memakai token tema (tanpa warna hardcode).
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');
const editor = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');
const toolbox = fs.readFileSync(path.join(PUBLIC, 'js', 'openfishtools-controller.js'), 'utf8');
const tcss = fs.readFileSync(path.join(PUBLIC, 'css', 'transform-controller.css'), 'utf8');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}
const count = (s, sub) => (s.match(new RegExp(sub, 'g')) || []).length;

// ----------------------------------------------------------
console.log('\n[1] Tombol Extract Audio di action grid');
{
  ok(count(html, 'id="btn-layer-extract-audio"') === 1, 'tombol tepat 1x');
  const iGrid = html.indexOf('id="layer-action-btn-grid"');
  const iBtn = html.indexOf('id="btn-layer-extract-audio"');
  const iDrawerEnd = html.indexOf('Subview 2: Transform Controller UI');
  ok(iGrid > 0 && iGrid < iBtn && iBtn < iDrawerEnd, 'di dalam action grid drawer');
  ok(html.indexOf('id="btn-layer-effects"') < iBtn && iBtn < html.indexOf('id="btn-layer-beatmark"'), 'urutan: Effects → Extract → Beatmark');
  const tag = html.slice(Math.max(0, iBtn - 120), iBtn + 800);
  ok(tag.includes('layer-action-btn') && tag.includes('<svg') && tag.includes('Extract Audio'), 'gaya + ikon + label');
  ok(tag.includes('tetap ada'), 'tooltip menegaskan video tetap ada');
  ok(tag.includes('display: none'), 'default tersembunyi (khusus video)');
}

// ----------------------------------------------------------
console.log('\n[2] Baris Pas/Regangkan di pane Scale');
{
  ok(count(html, 'id="transform-fit-row"') === 1, 'baris fit tepat 1x');
  ok(count(html, 'id="btn-transform-fit"') === 1, 'tombol Pas 1x');
  ok(count(html, 'id="btn-transform-stretch"') === 1, 'tombol Regangkan 1x');
  const iScale = html.indexOf('id="pane-transform-scale"');
  const iRow = html.indexOf('id="transform-fit-row"');
  const iSkew = html.indexOf('id="pane-transform-skew"');
  ok(iScale > 0 && iScale < iRow && iRow < iSkew, 'di dalam pane Scale (sebelum Skew)');
  const row = html.slice(iRow, iRow + 700);
  ok(row.includes('⤢ Pas') && row.includes('↔ Regangkan'), 'label Pas & Regangkan');
  ok(html.slice(Math.max(0, iRow - 700), iRow).includes('jog-scale-h'), 'tepat di bawah jog Scale');
}

// ----------------------------------------------------------
console.log('\n[3] Wiring editor.js');
{
  ok(editor.includes("getElementById('btn-layer-extract-audio')"), 'ambil tombol extract');
  const w = editor.slice(editor.indexOf('// A2. Extract Audio'), editor.indexOf('// A3. Fit / Regangkan'));
  ok(w.includes('addEventListener') && w.includes('extractAudioFromSelectedVideo()'), 'klik extract → ekstraksi');
  ok(editor.includes("btnExtractAudio.style.display = (layer && layer.type === 'video')"), 'tampil khusus layer video');
  ok(editor.includes('btnExtractAudioD') && editor.includes("fitRowD.style.display = 'none'"), 'deselect sembunyikan tombol+baris');
  ok(editor.includes("wireTransformFitBtn('btn-transform-fit', false)"), 'tombol Pas → fit (false)');
  ok(editor.includes("wireTransformFitBtn('btn-transform-stretch', true)"), 'tombol Regangkan → stretch (true)');
  ok(editor.includes('window.applyToolboxFitToComp(stretch)'), 'pakai toolbox FishTools');
  ok(editor.includes("layer.type === 'video' || layer.type === 'image'") && editor.includes("getElementById('transform-fit-row')"), 'baris fit khusus video & foto');
}

// ----------------------------------------------------------
console.log('\n[4] Toolbox Fit to Comp (reuse, bukan duplikat)');
{
  ok(toolbox.includes('window.applyToolboxFitToComp = applyToolboxFitToComp'), 'diekspos ke window');
  ok(toolbox.includes('selLayer.scaleW = baseW') && toolbox.includes('selLayer.scaleH = baseH'), 'stretch = penuh kanvas');
  ok(toolbox.includes('fitScale') && toolbox.includes('Math.min(baseW / natW, baseH / natH)'), 'fit = jaga aspek');
  ok(toolbox.includes('saveCurrentProjectLayers') && toolbox.includes("redrawComposition('fitToComp')"), 'simpan + redraw');
}

// ----------------------------------------------------------
console.log('\n[5] Jaminan: video TIDAK dihapus saat ekstrak');
{
  const iFn = editor.indexOf('async function extractAudioFromSelectedVideo');
  const body = iFn < 0 ? '' : editor.slice(iFn,
    editor.indexOf('window.extractAudioFromSelectedVideo = extractAudioFromSelectedVideo', iFn));
  ok(body.length > 500, 'badan fungsi ditemukan');
  ok(body.includes('layer.isMuted = true'), 'video di-mute (tetap di timeline)');
  ok(body.includes('newAudioLayer') && body.includes('.saveMedia('), 'audio masuk timeline + media pool');
  ok(body.includes('splice(videoIdx + 1, 0, newAudioLayer)'), 'audio disisip di sebelah video');
  ok(!body.includes('removeLayer') && !body.includes('deleteLayer'), 'tanpa hapus layer');
}

// ----------------------------------------------------------
console.log('\n[6] CSS tombol sesuai tema');
{
  const block = tcss.slice(tcss.indexOf('Fit / Regangkan ke ukuran kanvas'));
  ok(block.includes('.transform-fit-row') && block.includes('.transform-fit-btn'), 'selektor ada');
  ok(block.includes('--color-primary') && block.includes('--bg-canvas') && block.includes('--font-brand'), 'pakai token tema');
  ok(!/#[0-9a-fA-F]{3,8}\b/.test(block) && !/rgba?\s*\(/.test(block), 'tanpa warna hardcode');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
