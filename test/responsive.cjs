/**
 * Test lapisan responsif tablet/desktop (statis, tanpa browser).
 *
 * - css/responsive.css ada & tidak kosong, kurung kurawal seimbang.
 * - Hanya kueri min-width (mobile <768px dijamin tak tersentuh).
 * - Di-link dari <head> ketiga halaman; di demo.html SESUDAH <style> inline.
 * - Selektor kunci tiap breakpoint hadir; tak ada display:none / tombol disentuk.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

const cssPath = path.join(PUBLIC, 'css', 'responsive.css');
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

console.log('\n[1] File & sintaks dasar');
ok(css.length > 500, `responsive.css ada (${css.length} karakter)`);
{
  const open = (css.match(/{/g) || []).length;
  const close = (css.match(/}/g) || []).length;
  ok(open > 10 && open === close, `kurung seimbang (${open}/${close})`);
}

console.log('\n[2] Mobile-first: hanya min-width');
{
  const medias = [...css.matchAll(/@media\s*([^{]+)\{/g)].map((m) => m[1].trim());
  ok(medias.length === 3, `tepat 3 breakpoint`, JSON.stringify(medias));
  ok(medias.every((q) => /min-width/.test(q) && !/max-width/.test(q)),
    'semua kueri min-width (tanpa max-width)');
  for (const bp of ['768px', '1024px', '1440px']) {
    ok(medias.some((q) => q.includes(bp)), `breakpoint ${bp} ada`);
  }
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/display\s*:\s*none/.test(noComments), 'tak ada display:none (tak ada yang disembunyikan)');
  ok(!/btn-add-effect/.test(css), 'tak menyentuh tombol Add Effects');
}

console.log('\n[3] Selektor kunci per area');
for (const sel of [
  '.dashboard-container', '.projects-list', '.action-buttons-row',
  '.drawer-card', '.effects-category-grid', '.effects-items-grid',
  '.drawer-media-grid', '.layer-action-btn-grid', '.demo-wrapper', '.demo-section',
]) {
  ok(css.includes(sel), `selektor ${sel} ada`);
}

console.log('\n[4] Ter-link di 3 halaman');
for (const page of ['index.html', 'editor.html', 'demo.html']) {
  const html = fs.readFileSync(path.join(PUBLIC, page), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  ok(head.includes('css/responsive.css'), `${page}: ter-link di <head>`);
}
{
  const demo = fs.readFileSync(path.join(PUBLIC, 'demo.html'), 'utf8');
  ok(demo.indexOf('css/responsive.css') > demo.indexOf('</style>'),
    'demo.html: link SESUDAH <style> inline (kaskade menang)');
}
{
  // responsive.css harus terakhir di antara stylesheet index/editor,
  // kecuali css/layout-styles.css boleh mengikutinya di editor (v0.11.0: gaya
  // layout opsional yang memang dirancang menang atas responsive).
  for (const page of ['index.html', 'editor.html']) {
    const html = fs.readFileSync(path.join(PUBLIC, page), 'utf8');
    const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    const tail = page === 'editor.html' && links[links.length - 1] === 'css/layout-styles.css'
      ? links.slice(0, -1) : links;
    ok(tail[tail.length - 1] === 'css/responsive.css', `${page}: link paling akhir`);
  }
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
