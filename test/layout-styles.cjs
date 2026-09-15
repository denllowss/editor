/**
 * Test gaya tampilan editor per tipe perangkat (v0.11.0).
 *
 * - Logika layout-styles.js di VM Node: batas device, default, persistensi,
 *   validasi, paritas konstanta dengan snippet pra-render.
 * - Statis: kategori setting + dropdown + visibilitas opsi di editor.html,
 *   cakupan & pengurungan aturan di layout-styles.css.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUBLIC = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');
const dashHtml = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(PUBLIC, 'css', 'layout-styles.css'), 'utf8');
const jsCode = fs.readFileSync(path.join(PUBLIC, 'js', 'layout-styles.js'), 'utf8');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

// ----------------------------------------------------------
// Sandbox VM: root global + document minimal
// ----------------------------------------------------------
function makeSandbox(width, elements) {
  const mem = {};
  const els = elements || {};
  const sb = {
    console, Math, Object, Array, JSON,
    innerWidth: width,
    localStorage: {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
    },
    setTimeout: (fn) => 0,
    clearTimeout: () => {},
    addEventListener: () => {},
    MutationObserver: undefined,
    document: {
      readyState: 'complete',
      documentElement: { dataset: {} },
      body: null,
      getElementById: (id) => (id in els ? els[id] : null),
      addEventListener: () => {},
    },
  };
  sb.globalThis = sb;
  sb.window = undefined;
  vm.createContext(sb);
  vm.runInContext(jsCode, sb, { filename: 'layout-styles.js' });
  return { sb, mem, LS: sb.LayoutStyles };
}

// ----------------------------------------------------------
console.log('\n[1] Batas kelas perangkat');
{
  const { LS } = makeSandbox(1280);
  ok(LS.deviceClass(599) === 'phone', '599 → phone');
  ok(LS.deviceClass(600) === 'tablet', '600 → tablet');
  ok(LS.deviceClass(1023) === 'tablet', '1023 → tablet');
  ok(LS.deviceClass(1024) === 'desktop', '1024 → desktop');
  ok(LS.deviceClass() === 'desktop', 'default pakai innerWidth');
}

// ----------------------------------------------------------
console.log('\n[2] Default & penerapan atribut');
{
  let t = makeSandbox(1440);
  let r = t.LS.apply();
  ok(r.device === 'desktop' && r.layout === 'after-effects', 'desktop default After Effects');
  ok(t.sb.document.documentElement.dataset.layout === 'after-effects', 'atribut layout terisi');
  ok(t.sb.document.documentElement.dataset.device === 'desktop', 'atribut device terisi');

  t = makeSandbox(800);
  r = t.LS.apply();
  ok(r.device === 'tablet' && r.layout === 'capcut-tablet', 'tablet default CapCut Tablet');

  t = makeSandbox(390);
  r = t.LS.apply();
  ok(r.device === 'phone' && r.layout === 'mobile', 'phone terkunci mobile');
}

// ----------------------------------------------------------
console.log('\n[3] Persistensi & validasi pilihan');
{
  const t = makeSandbox(1280);
  ok(t.LS.setLayout('capcut') === true, 'desktop pilih capcut');
  ok(t.mem.denjimotion_layout_desktop === 'capcut', 'tersimpan di localStorage');
  ok(t.LS.apply().layout === 'capcut', 'diterapkan setelah pilih');
  ok(t.LS.setLayout('capcut-tablet') === false, 'opsi tablet ditolak di desktop');
  ok(t.LS.setLayout('ngawur') === false, 'nilai asing ditolak');
  ok(t.mem.denjimotion_layout_desktop === 'capcut', 'penolakan tak menimpa simpanan');
  ok(t.LS.setLayout('klasik') === true, 'desktop pilih klasik');
  ok(t.mem.denjimotion_layout_desktop === 'klasik', 'klasik desktop tersimpan');

  const p = makeSandbox(390);
  ok(p.LS.setLayout('capcut') === false, 'phone tak bisa pilih');

  const b = makeSandbox(800);
  ok(b.LS.setLayout('klasik') === true, 'tablet pilih klasik');
  ok(b.mem.denjimotion_layout_tablet === 'klasik', 'kunci tablet terpisah');
  ok(b.LS.getSaved('tablet') === 'klasik', 'getSaved baca simpanan');
  ok(b.LS.getSaved('desktop') === 'after-effects', 'kelas lain tetap default');
}

// ----------------------------------------------------------
console.log('\n[4] Label & paritas snippet pra-render');
{
  const { LS } = makeSandbox(1280);
  ok(LS.labelFor('after-effects') === 'After Effects', 'label AE');
  ok(LS.labelFor('capcut-tablet') === 'CapCut Tablet', 'label tablet');
  ok(LS.labelFor('klasik') === 'Klasik', 'label klasik');
  ok(LS.labelFor('ngawur') === '', 'label asing kosong');
  ok(html.includes("'after-effects', 'capcut', 'klasik'"), 'snippet kenal klasik desktop');
  for (const k of [LS.KEYS.desktop, LS.KEYS.tablet]) {
    ok(html.includes(k), `snippet HTML kenal kunci ${k}`);
  }
  ok(html.includes(LS.DEFAULTS.desktop) && html.includes(LS.DEFAULTS.tablet),
    'snippet HTML kenal kedua default');
  ok(/data-device[\s\S]{0,2000}data-layout/.test(html.slice(html.indexOf('pra-render'))), 'snippet tulis kedua atribut');
}

// ----------------------------------------------------------
console.log('\n[5] UI setting pindah ke dasbor (v0.25.0: modal-app-settings)');
{
  ok(!html.includes('id="dropdown-layout-style"'), 'editor tak lagi memuat dropdown');
  ok(!html.includes('id="cat-settings-layout"'), 'editor tak lagi memuat kategori');
  ok((dashHtml.match(/id="dropdown-layout-style"/g) || []).length === 1, 'dropdown tepat 1x di dasbor');
  ok((dashHtml.match(/id="cat-settings-layout"/g) || []).length === 1, 'kategori tepat 1x di dasbor');
  const iModal = dashHtml.indexOf('id="modal-app-settings"');
  const iCat = dashHtml.indexOf('id="cat-settings-layout"');
  ok(iModal > 0 && iModal < iCat, 'kategori di dalam modal setting utama');
  ok((dashHtml.match(/data-devices="desktop"/g) || []).length === 2, '2 opsi khusus desktop');
  ok((dashHtml.match(/data-devices="tablet"/g) || []).length === 1, '1 opsi khusus tablet');
  ok(dashHtml.includes('data-val="klasik"') && !/data-val="klasik" data-devices/.test(dashHtml),
    'klasik universal (tanpa data-devices)');
  for (const v of ['after-effects', 'capcut', 'capcut-tablet', 'klasik']) {
    ok(dashHtml.includes(`data-val="${v}"`), `opsi ${v} ada`);
  }
  ok(dashHtml.includes('js/layout-styles.js'), 'modul JS dimuat di dasbor');
  const iResp = html.indexOf('css/responsive.css');
  const iLay = html.indexOf('css/layout-styles.css');
  ok(iResp > 0 && iResp < iLay, 'editor: CSS tetap setelah responsive.css');
  ok(html.includes('js/layout-styles.js'), 'editor: modul JS tetap dimuat (apply saat buka)');
}

// ----------------------------------------------------------
console.log('\n[6] Cakupan layout-styles.css');
{
  for (const l of ['after-effects', 'capcut', 'capcut-tablet', 'klasik']) {
    ok(css.includes(`html[data-layout="${l}"]`), `aturan ${l} ada`);
  }
  ok(css.includes('(orientation: portrait)'), 'klasik bedakan potret/lanskap tablet');
  const klasikLines = css.split('\n').filter((ln) => ln.includes('data-layout="klasik"'));
  ok(klasikLines.length >= 10 && klasikLines.every((ln) => ln.trim().startsWith('html[')),
    `klasik terkungkup penuh (${klasikLines.length} aturan)`);
  ok(!/html\[data-layout="mobile"/.test(css), 'mobile tanpa aturan (tak tersentuh)');
  const cols = (css.match(/flex-direction: column/g) || []).length;
  ok(cols >= 3, `susunan kolom di 3 gaya (${cols})`);
  ok(css.includes('#timeline-layer-drawer.is-docked'), 'dok kanan AE ada');
  ok(css.includes('has-docked-drawer'), 'tiling konten saat dok terbuka');
  ok(css.includes('@media (max-width: 599px)') && css.includes('#cat-settings-layout'),
    'kategori disembunyikan di ponsel');
  ok(css.includes('@media (min-width: 600px) and (max-width: 1023px)'), 'gerbang tablet 600-1023');
  ok(css.includes('@media (min-width: 1024px)'), 'gerbang desktop 1024');
  // Semua sentuhan layout terkungkup data-layout (tanpa efek global)
  const risky = css.split('\n').filter((ln) => {
    const t = ln.trim();
    if (!t || t.startsWith('/*') || t.startsWith('*') || t.startsWith('@media')) return false;
    return /\.editor-(main-body|left-pane|timeline|timeline-wrapper|controller)\b/.test(t)
      || /\.timeline-split-handle\b/.test(t) || /\.drawer-card\b/.test(t);
  });
  ok(risky.length > 0 && risky.every((ln) => ln.includes('data-layout')),
    `semua ${risky.length} sentuhan layout terkungkup data-layout`);
  ok(css.includes('var(--border-subtle)'), 'pakai token tema');
}

// ----------------------------------------------------------
console.log('\n[7] Klik opsi menerapkan realtime');
{
  function fakeItem(val) {
    const handlers = [];
    return {
      dataset: {},
      getAttribute: (n) => (n === 'data-val' ? val : null),
      addEventListener: (ev, fn) => { if (ev === 'click') handlers.push(fn); },
      _fire: () => handlers.forEach((fn) => fn()),
      _count: () => handlers.length,
      classList: { toggle: () => {}, contains: () => false },
    };
  }
  const items = [fakeItem('after-effects'), fakeItem('capcut')];
  const menu = { querySelectorAll: (sel) => (sel === '.custom-dropdown-item' ? items : []) };
  const t = makeSandbox(1280, { 'menu-layout-style': menu });
  t.LS.apply();
  ok(t.sb.document.documentElement.dataset.layout === 'after-effects', 'awal: After Effects');
  items[1]._fire();
  ok(t.sb.document.documentElement.dataset.layout === 'capcut', 'klik CapCut langsung terap');
  ok(t.mem.denjimotion_layout_desktop === 'capcut', 'klik langsung tersimpan');
  items[0]._fire();
  ok(t.sb.document.documentElement.dataset.layout === 'after-effects', 'klik balik langsung terap');
  ok(items[0]._count() === 1 && items[1]._count() === 1, 'binding Tepat sekali per item');
  ok(items[0].dataset.layoutWired === '1', 'flag anti-double-binding terpasang');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
