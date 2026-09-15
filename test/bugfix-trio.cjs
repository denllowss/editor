/**
 * Test regresi trio bug (v0.14.0): hapus project, impor media HP, phantom project.
 *
 * Pelajaran v0.9.x: mock CustomFonts di test MENYEMBUNYIKAN API yang hilang
 * (getAll) sehingga editor.js crash saat init di browser asli. Maka seksi [1]
 * memuat custom-fonts.js ASLI via VM dan menguji kontraknya terhadap SEMUA
 * pemanggilan CustomFonts.* di editor.js — tanpa mock API.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

function loadRealCustomFonts() {
  const code = fs.readFileSync(path.join(ROOT, 'public', 'js', 'custom-fonts.js'), 'utf8');
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'custom-fonts.js' });
  return sandbox.window.CustomFonts || null;
}

// ----------------------------------------------------------
console.log('\n[1] Kontrak API custom-fonts.js ASLI vs editor.js');
{
  let api = null;
  let err = '';
  try {
    api = loadRealCustomFonts();
  } catch (e) {
    err = String((e && e.message) || e);
  }
  ok(!err, 'custom-fonts.js asli termuat tanpa throw', err);
  ok(api && typeof api === 'object', 'window.CustomFonts terekspos');

  // SEMUA method yang dipanggil editor.js harus ada di API asli
  const editorCode = fs.readFileSync(path.join(ROOT, 'public', 'js', 'editor.js'), 'utf8');
  const used = new Set();
  const re = /CustomFonts\.([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(editorCode)) !== null) used.add(m[1]);
  ok(used.size > 0, `editor.js memanggil ${used.size} anggota CustomFonts`, [...used].join(','));
  for (const name of [...used].sort()) {
    if (name === 'builtins') {
      ok(api && Array.isArray(api.builtins), 'CustomFonts.builtins tersedia');
    } else {
      ok(api && typeof api[name] === 'function', `CustomFonts.${name}() tersedia`);
    }
  }

  // Semantik getAll (akar crash init editor)
  const all = api ? api.getAll() : null;
  ok(Array.isArray(all) && all.length >= 12, `getAll() ≥12 font (dapat ${all ? all.length : 0})`);
  ok(all && all.every((e) => e && typeof e.id === 'string' && typeof e.name === 'string' && typeof e.stack === 'string'),
    'setiap entri punya id+name+stack string');
  ok(all && all.every((e) => !e.custom), 'built-in tanpa flag custom');
  ok(api && api.getAll()[0] !== api.getAll()[0], 'getAll() mengembalikan salinan baru');
}

// ----------------------------------------------------------
console.log('\n[2] editor.js anti-phantom (race init)');
{
  const code = fs.readFileSync(path.join(ROOT, 'public', 'js', 'editor.js'), 'utf8');
  ok(code.includes('id: earlyUrlProjectId()'), 'id project diisi SINKRON dari ?id=');
  ok(code.includes("typeof window !== 'undefined'"), 'earlyUrlProjectId aman tanpa window');
  const lockUses = (code.match(/_createProjectPromise/g) || []).length;
  ok(lockUses >= 3, `kunci createProject ganda (${lockUses} kemunculan)`);
  ok(code.includes('idParam || currentProjectState.id ||'), 'init tak menimpa id yang sudah terbentuk');
}

// ----------------------------------------------------------
console.log('\n[3] main.js hapus project terverifikasi');
{
  const code = fs.readFileSync(path.join(ROOT, 'public', 'js', 'main.js'), 'utf8');
  ok(code.includes('Promise.race([attempt, timeout])'), 'hapus dibatasi timeout 5 detik');
  ok(code.includes('getProject(projectId)'), 'hasil hapus DIVERIFIKASI ke DB');
  ok(code.includes('if (deleted)'), 'filter refresh hanya bila terverifikasi');
  ok(code.includes('Gagal menghapus project'), 'toast jujur saat gagal');
  ok(!code.includes("Modal.close('modal-delete-project')"), 'tutup modal terjaga (tanpa argumen-id)');
  ok(code.includes('batal menghapus'), 'guard id kosong dengan toast');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
