/**
 * Test regresi Setting Utama dasbor (v0.25.0):
 * [1] Tombol Settings gantikan Feedback + Donate di header dasbor.
 * [2] Modal setting utama: mode Dark/Light + Tampilan Editor.
 * [3] Tema terang: token lengkap + snippet pra-render di kedua halaman.
 * [4] Logika tema di main.js.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const dashHtml = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const editorHtml = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');
const themeCss = fs.readFileSync(path.join(PUBLIC, 'css', 'theme.css'), 'utf8');
const dashCss = fs.readFileSync(path.join(PUBLIC, 'css', 'dashboard.css'), 'utf8');
const mainCode = fs.readFileSync(path.join(PUBLIC, 'js', 'main.js'), 'utf8');

let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}

const headerBlock = (dashHtml.match(/studio-header-actions[\s\S]*?<\/header>/) || [''])[0];
const lightBlock = (themeCss.match(/\[data-theme="light"\][\s\S]*$/) || [''])[0];

// ----------------------------------------------------------
console.log('\n[1] Header dasbor: Settings gantikan Feedback + Donate');
{
  ok(headerBlock.includes('onclick="openAppSettingsModal()"'), 'tombol Settings ada');
  ok(headerBlock.includes('aria-label="Settings"'), 'label aksesibilitas Settings');
  ok(!headerBlock.includes('Feedback'), 'tanpa tombol Feedback');
  ok(!headerBlock.includes('Donate') && !headerBlock.includes('modal-donate'), 'tanpa tombol Donate');
}

// ----------------------------------------------------------
console.log('\n[2] Modal setting utama');
{
  ok(dashHtml.includes('id="modal-app-settings"'), 'modal-app-settings ada');
  ok(dashHtml.includes('id="settings-theme-grid"'), 'grid mode tampilan ada');
  ok(dashHtml.includes('data-theme-val="dark"') && dashHtml.includes('data-theme-val="light"'),
    'opsi Dark + Light ada');
  ok(dashHtml.includes("setAppTheme('dark')") && dashHtml.includes("setAppTheme('light')"),
    'opsi terhubung ke setAppTheme');
  ok(dashHtml.includes('id="dropdown-layout-style"'), 'dropdown Tampilan Editor pindah ke dasbor');
}

// ----------------------------------------------------------
console.log('\n[3] Tema terang + pra-render');
{
  ok(lightBlock.includes('--color-primary: #a02323'), 'primer maroon pekat');
  ok(lightBlock.includes('--bg-panel: #ffffff'), 'panel putih');
  ok(lightBlock.includes('--bg-dashboard: #f7f2f2'), 'dasbor terang');
  ok(lightBlock.includes('--text-primary: #8f1f1f'), 'teks maroon terbaca');
  ok(lightBlock.includes('--track-video:') && lightBlock.includes('--kf-active-bg:'),
    'token trek + keyframe lengkap');
  for (const [name, code] of [['dasbor', dashHtml], ['editor', editorHtml]]) {
    ok(code.includes("localStorage.getItem('fishtool_theme')") && code.includes('data-theme\', \'light\''),
      `snippet pra-render ${name}`);
  }
  ok(dashCss.includes('.theme-mode-grid') && dashCss.includes('.theme-mode-btn.is-selected'),
    'gaya grid tema ada');
}

// ----------------------------------------------------------
console.log('\n[4] Logika tema main.js');
{
  ok(mainCode.includes("const APP_THEME_KEY = 'fishtool_theme'"), 'kunci penyimpanan');
  ok(mainCode.includes('function setAppTheme(mode)'), 'fungsi setAppTheme');
  ok(mainCode.includes('function getAppTheme()'), 'fungsi getAppTheme');
  ok(mainCode.includes('function openAppSettingsModal()'), 'fungsi buka modal');
  ok(mainCode.includes('window.setAppTheme = setAppTheme'), 'diekspos global');
  ok(/setAttribute\('data-theme', 'light'\)/.test(mainCode), 'terapkan atribut light');
  ok(/removeAttribute\('data-theme'\)/.test(mainCode), 'dark = atribut dicabut (bawaan)');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
