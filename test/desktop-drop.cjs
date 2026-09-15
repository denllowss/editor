/**
 * Test drag & drop file langsung di desktop (v0.12.0).
 *
 * - Logika desktop-drop.js di VM Node: gerbang lebar, veil, anti-navigasi,
 *   anti-impor-ganda zona, impor langsung ke timeline, ringkasan file.
 * - Statis: veil + script di editor.html, aturan CSS, ekspos impor editor.js.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUBLIC = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');
const css = fs.readFileSync(path.join(PUBLIC, 'css', 'layout-styles.css'), 'utf8');
const editor = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');
const jsCode = fs.readFileSync(path.join(PUBLIC, 'js', 'desktop-drop.js'), 'utf8');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

// ----------------------------------------------------------
// Sandbox VM
// ----------------------------------------------------------
function makeSandbox(width) {
  const veilClasses = new Set();
  const titleEl = { textContent: '' };
  const descEl = { textContent: '' };
  const veil = {
    classList: {
      add: (c) => veilClasses.add(c),
      remove: (c) => veilClasses.delete(c),
      contains: (c) => veilClasses.has(c),
    },
    setAttribute: () => {},
    querySelector: (sel) => (sel === '#desktop-drop-title' ? titleEl
      : sel === '#desktop-drop-desc' ? descEl : null),
  };
  const listeners = {};
  const imports = [];
  const toasts = [];
  const sb = {
    console, Math, Object, Array, JSON,
    innerWidth: width,
    innerHeight: 800,
    addEventListener: (ev, fn) => { listeners[ev] = fn; },
    showEffectsRackToast: (m) => toasts.push(m),
    handleDropFilesWithAction: (...a) => { imports.push(a); return Promise.resolve(true); },
    document: {
      getElementById: (id) => (id === 'desktop-drop-veil' ? veil : null),
    },
  };
  sb.globalThis = sb;
  sb.window = undefined;
  vm.createContext(sb);
  vm.runInContext(jsCode, sb, { filename: 'desktop-drop.js' });
  return { sb, DD: sb.DesktopDrop, veil, veilClasses, titleEl, descEl, listeners, imports, toasts };
}

function fakeEvent({ zone = false, files = null, x = 100, y = 100 } = {}) {
  return {
    _pd: false,
    preventDefault() { this._pd = true; },
    target: { closest: () => (zone ? {} : null) },
    dataTransfer: files === null
      ? { files: [], types: [] }
      : { files, types: ['Files'], dropEffect: '' },
    clientX: x,
    clientY: y,
  };
}
const F = (name, type) => ({ name, type });

// ----------------------------------------------------------
console.log('\n[1] Gerbang desktop');
{
  ok(makeSandbox(1023).DD.enabled() === false, '1023 nonaktif');
  ok(makeSandbox(1024).DD.enabled() === true, '1024 aktif');
  const t = makeSandbox(1440);
  ok(t.DD.MIN_WIDTH === 1024, 'ambang 1024');
  ok(['dragenter', 'dragover', 'dragleave', 'drop', 'dragend'].every((e) => typeof t.listeners[e] === 'function'),
    '5 listener window terpasang');
}

// ----------------------------------------------------------
console.log('\n[2] Veil saat seret file');
{
  const t = makeSandbox(1440);
  const e = fakeEvent({ files: [F('a.mp4', 'video/mp4')] });
  t.DD.onDragEnter(e);
  ok(e._pd === true, 'dragenter preventDefault');
  ok(t.veilClasses.has('is-active'), 'veil tampil');
  ok(t.titleEl.textContent.includes('1 video'), `judul dihitung (${t.titleEl.textContent})`);

  const z = makeSandbox(1440);
  z.DD.onDragEnter(fakeEvent({ zone: true, files: [F('a.mp4', 'video/mp4')] }));
  ok(!z.veilClasses.has('is-active'), 'di atas zona: veil sembunyi');

  const n = makeSandbox(1440);
  n.DD.onDragEnter(fakeEvent({ files: null }));
  ok(!n.veilClasses.has('is-active'), 'tanpa file: veil sembunyi');

  const d = makeSandbox(800);
  const ed = fakeEvent({ files: [F('a.mp4', 'video/mp4')] });
  d.DD.onDragEnter(ed);
  ok(ed._pd === false && !d.veilClasses.has('is-active'), 'tablet: diabaikan total');
}

// ----------------------------------------------------------
console.log('\n[3] Anti-navigasi browser');
{
  const t = makeSandbox(1440);
  const e = fakeEvent({ files: [F('a.mp4', 'video/mp4')] });
  t.DD.onDragOver(e);
  ok(e._pd === true && e.dataTransfer.dropEffect === 'copy', 'dragover cegah + copy');
  const e2 = fakeEvent({ files: null });
  t.DD.onDragOver(e2);
  ok(e2._pd === true, 'dragover tanpa file tetap dicegah');
  t.DD.onDragEnter(fakeEvent({ files: [F('a.mp4', 'video/mp4')] }));
  t.DD.onDragOver(fakeEvent({ zone: true, files: [F('a.mp4', 'video/mp4')] }));
  ok(!t.veilClasses.has('is-active'), 'geser ke zona: veil sembunyi');
  t.DD.onDragLeave(fakeEvent({}));
  ok(!t.veilClasses.has('is-active'), 'dragleave: veil sembunyi');
}

// ----------------------------------------------------------
console.log('\n[4] Drop impor langsung (anti-ganda)');
{
  const t = makeSandbox(1440);
  const files = [F('a.mp4', 'video/mp4'), F('b.png', 'image/png')];
  const e = fakeEvent({ files });
  t.DD.onDrop(e);
  ok(e._pd === true, 'drop preventDefault');
  ok(t.imports.length === 1, 'impor dipanggil sekali');
  ok(t.imports[0][1] === 'import-media' && t.imports[0][2] === true, 'aksi import-media + ke timeline');
  ok(t.imports[0][0].length === files.length && t.imports[0][0][0] === files[0] && t.imports[0][0][1] === files[1], 'berkas diteruskan utuh');
  ok(!t.veilClasses.has('is-active'), 'veil sembunyi usai drop');

  const z = makeSandbox(1440);
  z.DD.onDrop(fakeEvent({ zone: true, files }));
  ok(z.imports.length === 0, 'drop di zona: modul diam (zona menangani)');

  const n = makeSandbox(1440);
  n.DD.onDrop(fakeEvent({ files: null }));
  ok(n.imports.length === 0, 'drop tanpa file: diam');

  const d = makeSandbox(800);
  const ed = fakeEvent({ files });
  d.DD.onDrop(ed);
  ok(ed._pd === false && d.imports.length === 0, 'tablet: diabaikan total');
}

// ----------------------------------------------------------
console.log('\n[5] Ringkasan & impor tak siap');
{
  const { DD } = makeSandbox(1440);
  ok(DD.summarizeFiles([F('a.mp4', 'video/mp4')]).label === '1 video', 'label 1 video');
  ok(DD.summarizeFiles([F('a.png', ''), F('b.jpg', '')]).label === '2 foto', 'label 2 foto');
  ok(DD.summarizeFiles([F('a.mp3', 'audio/mpeg')]).label === '1 audio', 'label 1 audio');
  ok(DD.summarizeFiles([F('a.mp4', ''), F('b.mp3', '')]).label === '2 file', 'label campuran');
  const t = makeSandbox(1440);
  t.sb.handleDropFilesWithAction = undefined;
  ok(t.DD.importFiles([F('a.mp4', '')]) === false, 'tanpa handler → false');
  ok(t.toasts.length === 1, 'tanpa handler → toast ramah');
}

// ----------------------------------------------------------
console.log('\n[6] Wiring statis');
{
  ok((html.match(/id="desktop-drop-veil"/g) || []).length === 1, 'veil tepat 1x');
  ok(html.includes('id="desktop-drop-title"') && html.includes('id="desktop-drop-desc"'), 'judul + deskripsi veil');
  ok(html.includes('aria-hidden="true"'), 'veil default tersembunyi');
  ok((html.match(/<script src="js\/desktop-drop\.js"><\/script>/g) || []).length === 1, 'script modul 1x');
  ok(html.indexOf('js/layout-styles.js') < html.indexOf('js/desktop-drop.js'), 'modul setelah layout-styles');
  ok(css.includes('.desktop-drop-veil'), 'CSS veil ada');
  ok(css.includes('.desktop-drop-veil.is-active'), 'CSS status aktif ada');
  ok(/@media \(max-width: 1023px\)[\s\S]{0,300}\.desktop-drop-veil/.test(css), 'veil mati di bawah 1024');
  ok(editor.includes('window.handleDropFilesWithAction = handleDropFilesWithAction'),
    'editor.js ekspos fungsi impor');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
