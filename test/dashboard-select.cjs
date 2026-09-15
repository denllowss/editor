/**
 * Test regresi dashboard (v0.15.0):
 * [1] Fix "Remove project" dari tahan-lama: modal tak lagi dibunuh popstate basi.
 * [2] Multi-select daftar project: markup, logika, gaya, dan pengaman mode.
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

const modalCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'modal.js'), 'utf8');
const ctxCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'context-menu.js'), 'utf8');
const mainCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'main.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const layoutCss = fs.readFileSync(path.join(ROOT, 'public', 'css', 'layout.css'), 'utf8');

// ----------------------------------------------------------
console.log('\n[1] Fix modal dibunuh popstate basi (Remove project)');
{
  ok(modalCode.includes('this._openedAt = Date.now()'), 'Modal.open mencatat waktu buka');
  ok(modalCode.includes('Date.now() - this._openedAt < 250'), 'popstate <250ms diabaikan');
  ok(ctxCode.includes('close(false)'), 'tap item menu tutup tanpa back() dulu');
  ok(ctxCode.includes("querySelector('.modal-backdrop.is-active')"), 'back() dilewati bila modal baru terbuka');
  ok(ctxCode.includes('contextMenuOpen') && ctxCode.includes('history.back()'), 'entry history dibersihkan bila tanpa modal');
}

// ----------------------------------------------------------
console.log('\n[2] Multi-select: markup');
{
  ok(indexHtml.includes('id="btn-toggle-select"'), 'tombol Pilih ada');
  ok(indexHtml.includes('id="projects-selectbar"'), 'bilah aksi mode pilih ada');
  ok(indexHtml.includes('id="btn-select-cancel"'), 'tombol Batal ada');
  ok(indexHtml.includes('id="btn-select-all"'), 'tombol Semua ada');
  ok(indexHtml.includes('id="btn-select-delete"'), 'tombol Hapus borongan ada');
  ok(indexHtml.includes('id="projects-count-label"'), 'label hitungan ada');
}

// ----------------------------------------------------------
console.log('\n[3] Multi-select: logika main.js');
{
  ok(mainCode.includes('selectedProjectIds'), 'Set id terpilih ada');
  ok(mainCode.includes('function setSelectionMode'), 'setSelectionMode ada');
  ok(mainCode.includes('function toggleProjectSelected'), 'toggleProjectSelected ada');
  ok(mainCode.includes('function selectAllProjects'), 'selectAllProjects ada');
  ok(mainCode.includes('function openDeleteModalMulti'), 'openDeleteModalMulti ada');
  ok(mainCode.includes('function confirmMultiDeleteProjects'), 'confirmMultiDeleteProjects ada');
  ok(mainCode.includes('pendingMultiDeleteIds'), 'cabang konfirmasi borongan ada');
  ok(mainCode.includes('window.DashboardSelection'), 'API DashboardSelection diekspos');
  ok(mainCode.includes('initDashboardSelection()'), 'init dipanggil saat DOMContentLoaded');
}

// ----------------------------------------------------------
console.log('\n[4] Multi-select: pengaman mode & gaya');
{
  ok(mainCode.includes('if (selectionMode) return [];'), 'menu tahan-lama mati saat mode pilih');
  ok(mainCode.includes('if (selectionMode) return; // swipe mati'), 'swipe mati saat mode pilih');
  ok(mainCode.includes('tap = centang, bukan navigasi'), 'tap kartu jadi centang saat mode pilih');
  ok(mainCode.includes('select-check'), 'template kartu memuat lingkaran cek');
  ok(layoutCss.includes('#panel-local-projects.is-selecting .select-check'), 'CSS cek tampil saat mode pilih');
  ok(layoutCss.includes('.project-swipe-container.is-selected'), 'CSS kartu terpilih ada');
  ok(layoutCss.includes('.selectbar-btn-danger'), 'CSS tombol hapus danger ada');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
