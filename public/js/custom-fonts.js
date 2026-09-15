/**
 * CUSTOM FONTS - Import & persist user fonts (Node.js port v0.8.0)
 * ---------------------------------------------------------------------------
 * - Loads .ttf/.otf/.woff/.woff2 via the FontFace API so canvas text
 *   (preview AND export) can use them immediately.
 * - Persists font binaries in its OWN tiny IndexedDB (zero migration risk
 *   to the existing project database). Falls back to in-memory (session)
 *   when IndexedDB is unavailable.
 * - Pure module: depends only on standard web APIs (indexedDB, FontFace,
 *   document.fonts). Fully unit-tested in Node with stubbed globals
 *   (see test/custom-fonts.cjs). No editor/DOM-structure dependencies.
 */
(function (global) {
  'use strict';

  const DB_NAME = 'fishtool-custom-fonts';
  const DB_VERSION = 1;
  const STORE = 'fonts';
  const MAX_BYTES = 15 * 1024 * 1024; // 15 MB per font
  const ALLOWED_EXT = ['ttf', 'otf', 'woff', 'woff2'];

  const BUILTINS = [
    { id: 'cal-sans', name: 'Cal Sans', stack: 'Cal Sans, Inter, sans-serif' },
    { id: 'inter', name: 'Inter', stack: 'Inter, system-ui, sans-serif' },
    { id: 'system-ui', name: 'System UI', stack: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
    { id: 'arial', name: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
    { id: 'helvetica', name: 'Helvetica', stack: 'Helvetica, Arial, sans-serif' },
    { id: 'verdana', name: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
    { id: 'trebuchet', name: 'Trebuchet MS', stack: '"Trebuchet MS", Verdana, sans-serif' },
    { id: 'georgia', name: 'Georgia', stack: 'Georgia, serif' },
    { id: 'times', name: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
    { id: 'courier', name: 'Courier New', stack: '"Courier New", Courier, monospace' },
    { id: 'impact', name: 'Impact', stack: 'Impact, Haettenschweiler, sans-serif' },
    { id: 'comic-sans', name: 'Comic Sans MS', stack: '"Comic Sans MS", cursive' }
  ];

  let _customs = []; // [{id,name,family,stack,mime,size,createdAt}]
  let _faces = new Map(); // id -> FontFace
  let _db = null;
  let _memOnly = false;
  let _ready = false;

  // ---------------------------------------------------------- helpers ---
  function extOf(fileName) {
    const m = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }

  function baseName(fileName) {
    return String(fileName || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Aggressive sanitize: safe for CSS strings, HTML and FontFace family names.
  function cleanName(s) {
    const cleaned = String(s == null ? '' : s).replace(/[^a-zA-Z0-9 \-]/g, '').replace(/\s+/g, ' ').trim();
    return cleaned || 'Custom Font';
  }

  function familyFromFileName(fileName) {
    return cleanName(baseName(fileName));
  }

  function uniqueFamily(wanted) {
    const taken = new Set(_customs.map((c) => c.family.toLowerCase()));
    BUILTINS.forEach((b) => taken.add(b.name.toLowerCase()));
    let family = cleanName(wanted);
    if (!taken.has(family.toLowerCase())) return family;
    let i = 2;
    while (taken.has((family + ' ' + i).toLowerCase())) i++;
    return family + ' ' + i;
  }

  function stackForFamily(family) {
    return '"' + family + '", sans-serif';
  }

  function newId() {
    return 'cf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function validateFile(file) {
    if (!file || typeof file !== 'object') return { ok: false, error: 'No file selected.' };
    const size = Number(file.size) || 0;
    if (size <= 0) return { ok: false, error: 'File is empty.' };
    if (size > MAX_BYTES) return { ok: false, error: 'Font exceeds 15 MB limit.' };
    const ext = extOf(file.name);
    if (!ALLOWED_EXT.includes(ext)) return { ok: false, error: 'Use .ttf, .otf, .woff or .woff2.' };
    return { ok: true, ext };
  }

  function fileBuffer(file) {
    if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    // Fallback for older WebKit: FileReader
    return new Promise((resolve, reject) => {
      try {
        const FR = (typeof FileReader !== 'undefined') ? FileReader : (global && global.FileReader);
        if (!FR) return reject(new Error('Cannot read file in this browser.'));
        const r = new FR();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error('Cannot read file.'));
        r.readAsArrayBuffer(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  function fontsAPI() {
    try {
      const doc = (typeof document !== 'undefined') ? document : (global && global.document);
      return (doc && doc.fonts) || null;
    } catch (_) {
      return null;
    }
  }

  // ------------------------------------------------------- persistence ---
  function idb() {
    try {
      if (typeof indexedDB !== 'undefined') return indexedDB;
      if (global && global.indexedDB) return global.indexedDB;
    } catch (_) {}
    return null;
  }

  function openDB() {
    return new Promise((resolve) => {
      const api = idb();
      if (!api) return resolve(null);
      let req;
      try {
        req = api.open(DB_NAME, DB_VERSION);
      } catch (_) {
        return resolve(null);
      }
      req.onupgradeneeded = (ev) => {
        try {
          const db = ev.target.result;
          if (db && typeof db.createObjectStore === 'function' && !db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: 'id' });
          }
        } catch (_) {}
      };
      req.onsuccess = (ev) => resolve(ev.target.result || null);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
  }

  function tx(storeMode, fn) {
    return new Promise((resolve) => {
      if (!_db) return resolve(null);
      let result = null;
      try {
        const t = _db.transaction([STORE], storeMode);
        const st = t.objectStore(STORE);
        const req = fn(st);
        if (!req) return resolve(null);
        req.onsuccess = (ev) => { result = ev.target.result; };
        t.oncomplete = () => resolve(result === undefined ? true : result);
        t.onerror = () => resolve(null);
        t.onabort = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }

  // ------------------------------------------------------------- API ---
  async function registerFace(entry, buffer) {
    const FF = (typeof FontFace !== 'undefined') ? FontFace : (global && global.FontFace);
    const fonts = fontsAPI();
    if (!FF || !fonts) throw new Error('Font loading is not supported in this browser.');
    const face = new FF(entry.family, buffer);
    await face.load(); // throws on corrupt/unknown format
    try { fonts.add(face); } catch (_) {}
    _faces.set(entry.id, face);
    return face;
  }

  async function init() {
    if (_ready) return _customs.slice();
    _db = await openDB();
    _memOnly = !_db;
    let rows = [];
    if (_db) {
      rows = (await tx('readonly', (st) => st.getAll())) || [];
    }
    _customs = [];
    _faces = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || !row.id || !row.family || !row.buffer) continue;
      const entry = {
        id: row.id, name: row.name || row.family, family: row.family,
        stack: row.stack || stackForFamily(row.family),
        mime: row.mime || '', size: row.size || 0, createdAt: row.createdAt || ''
      };
      try {
        await registerFace(entry, row.buffer);
        _customs.push(entry);
      } catch (_) {
        // Corrupt entry: keep the record skipped (font simply unavailable).
      }
    }
    _ready = true;
    return _customs.slice();
  }

  async function importFromFile(file) {
    const v = validateFile(file);
    if (!v.ok) throw new Error(v.error);
    const buffer = await fileBuffer(file);
    if (!buffer || buffer.byteLength === 0) throw new Error('File is empty.');
    const family = uniqueFamily(familyFromFileName(file.name));
    const now = new Date().toISOString();
    const entry = {
      id: newId(),
      name: family,
      family,
      stack: stackForFamily(family),
      mime: file.type || ('font/' + v.ext),
      size: Number(file.size) || buffer.byteLength,
      createdAt: now
    };
    try {
      await registerFace(entry, buffer);
    } catch (_) {
      throw new Error('Unrecognized or corrupt font file.');
    }
    _customs.push(entry);
    if (_db) {
      await tx('readwrite', (st) => st.put({
        id: entry.id, name: entry.name, family: entry.family, stack: entry.stack,
        mime: entry.mime, size: entry.size, createdAt: entry.createdAt, buffer
      }));
    }
    return Object.assign({}, entry);
  }

  async function removeFont(id) {
    const idx = _customs.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    const fonts = fontsAPI();
    const face = _faces.get(id);
    if (fonts && face) {
      try { fonts.delete(face); } catch (_) {}
    }
    _faces.delete(id);
    _customs.splice(idx, 1);
    if (_db) {
      await tx('readwrite', (st) => st.delete(id));
    }
    return true;
  }

  function getCustoms() {
    return _customs.map((c) => Object.assign({}, c));
  }

  // Semua font (built-in + custom) untuk render dropdown editor.
  // WAJIB ADA: editor.js memanggilnya saat init; tanpanya TypeError
  // menghentikan seluruh evaluasi editor.js (bug: impor media mati,
  // id project tak ter-set, phantom project tercipta).
  function getAll() {
    const list = BUILTINS.map((b) => Object.assign({}, b));
    for (const c of _customs) {
      const e = Object.assign({}, c);
      e.custom = true;
      list.push(e);
    }
    return list;
  }

  function stackForId(id) {
    const b = BUILTINS.find((x) => x.id === id);
    if (b) return b.stack;
    const c = _customs.find((x) => x.id === id);
    return c ? c.stack : null;
  }

  function nameForId(id) {
    const b = BUILTINS.find((x) => x.id === id);
    if (b) return b.name;
    const c = _customs.find((x) => x.id === id);
    return c ? c.name : null;
  }

  function idForStack(stack) {
    const s = String(stack || '');
    const b = BUILTINS.find((x) => x.stack === s);
    if (b) return b.id;
    const c = _customs.find((x) => x.stack === s);
    return c ? c.id : null;
  }

  const api = {
    builtins: BUILTINS,
    init,
    importFromFile,
    removeFont,
    getCustoms,
    getAll,
    stackForId,
    nameForId,
    idForStack,
    // exposed for unit tests:
    _validateFile: validateFile,
    _familyFromFileName: familyFromFileName,
    _uniqueFamily: uniqueFamily,
    _stackForFamily: stackForFamily,
    _isReady: () => _ready,
    _isMemOnly: () => _memOnly
  };

  if (global) {
    global.CustomFonts = api;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
