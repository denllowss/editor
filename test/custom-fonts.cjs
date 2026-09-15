/**
 * Unit test modul custom fonts (tanpa browser).
 *
 * - Stub indexedDB (fake fungsional: open/upgrade/transaction/put/getAll/delete).
 * - Stub FontFace (load sukses/gagal terkendali) + document.fonts.
 * - Validasi file, sanitasi nama, import, persistensi, restore antar-"reload",
 *   hapus font, round-trip id/stack, dan mode memory-only.
 *
 * Jalankan: npm test
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUBLIC = path.join(__dirname, '..', 'public');
let passed = 0;
let failed = 0;
function ok(cond, label, extra) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
}
const tick = () => new Promise((r) => setTimeout(r, 0));

// ----------------------------------------------------------
// Fake IndexedDB (backing store bisa dipakai bersama antar konteks)
// ----------------------------------------------------------
function createFakeIDB(shared) {
  const backing = shared || { stores: new Map(), versions: new Map() }; // name -> Map(id->row)
  return {
    open(name, version) {
      const req = {};
      setTimeout(() => {
        if (!backing.stores.has(name)) backing.stores.set(name, new Map());
        const prevVer = backing.versions.get(name) || 0;
        const db = {
          objectStoreNames: { contains: (s) => backing.stores.get(name + '::' + s) !== undefined },
          createObjectStore(s) { backing.stores.set(name + '::' + s, new Map()); },
          transaction(snames, _mode) {
            const list = Array.isArray(snames) ? snames : [snames];
            const tx = { oncomplete: null, onerror: null, onabort: null };
            tx.objectStore = (s) => {
              const key = name + '::' + s;
              if (!backing.stores.has(key)) backing.stores.set(key, new Map());
              const map = backing.stores.get(key);
              const wrap = (fn) => {
                const r = {};
                setTimeout(() => {
                  try { r.result = fn(); if (r.onsuccess) r.onsuccess({ target: r }); } catch (e) { if (r.onerror) r.onerror(e); }
                  setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
                }, 0);
                return r;
              };
              return {
                put: (v) => wrap(() => { map.set(v.id, JSON.parse(JSON.stringify({ ...v, buffer: v.buffer ? { __bytes: v.buffer.byteLength } : null }))); return v.id; }),
                get: (k) => wrap(() => map.get(k)),
                getAll: () => wrap(() => [...map.values()].map((v) => ({ ...v, buffer: v.buffer }))),
                delete: (k) => wrap(() => map.delete(k)),
              };
            };
            return tx;
          },
        };
        // Simpan buffer asli terpisah (JSON clone di put tidak membawa ArrayBuffer)
        db.__raw = db.__raw || new Map();
        if (prevVer < version) {
          backing.versions.set(name, version);
          if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: db } });
        }
        req.result = db;
        if (req.onsuccess) req.onsuccess({ target: req });
      }, 0);
      return req;
    },
  };
}

// Patch: put harus menyimpan buffer asli untuk restore. Bungkus ulang agar
// fake menyimpan referensi buffer di map paralel.
function createFakeIDBWithBuffers(shared) {
  const api = createFakeIDB(shared);
  const origOpen = api.open.bind(api);
  api.open = (name, version) => {
    const req = origOpen(name, version);
    const origSuccessChain = [];
    const poll = setInterval(() => {
      if (req.result && !req.result.__patched) {
        req.result.__patched = true;
        const db = req.result;
        const origTx = db.transaction.bind(db);
        const rawBufs = new Map(); // id -> ArrayBuffer
        db.transaction = (snames, mode) => {
          const tx = origTx(snames, mode);
          const origOS = tx.objectStore.bind(tx);
          tx.objectStore = (s) => {
            const st = origOS(s);
            const origPut = st.put.bind(st);
            const origGetAll = st.getAll.bind(st);
            st.put = (v) => {
              if (v && v.buffer) rawBufs.set(v.id, v.buffer);
              return origPut(v);
            };
            st.getAll = () => {
              const r = origGetAll();
              const origOk = [];
              const chk = setInterval(() => {
                if (r.result) {
                  clearInterval(chk);
                  r.result = r.result.map((row) => ({ ...row, buffer: rawBufs.get(row.id) || row.buffer }));
                  origOk.forEach((fn) => fn());
                }
              }, 0);
              const origSetter = Object.getOwnPropertyDescriptor(r, 'onsuccess');
              void origSetter;
              const real = r;
              let userCb = null;
              Object.defineProperty(real, 'onsuccess', {
                get: () => userCb,
                set: (fn) => { userCb = fn; origOk.push(() => fn && fn({ target: real })); },
              });
              return r;
            };
            return st;
          };
          return tx;
        };
        clearInterval(poll);
      }
    }, 0);
    return req;
  };
  return api;
}

// ----------------------------------------------------------
// Konteks VM per skenario
// ----------------------------------------------------------
function makeCtx({ idb = null, failLoad = false } = {}) {
  const fontsSet = new Set();
  const sandbox = {
    console, Math, Object, Array, JSON, parseInt, isNaN, Map, Set, Date,
    Promise, Uint8Array, ArrayBuffer,
    indexedDB: idb,
    FontFace: class {
      constructor(family, source) { this.family = family; this.source = source; this.status = 'unloaded'; }
      load() {
        if (failLoad || !this.source || this.source.byteLength === 0) return Promise.reject(new Error('bad font'));
        this.status = 'loaded';
        return Promise.resolve(this);
      }
    },
    document: { fonts: {
      add: (f) => { fontsSet.add(f); },
      delete: (f) => fontsSet.delete(f),
      has: (f) => fontsSet.has(f),
      get size() { return fontsSet.size; },
    } },
    window: null,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(PUBLIC, 'js', 'custom-fonts.js'), 'utf8');
  vm.runInContext(code, sandbox, { filename: 'custom-fonts.js' });
  return { CF: sandbox.CustomFonts, fontsSet, sandbox };
}

function fakeFile(name, size, byteLength) {
  const buf = new ArrayBuffer(byteLength === undefined ? Math.min(size, 1024) : byteLength);
  return { name, size, type: '', arrayBuffer: async () => buf };
}

(async () => {
  // ----------------------------------------------------------
  console.log('\n[1] Builtins & validasi');
  {
    const { CF } = makeCtx({ idb: createFakeIDBWithBuffers() });
    ok(Array.isArray(CF.builtins) && CF.builtins.length >= 10, `${CF.builtins.length} builtin fonts`);
    ok(new Set(CF.builtins.map((b) => b.id)).size === CF.builtins.length, 'id builtin unik');
    ok(CF.builtins.every((b) => b.name && b.stack), 'semua builtin punya name+stack');
    ok(CF._validateFile(fakeFile('a.ttf', 1000)).ok, 'terima .ttf');
    ok(CF._validateFile(fakeFile('a.otf', 1000)).ok, 'terima .otf');
    ok(CF._validateFile(fakeFile('a.woff', 1000)).ok, 'terima .woff');
    ok(CF._validateFile(fakeFile('A.WOFF2', 1000)).ok, 'terima .WOFF2 (kapital)');
    ok(!CF._validateFile(fakeFile('a.txt', 1000)).ok, 'tolak .txt');
    ok(!CF._validateFile(fakeFile('a.png', 1000)).ok, 'tolak .png');
    ok(!CF._validateFile(fakeFile('noname', 1000)).ok, 'tolak tanpa ekstensi');
    ok(!CF._validateFile(fakeFile('a.ttf', 0)).ok, 'tolak file kosong');
    ok(!CF._validateFile(fakeFile('a.ttf', 16 * 1024 * 1024)).ok, 'tolak >15MB');
    ok(!CF._validateFile(null).ok, 'tolak null');
  }

  // ----------------------------------------------------------
  console.log('\n[2] Nama & stack');
  {
    const { CF } = makeCtx({ idb: createFakeIDBWithBuffers() });
    ok(CF._familyFromFileName('Poppins-Bold.ttf') === 'Poppins Bold', 'Poppins-Bold → "Poppins Bold"');
    ok(CF._familyFromFileName('my_font__v2.otf') === 'my font v2', 'underscore → spasi');
    const evil = CF._familyFromFileName('"><img src=x onerror=alert(1)>.woff2');
    ok(!/[<>"']/.test(evil) && evil.length > 0, 'sanitasi nama jahat', evil);
    ok(CF._familyFromFileName('???.ttf') === 'Custom Font', 'fallback nama kosong');
    ok(CF._stackForFamily('Poppins Bold') === '"Poppins Bold", sans-serif', 'format stack benar');
  }

  // ----------------------------------------------------------
  console.log('\n[3] Import + persistensi');
  const sharedBacking = { stores: new Map(), versions: new Map() };
  {
    const { CF, fontsSet } = makeCtx({ idb: createFakeIDBWithBuffers(sharedBacking) });
    await CF.init();
    const e1 = await CF.importFromFile(fakeFile('Poppins-Bold.ttf', 50000));
    ok(e1.family === 'Poppins Bold', 'import: family benar', e1.family);
    ok(fontsSet.size === 1, 'import: FontFace terdaftar');
    ok(CF.getCustoms().length === 1, 'import: tercatat di daftar');
    // duplikat nama → unik
    const e2 = await CF.importFromFile(fakeFile('Poppins-Bold.ttf', 50000));
    ok(e2.family === 'Poppins Bold 2', 'duplikat → nama unik', e2.family);
    ok(fontsSet.size === 2, 'duplikat: face kedua terdaftar');
    ok(CF.stackForId(e1.id) === '"Poppins Bold", sans-serif', 'stackForId tepat');
    ok(CF.idForStack('"Poppins Bold", sans-serif') === e1.id, 'idForStack tepat');
    ok(CF.nameForId('cal-sans') === 'Cal Sans', 'nameForId builtin');
    ok(CF.idForStack('Cal Sans, Inter, sans-serif') === 'cal-sans', 'idForStack builtin');
    ok(CF.idForStack('Tidak Ada, serif') === null, 'idForStack asing → null');
  }

  // ----------------------------------------------------------
  console.log('\n[4] Restore antar reload (IDB bersama)');
  {
    const { CF, fontsSet } = makeCtx({ idb: createFakeIDBWithBuffers(sharedBacking) });
    await tick();
    const restored = await CF.init();
    ok(restored.length === 2, 'restore 2 font', `dapat ${restored.length}`);
    ok(fontsSet.size === 2, 'restore: 2 face terdaftar ulang');
    ok(restored.some((r) => r.family === 'Poppins Bold 2'), 'nama unik ikut tersimpan');
  }

  // ----------------------------------------------------------
  console.log('\n[5] Hapus font');
  {
    const { CF, fontsSet } = makeCtx({ idb: createFakeIDBWithBuffers(sharedBacking) });
    await CF.init();
    const target = CF.getCustoms()[0];
    ok(await CF.removeFont(target.id) === true, 'removeFont → true');
    ok(CF.getCustoms().length === 1, 'daftar berkurang');
    ok(fontsSet.size === 1, 'face dicabut dari document.fonts');
    ok(await CF.removeFont('tidak-ada') === false, 'hapus id asing → false');
    // pastikan terhapus permanen (reload lagi)
    const re = makeCtx({ idb: createFakeIDBWithBuffers(sharedBacking) });
    const rows = await re.CF.init();
    ok(rows.length === 1, 'penghapusan persist di IDB');
  }

  // ----------------------------------------------------------
  console.log('\n[6] Font rusak & mode memory-only');
  {
    const { CF, fontsSet } = makeCtx({ idb: createFakeIDBWithBuffers(), failLoad: true });
    await CF.init();
    let err = '';
    try { await CF.importFromFile(fakeFile('rusak.ttf', 5000)); } catch (e) { err = e.message; }
    ok(/corrupt|rusak|Unrecognized/i.test(err), 'font rusak → error ramah', err);
    ok(CF.getCustoms().length === 0 && fontsSet.size === 0, 'font rusak tidak tersimpan');

    const mem = makeCtx({ idb: null }); // tanpa indexedDB
    await mem.CF.init();
    ok(mem.CF._isMemOnly() === true, 'tanpa IDB → mode memory-only');
    const e = await mem.CF.importFromFile(fakeFile('Sesi.ttf', 3000));
    ok(e.family === 'Sesi' && mem.fontsSet.size === 1, 'memory-only: import jalan sesi ini');
  }

  // ----------------------------------------------------------
  console.log('\n[7] Wiring tema & info dropdown (statis)');
  {
    const html = fs.readFileSync(path.join(PUBLIC, 'editor.html'), 'utf8');
    const css = fs.readFileSync(path.join(PUBLIC, 'css', 'editor.css'), 'utf8');
    const editor = fs.readFileSync(path.join(PUBLIC, 'js', 'editor.js'), 'utf8');
    const fontCss = css.slice(css.indexOf('Custom Fonts — dropdown Font'));
    ok((html.match(/id="btn-import-font"/g) || []).length === 1, 'tombol impor tepat 1x');
    ok(html.includes('class="font-import-btn"'), 'tombol impor pakai class tema');
    ok(fontCss.includes('--color-primary') && fontCss.includes('--bg-canvas'), 'tombol pakai token tema');
    ok(!/#3051ff/i.test(fontCss) && !/#ff5a5a/i.test(fontCss) && !/#5a8bff/i.test(fontCss), 'blok font tanpa warna hardcode lepas-tema');
    ok(fontCss.includes('.font-note'), 'gaya baris info ada');
    ok(editor.includes('data-font-hint'), 'editor.js: baris info berkait impor');
    ok(editor.includes("closest('[data-font-hint]')"), 'editor.js: klik info → dialog impor');
    ok(editor.includes('Belum ada font tersedia'), 'editor.js: info daftar kosong');
    ok(editor.includes('Hanya ada 1 font'), 'editor.js: info tinggal satu');
    ok(editor.includes('Tambah font sendiri'), 'editor.js: info belum impor');
  }

  console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
