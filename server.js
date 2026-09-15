/**
 * DenjiMotion Studio — Node.js (Express) Port
 * ============================================================
 * Hasil port 1:1 dari https://fishtoolstudio.vercel.app/ (v0.5.14)
 * ke aplikasi web Node.js + Express.
 *
 * - Seluruh UI asli (HTML/CSS/JS) disajikan dari folder ./public
 * - Route bersih: /  /editor  /demo  (+ varian .html)
 * - REST API tambahan untuk simpan project di sisi server:
 *     GET    /api/health
 *     GET    /api/version
 *     GET    /api/projects
 *     POST   /api/projects
 *     GET    /api/projects/:id
 *     PUT    /api/projects/:id
 *     DELETE /api/projects/:id
 *
 * Lisensi: MIT (mengikuti proyek aslinya).
 * Kredit UI/aset: cutefishaep / OpenFishTools.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// ----------------------------------------------------------
// Helpers: penyimpanan project sisi-server (file JSON)
// Rantai fallback tulis (Vercel = filesystem read-only):
//   1) ./data/projects.json (lokal/VPS — persisten)
//   2) $TMPDIR/denjimotion-projects.json (serverless — semi-persisten antar
//      invocasi hangat; hilang saat cold start / redeploy)
//   3) memori proses (darurat — hilang saat proses mati)
// Bacaan pertama di (2) di-seed dari file bundel bila ada.
// ----------------------------------------------------------
let _memProjects = null;

function writableDir() {
  for (const dir of [DATA_DIR, os.tmpdir()]) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch {
      // coba direktori berikutnya
    }
  }
  return null;
}

function activeProjectsFile() {
  const dir = writableDir();
  if (!dir) return null;
  return path.join(dir, 'projects.json');
}

function ensureDataFile() {
  const file = activeProjectsFile();
  if (!file) return null;
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '[]', 'utf8');
    }
  } catch {
    return null;
  }
  return file;
}

function readProjects() {
  if (_memProjects) return _memProjects;
  const file = activeProjectsFile();
  if (!file) {
    _memProjects = [];
    return _memProjects;
  }
  try {
    if (!fs.existsSync(file)) {
      // Seed dari bundel read-only bila tersedia (kasus Vercel)
      if (file !== PROJECTS_FILE && fs.existsSync(PROJECTS_FILE)) {
        const seed = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
        return Array.isArray(seed) ? seed : [];
      }
      return [];
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeProjects(list) {
  const file = ensureDataFile();
  if (!file) {
    _memProjects = list;
    return;
  }
  fs.writeFileSync(file, JSON.stringify(list, null, 2), 'utf8');
}

function newId() {
  return 'p_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

function readVersion() {
  try {
    const raw = fs.readFileSync(path.join(PUBLIC_DIR, 'version.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { version: require('./package.json').version };
  }
}

// ----------------------------------------------------------
// Middleware
// ----------------------------------------------------------
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));

// Cache: file statis di-cache 1 hari, tapi HTML tidak di-cache
// agar update selalu segar. Query ?v=0.5.14 tetap didukung.
app.use(
  express.static(PUBLIC_DIR, {
    etag: true,
    lastModified: true,
    maxAge: '1d',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
      if (filePath.endsWith('.md')) {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      }
    },
  })
);

// ----------------------------------------------------------
// Routes halaman (mendukung URL bersih & .html)
// ----------------------------------------------------------
app.get(['/', '/index', '/index.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get(['/editor', '/editor.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'editor.html'));
});

app.get(['/demo', '/demo.html', '/showcase'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'demo.html'));
});

// ----------------------------------------------------------
// REST API
// ----------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'denjimotion-studio-nodejs', time: new Date().toISOString() });
});

app.get('/api/version', (req, res) => {
  res.json(readVersion());
});

// Daftar semua project (ringkas: tanpa blob data_url agar ringan)
app.get('/api/projects', (req, res) => {
  const list = readProjects().map((p) => ({
    id: p.id,
    name: p.name,
    aspectRatio: p.aspectRatio,
    resolution: p.resolution,
    fps: p.fps,
    background: p.background,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  res.json(list);
});

// Buat project baru
app.post('/api/projects', (req, res) => {
  const now = new Date().toISOString();
  const list = readProjects();
  const project = {
    id: newId(),
    name: req.body?.name || 'New Project',
    aspectRatio: req.body?.aspectRatio || '16:9',
    resolution: req.body?.resolution || '1080p',
    fps: req.body?.fps ?? 60,
    background: req.body?.background || 'transparent',
    data: req.body?.data || null, // payload .ofts / editor state (opsional)
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(project);
  writeProjects(list);
  res.status(201).json(project);
});

// Ambil 1 project (lengkap dengan data)
app.get('/api/projects/:id', (req, res) => {
  const found = readProjects().find((p) => p.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Project tidak ditemukan' });
  res.json(found);
});

// Update project
app.put('/api/projects/:id', (req, res) => {
  const list = readProjects();
  const idx = list.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project tidak ditemukan' });
  list[idx] = {
    ...list[idx],
    ...req.body,
    id: list[idx].id,
    createdAt: list[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  writeProjects(list);
  res.json(list[idx]);
});

// Hapus project
app.delete('/api/projects/:id', (req, res) => {
  const list = readProjects();
  const idx = list.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project tidak ditemukan' });
  const [removed] = list.splice(idx, 1);
  writeProjects(list);
  res.json({ ok: true, deleted: removed.id });
});

// ----------------------------------------------------------
// 404 & error handler
// ----------------------------------------------------------
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan' });
});

// Fallback: hanya request mirip-navigasi halaman (TANPA ekstensi file)
// yang dikembalikan ke beranda. Request file berekstensi yang hilang
// (.html/.json/.js/...) harus 404 murni agar logika fetch() client
// seperti `if (res.ok)` di denjimotion-adapter.js tetap benar.
app.use((req, res) => {
  const hasExtension = path.extname(req.path) !== '';
  if (!hasExtension && req.accepts('html')) {
    return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  }
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(404).json({ error: 'Tidak ditemukan' });
  }
  res.status(404).send('Not found');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: 'Kesalahan server internal' });
});

// ----------------------------------------------------------
// Jalankan server bila dieksekusi langsung (node server.js).
// Diimpor TANPA listen oleh api/index.js (Vercel serverless).
// ----------------------------------------------------------
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🐟 Denji Motion (Node.js port) berjalan di:`);
    console.log(`     → http://localhost:${PORT}/`);
    console.log(`     → http://localhost:${PORT}/editor`);
    console.log(`     → http://localhost:${PORT}/demo`);
    console.log(`     → http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
