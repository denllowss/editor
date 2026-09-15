/**
 * Regression test statis: tombol Add Effects selalu ada & terkabel.
 *
 * - #btn-add-effect (header rack) + #btn-add-effect-empty (empty-state CTA)
 *   wajib ada di editor.html tepat 1x dan berada di dalam view yang benar.
 * - Keduanya wajib di-wiring di js/editor.js ke galeri efek.
 * - CSS wajib memuat style CTA + anti-shrink header button.
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

const html = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');
const js = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');
const css = fs.readFileSync(path.join(PUBLIC, 'css', 'effects-rack.css'), 'utf8');

console.log('\n[1] Markup tombol');
for (const id of ['btn-add-effect', 'btn-add-effect-empty']) {
  const count = (html.match(new RegExp(`id="${id}"`, 'g')) || []).length;
  ok(count === 1, `#${id} ada tepat 1x`, `ditemukan ${count}x`);
}
{
  // CTA harus di dalam empty-state, yang di dalam rack body, yang di dalam effects view
  const iView = html.indexOf('id="layer-drawer-effects-view"');
  const iEmpty = html.indexOf('id="effects-rack-empty"');
  const iCta = html.indexOf('id="btn-add-effect-empty"');
  const iGallery = html.indexOf('id="layer-drawer-effects-gallery-view"');
  ok(iView !== -1 && iView < iEmpty && iEmpty < iCta && iCta < iGallery,
    'CTA berada di dalam effects view (view < empty < cta < galeri)');
  const iHeaderBtn = html.indexOf('id="btn-add-effect"');
  const iHeader = html.indexOf('effects-rack-header');
  ok(iHeader !== -1 && iHeader < iHeaderBtn && iHeaderBtn < iEmpty,
    'tombol header berada di atas empty-state');
}

console.log('\n[2] Wiring JS');
for (const id of ['btn-add-effect', 'btn-add-effect-empty']) {
  ok(js.includes(`getElementById('${id}')`), `editor.js mewiring #${id}`);
}
ok((js.match(/switchLayerDrawerSubview\('effects-gallery'\)/g) || []).length >= 2,
  'kedua tombol membuka galeri efek');

console.log('\n[3] CSS');
ok(css.includes('.btn-add-effect-empty'), 'style .btn-add-effect-empty ada');
ok(css.includes('flex-shrink: 0'), 'anti-shrink header button ada');

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
