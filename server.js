/**
 * OpenFishTools Studio — Node.js (Express) Port
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
// ----------------------------------------------------------
function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROJECTS_FILE)) {
    fs.writeFileSync(PROJECTS_FILE, '[]', 'utf8');
  }
}

function readProjects() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(PROJECTS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeProjects(list) {
  ensureDataFile();
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(list, null, 2), 'utf8');
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
  res.json({ ok: true, app: 'fishtool-studio-nodejs', time: new Date().toISOString() });
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
// seperti `if (res.ok)` di fishtools-adapter.js tetap benar.
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🐟 OpenFishTools Studio (Node.js port) berjalan di:`);
  console.log(`     → http://localhost:${PORT}/`);
  console.log(`     → http://localhost:${PORT}/editor`);
  console.log(`     → http://localhost:${PORT}/demo`);
  console.log(`     → http://localhost:${PORT}/api/health\n`);
});
