/**
 * Test regresi Setting Utama dasbor (v0.25.0):
 * [1] Tombol Settings gantikan Feedback + Donate di header dasbor.
 * [2] Modal setting utama: mode Dark/Light + warna tema + Tampilan Editor.
 * [3] Tema terang/warna: token lengkap + snippet pra-render di kedua halaman.
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
  ok(dashHtml.includes('id="settings-color-theme-grid"'), 'grid warna tema ada');
  ok(dashHtml.includes('data-color-theme-val="maroon"') &&
    dashHtml.includes('data-color-theme-val="cyber-cyan"') &&
    dashHtml.includes('data-color-theme-val="amber-terminal"') &&
    dashHtml.includes('data-color-theme-val="custom"'),
    'opsi Maroon, Cyan, Amber, dan Custom ada');
  ok(dashHtml.includes('id="settings-custom-color"') &&
    dashHtml.includes('id="settings-custom-color-hex"'),
    'input warna bebas dan input HEX ada');
  ok(dashHtml.includes("setAppColorTheme('cyber-cyan')") &&
    dashHtml.includes("setAppColorTheme('amber-terminal')"),
    'opsi warna terhubung ke setAppColorTheme');
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
    ok(code.includes("localStorage.getItem('denjimotion_theme')") && code.includes('data-theme\', \'light\''),
      `snippet pra-render ${name}`);
  }
  for (const [name, code] of [['dasbor', dashHtml], ['editor', editorHtml]]) {
    ok(code.includes("localStorage.getItem('denjimotion_color_theme')") &&
      code.includes("data-color-theme', initialColorTheme"),
      `snippet warna pra-render ${name}`);
  }
  ok(themeCss.includes('[data-color-theme="cyber-cyan"]') &&
    themeCss.includes('[data-color-theme="amber-terminal"]') &&
    themeCss.includes('[data-color-theme="custom"]'),
    'token warna tema preset + Custom ada');
  ok(dashCss.includes('.theme-mode-grid') && dashCss.includes('.theme-mode-btn.is-selected') &&
    dashCss.includes('.theme-color-grid') && dashCss.includes('.theme-color-btn.is-selected'),
    'gaya grid mode + warna tema ada');
}

// ----------------------------------------------------------
console.log('\n[4] Logika tema main.js');
{
  ok(mainCode.includes("const APP_THEME_KEY = 'denjimotion_theme'"), 'kunci penyimpanan mode');
  ok(mainCode.includes("const APP_COLOR_THEME_KEY = 'denjimotion_color_theme'"), 'kunci penyimpanan warna');
  ok(mainCode.includes("const APP_CUSTOM_COLOR_KEY = 'denjimotion_custom_color'"), 'kunci warna bebas');
  ok(mainCode.includes('function setAppTheme(mode)'), 'fungsi setAppTheme');
  ok(mainCode.includes('function setAppColorTheme(theme)'), 'fungsi setAppColorTheme');
  ok(mainCode.includes('function setAppCustomColorTheme(value)'), 'fungsi setAppCustomColorTheme');
  ok(mainCode.includes('function normalizeHexColor(value)'), 'normalisasi warna HEX');
  ok(mainCode.includes('function getAppColorTheme()'), 'fungsi getAppColorTheme');
  ok(mainCode.includes('function getAppTheme()'), 'fungsi getAppTheme');
  ok(mainCode.includes('function openAppSettingsModal()'), 'fungsi buka modal');
  ok(mainCode.includes('window.setAppTheme = setAppTheme'), 'diekspos global mode');
  ok(mainCode.includes('window.setAppColorTheme = setAppColorTheme'), 'diekspos global warna');
  ok(mainCode.includes('window.setAppCustomColorTheme = setAppCustomColorTheme'), 'diekspos global warna bebas');
  ok(mainCode.includes("root.setAttribute('data-color-theme', theme)"), 'terapkan atribut warna');
  ok(mainCode.includes("removeAttribute('data-color-theme')"), 'Maroon menghapus atribut warna');
  ok(/setAttribute\('data-theme', 'light'\)/.test(mainCode), 'terapkan atribut light');
  ok(/removeAttribute\('data-theme'\)/.test(mainCode), 'dark = atribut dicabut (bawaan)');
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
process.exit(failed ? 1 : 0);
