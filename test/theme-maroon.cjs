/**
 * Test regresi tema bawaan merah maroon (v0.24.0):
 * [1] Token :root = palet maroon, tanpa sisa matcha.
 * [2] Fallback hardcoded di JS/CSS = maroon.
 * [3] Tema alternatif (cyan/amber) tak tersentuh.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const themeCss = fs.readFileSync(path.join(PUBLIC, 'css', 'theme.css'), 'utf8');
const editorCode = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');
const wireframeCode = fs.readFileSync(path.join(PUBLIC, 'js', 'wireframe.js'), 'utf8');
const adapterCode = fs.readFileSync(path.join(PUBLIC, 'js', 'denjimotion-adapter.js'), 'utf8');
const layoutCss = fs.readFileSync(path.join(PUBLIC, 'css', 'layout.css'), 'utf8');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

const rootBlock = (themeCss.match(/:root\s*\{[\s\S]*?\n\}/) || [''])[0];

// ----------------------------------------------------------
console.log('\n[1] Token :root maroon');
{
  ok(rootBlock.includes('--color-primary: #c23b3b'), 'primer maroon #c23b3b');
  ok(rootBlock.includes('--color-primary-hover: #e05a5a'), 'hover maroon terang');
  ok(rootBlock.includes('--color-primary-active: #962424'), 'active wine gelap');
  ok(rootBlock.includes('--bg-canvas: #0f0b0b'), 'kanvas wine gelap');
  ok(rootBlock.includes('--text-muted: #b39a9a'), 'teks redup dusty-rose');
  ok(!/98ce7b|7fb862|abdd90|0d1109|151a0f|1d2415|2a3321/i.test(rootBlock), 'tanpa sisa hex matcha di :root');
}

// ----------------------------------------------------------
console.log('\n[2] Fallback hardcoded maroon');
{
  ok(!editorCode.includes('#98ce7b') && editorCode.includes('#c23b3b'), 'editor.js bebas matcha');
  ok(!editorCode.includes('152, 206, 123'), 'grid rgba editor.js maroon');
  ok(!wireframeCode.includes('#98ce7b') && !wireframeCode.includes('#0d1109'), 'wireframe.js bebas matcha');
  ok(!adapterCode.includes('#98ce7b') && adapterCode.includes('#c23b3b'), 'adapter tema panel maroon');
  ok(!layoutCss.includes('#98ce7b'), 'layout.css bebas matcha');
}

// ----------------------------------------------------------
console.log('\n[3] Tema alternatif utuh');
{
  ok(themeCss.includes('[data-theme="cyber-cyan"]'), 'blok cyber-cyan ada');
  ok(themeCss.includes('[data-theme="amber-terminal"]'), 'blok amber-terminal ada');
  ok(themeCss.includes('--color-primary: #00e5ff'), 'primer cyan utuh');
  ok(themeCss.includes('--color-primary: #ffaa00'), 'primer amber utuh');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
