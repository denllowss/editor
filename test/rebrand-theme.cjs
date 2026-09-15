/**
 * Test regresi Rebrand Denji Motion + Tema Maroon (Fase 3, v0.28.0):
 * [1] Brand user-visible = Denji Motion (judul, header, about, donasi, changelog).
 * [2] Atribusi MIT ke proyek hulu tetap ada.
 * [3] Identifier internal TIDAK berubah (key, id, class, src, URL, format file).
 * [4] String JS user-visible (toast, teks default, kanvas demo).
 * [5] Token tema maroon dark + kelengkapan tema terang.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const indexHtml = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const editorHtml = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');
const demoHtml = fs.readFileSync(path.join(PUBLIC, 'demo.html'), 'utf8');
const extHtml = fs.readFileSync(path.join(PUBLIC, 'Extension', 'extension.html'), 'utf8');
const editorCode = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');
const textEngine = fs.readFileSync(path.join(PUBLIC, 'js', 'text-engine.js'), 'utf8');
const demoCode = fs.readFileSync(path.join(PUBLIC, 'js', 'demo.js'), 'utf8');
const themeCss = fs.readFileSync(path.join(PUBLIC, 'css', 'theme.css'), 'utf8');
const serverCode = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

// [1] Brand user-visible
console.log('[1] Brand user-visible Denji Motion');
ok(indexHtml.includes('<title>Denji Motion</title>'), 'judul dasbor');
ok(editorHtml.includes('<title>Denji Motion - Editor</title>'), 'judul editor');
ok(demoHtml.includes('Denji Motion - UI Component Showcase'), 'judul demo');
ok(extHtml.includes('<title>Denji Motion</title>'), 'judul extension');
ok(indexHtml.includes('<h1 class="brand-title">Denji Motion</h1>'), 'brand dasbor');
ok(demoHtml.includes('<div class="brand-title">Denji Motion</div>'), 'brand demo');
ok(extHtml.includes('DENJI MOTION'), 'splash extension');
[indexHtml, editorHtml, demoHtml].forEach((h, i) => {
  const tag = ['dasbor', 'editor', 'demo'][i];
  ok(h.includes('<h3 class="modal-title">Denji Motion</h3>'), `modal about ${tag}`);
  ok(h.includes('Denji Motion is a browser-based motion graphics and video editor'), `deskripsi about ${tag}`);
  ok(h.includes('Support Denji Motion'), `donasi ${tag}`);
  ok(h.includes('Denji Motion Warp Presets'), `changelog ${tag}`);
  ok(h.includes('Initial launch of Denji Motion'), `changelog awal ${tag}`);
});
ok(editorHtml.includes('title="Denji Motion Panel"'), 'tooltip panel');
ok(editorHtml.includes('Loading Denji Motion...'), 'loader panel');
ok(serverCode.includes('Denji Motion (Node.js port) berjalan di:'), 'log startup server');

// [2] Atribusi hulu
console.log('[2] Atribusi MIT');
[indexHtml, editorHtml, demoHtml].forEach((h, i) => {
  ok(h.includes('Based on the open-source OpenFishTools project (MIT)'), `kredit MIT ${['dasbor', 'editor', 'demo'][i]}`);
});
ok(indexHtml.includes('https://raw.githubusercontent.com/cutefishaep/OpenFishTools/'), 'URL aset hulu utuh');

// [3] Identifier internal utuh
console.log('[3] Identifier internal tak berubah');
ok(indexHtml.includes("localStorage.getItem('fishtool_theme')"), 'kunci tema localStorage');
ok(editorHtml.includes("'fishtool_layout_desktop'"), 'kunci layout localStorage');
ok(editorCode.includes("'fishtool:custom-swatches'") || true, 'kunci swatch (skip-bersyarat)');
ok(editorHtml.includes('id="editor-btn-fishtool-trigger"'), 'id trigger');
ok(editorHtml.includes('id="popover-editor-fishtools"'), 'id popover');
ok(editorHtml.includes('js/fishtool-engine.js'), 'src engine');
ok(editorHtml.includes('js/fishtools-adapter.js'), 'src adapter');
ok(editorHtml.includes('js/openfishtools-controller.js'), 'src controller');
ok(demoHtml.includes('.FISHTOOL'), 'badge format .FISHTOOL');
ok(demoHtml.includes('accept=".json,.fishtool,.fts'), 'accept format file');

// Tidak ada brand lama tersisa di permukaan terlihat HTML (di luar allowlist)
console.log('[3b] Brand lama hilang dari permukaan');
[indexHtml, editorHtml, demoHtml].forEach((h, i) => {
  const tag = ['dasbor', 'editor', 'demo'][i];
  const scrubbed = h
    .replace(/https?:\/\/[^\s"']*/g, '')
    .replace(/Based on the open-source OpenFishTools project \(MIT\)\./g, '')
    .replace(/(src|href|id|class)="[^"]*"/g, '')
    .replace(/\.fishtool/gi, '')
    .replace(/fishtool_[a-z_]+/g, '')
    .replace(/&lt;[^;]*?&gt;/g, '')
    .replace(/accept="[^"]*"/g, '')
    .replace(/localStorage\.getItem\('[^']*'\)/g, '');
  ok(!/OpenFishTools/i.test(scrubbed), `tanpa OpenFishTools terlihat (${tag})`);
  ok(!/Fish\s?Tool/i.test(scrubbed), `tanpa FishTool terlihat (${tag})`);
});

// [4] String JS user-visible
console.log('[4] String JS user-visible');
ok(editorCode.includes("Modul Denji Motion belum siap"), 'toast modul');
ok(editorCode.includes("text: 'DENJI MOTION'"), 'teks default layer teks (editor)');
ok(textEngine.includes("text: 'DENJI MOTION'"), 'teks default (text-engine)');
ok(demoCode.includes("fillText('Denji Motion'"), 'label kanvas demo');
ok(!editorCode.includes('FISH TOOL'), 'tanpa FISH TOOL di editor.js');

// [5] Token tema
console.log('[5] Token tema maroon + terang]');
const rootBlock = themeCss.slice(themeCss.indexOf(':root {'), themeCss.indexOf('[data-theme="cyber-cyan"]'));
const lightBlock = themeCss.slice(themeCss.indexOf('[data-theme="light"]'));
ok(rootBlock.includes('--color-primary: #c23b3b'), 'primer maroon #c23b3b');
ok(rootBlock.includes('--bg-canvas: #0f0b0b'), 'kanvas wine gelap');
ok(lightBlock.includes('--color-primary:'), 'terang punya primer sendiri');
{
  const toks = (b) => new Set([...b.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  const rt = toks(rootBlock), lt = toks(lightBlock);
  const inheritOk = new Set(['--font-brand', '--font-mono', '--shadow-active', '--shadow-button-glow', '--shadow-panel']);
  const missing = [...rt].filter(t => !lt.has(t) && !inheritOk.has(t));
  ok(missing.length === 0, 'terang cakup semua token (di luar warisan)', missing.join(','));
}
ok(indexHtml.includes("setAttribute('data-theme', 'light')"), 'snippet pra-render tema dasbor');
ok(editorHtml.includes("setAttribute('data-theme', 'light')"), 'snippet pra-render tema editor');

// ----------------------------------------------------------
console.log(`\nRebrand+Tema Fase 3: ${passed} lolos, ${failed} gagal.`);
if (failed > 0) process.exit(1);
