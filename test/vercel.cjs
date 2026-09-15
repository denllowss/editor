/**
 * Test kesiapan deploy Vercel (v0.13.0).
 *
 * - vercel.json valid: rewrite semua -> function, bundel public/** + data/**.
 * - api/index.js mengekspor app Express tanpa listen.
 * - server.js: guard require.main, path __dirname, fallback tulis /tmp+memori.
 * - Smoke runtime: require server.js tidak membuka port & mengembalikan app.
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

// ----------------------------------------------------------
console.log('\n[1] vercel.json');
{
  let cfg = null;
  try {
    cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  } catch (e) {
    cfg = null;
  }
  ok(cfg !== null, 'vercel.json valid JSON');
  const rw = (cfg && cfg.rewrites) || [];
  ok(rw.some((r) => r.destination === '/api/index.js'), 'rewrite -> /api/index.js ada');
  ok(rw.some((r) => r.source === '/:path*' || r.source === '/(.*)'), 'rewrite mencakup semua path');
  const inc = (((cfg.functions || {})['api/index.js'] || {}).includeFiles) || [];
  ok(inc.includes('public/**'), 'bundel public/**');
  ok(inc.includes('data/**'), 'bundel data/**');
}

// ----------------------------------------------------------
console.log('\n[2] api/index.js');
{
  const raw = fs.readFileSync(path.join(ROOT, 'api', 'index.js'), 'utf8');
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(/require\(['"]\.\.\/server['"]\)/.test(code), 'impor ../server');
  ok(/module\.exports\s*=\s*app/.test(code), 'ekspor app');
  ok(!/\.listen\(/.test(code), 'tanpa listen');
}

// ----------------------------------------------------------
console.log('\n[3] server.js serverless-safe');
{
  const code = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  ok(/module\.exports\s*=\s*app/.test(code), 'ekspor app');
  ok(code.includes('require.main === module'), 'guard require.main');
  const iGuard = code.indexOf('require.main === module');
  const iListen = code.indexOf('app.listen(');
  ok(iGuard > 0 && iListen > iGuard, 'listen di dalam guard');
  ok(code.includes("path.join(ROOT, 'public')") || code.includes('path.join(__dirname'), 'path absolut __dirname');
  ok(code.includes('os.tmpdir()'), 'fallback tulis /tmp');
  ok(code.includes('_memProjects'), 'fallback terakhir memori');
  ok(/accessSync|W_OK/.test(code), 'cek writability direktori');
}

// ----------------------------------------------------------
console.log('\n[4] Meta deploy');
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  ok(pkg.engines && /18/.test(pkg.engines.node), `engines.node ${pkg.engines && pkg.engines.node}`);
  ok((pkg.dependencies || {}).express, 'dep express tercatat');
  const ign = fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf8');
  ok(ign.includes('test/'), '.vercelignore kecualikan test/');
  ok(!/(^|\n)public\/(\n|$)/.test(ign) && !/(^|\n)data\/(\n|$)/.test(ign), 'public/ & data/ TIDAK dikecualikan');
}

// ----------------------------------------------------------
console.log('\n[5] Smoke runtime (tanpa port)');
{
  let app = null;
  let err = '';
  try {
    app = require(path.join(ROOT, 'server.js'));
  } catch (e) {
    err = String((e && e.message) || e);
  }
  ok(!err, 'require server.js tanpa throw', err);
  ok(typeof app === 'function' && typeof app.listen === 'function', 'ekspor berupa app Express');
  let apiApp = null;
  try {
    apiApp = require(path.join(ROOT, 'api', 'index.js'));
  } catch (e) {
    apiApp = null;
  }
  ok(apiApp === app, 'api/index.js ekspor app yang sama');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
