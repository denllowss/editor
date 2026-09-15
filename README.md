# 🐟 OpenFishTools Studio — Node.js Port

Hasil salinan **1:1** dari https://fishtoolstudio.vercel.app/ (v0.5.14) menjadi aplikasi web **Node.js + Express**,
plus **18 efek layer eksklusif** (v0.6.0 + v0.10.0).

Seluruh tampilan & fitur editor berjalan persis seperti situs aslinya (semua HTML/CSS/JS/effects/shapes/vendor ikut disalin ke folder `public/`), hanya saja kini disajikan lewat server Node.js + bonus REST API penyimpanan project sisi-server.

## Struktur

```
fishtool-nodejs/
├── server.js          # Server Express (halaman + REST API)
├── package.json       # start / dev / test
├── test/
│   └── effects-smoke.cjs  # Smoke test otomatis efek (npm test)
├── public/            # Salinan 1:1 situs asli + 18 efek baru
│   ├── index.html     # Dashboard / daftar project
│   ├── editor.html    # Editor motion graphics & video
│   ├── demo.html      # UI component showcase
│   ├── css/  js/  assets/  effects/  shapes/  text/  vendor/
│   ├── version.json
│   └── CHANGELOG.md
├── EFFECTS.md         # Dokumentasi 18 efek baru + cara bikin efek sendiri
├── AUDIT.md           # Laporan audit full fitur
└── data/
    └── projects.json  # Database file JSON untuk API server
```

## Cara menjalankan

```bash
cd fishtool-nodejs
npm install
npm start
```

Lalu buka:

| Halaman | URL |
|---|---|
| Dashboard | http://localhost:3000/ |
| Editor | http://localhost:3000/editor |
| Showcase | http://localhost:3000/demo |

## Deploy ke Vercel (v0.13.0)

```bash
vercel --prod   # atau: hubungkan repo GitHub di vercel.com → Deploy
```

Tanpa konfigurasi tambahan (`vercel.json` + `api/index.js` sudah disiapkan;
seluruh request ditangani app Express yang sama persis seperti lokal).
Catatan serverless:

- **API project (`/api/projects`) tidak persisten permanen** — tulis jatuh ke
  `$TMPDIR` (hilang saat cold start/redeploy). Project editor sendiri aman
  (tersimpan di IndexedDB browser + file `.ofts`). Untuk persistensi penuh,
  sambungkan database eksternal (mis. Vercel Postgres/KV) di kemudian hari.
- Payload request dibatasi platform (±4,5 MB di paket Hobby) — simpan `.ofts`
  besar sebagai file lokal, bukan via API.
| Health check | http://localhost:3000/api/health |

Mode development (auto-restart saat `server.js` berubah):

```bash
npm run dev
```

Ganti port:

```bash
PORT=8080 npm start
```

Jalankan smoke test efek:

```bash
npm test   # 114 asserts — harus 0 gagal
```

## 🎨 Efek tambahan (v0.6.0, eksklusif port ini)

| Efek | ID | Kategori |
|---|---|---|
| Pixelate / Mosaic | `pixelate` | Layer |
| Zoom Blur | `zoom-blur` | Layer |
| Film Grain | `film-grain` | Lightning |
| Halftone Dither | `halftone` | Lightning |
| Posterize | `posterize` | Lightning |
| Kaleidoscope | `kaleidoscope` | Warp |

Semua 100% Canvas 2D, deterministik (preview = export), keyframeable, dan chain-safe.
Detail parameter + panduan membuat efek sendiri: lihat **[EFFECTS.md](EFFECTS.md)**.

## REST API (tambahan khas versi Node.js)

Aplikasi aslinya menyimpan project di IndexedDB browser. Versi Node.js ini **tetap mendukung itu** (tanpa perubahan), plus menyediakan API server opsional:

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/health` | Cek server hidup |
| GET | `/api/version` | Versi aplikasi |
| GET | `/api/projects` | Daftar project (ringkas) |
| POST | `/api/projects` | Buat project `{name, aspectRatio, resolution, fps, background, data}` |
| GET | `/api/projects/:id` | Ambil 1 project lengkap |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Hapus project |

Contoh:

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Video Ulang Tahun","aspectRatio":"9:16","resolution":"1080p","fps":60}'

curl http://localhost:3000/api/projects
```

## Catatan port

- URL bersih `/editor` & `/demo` didukung, begitu juga `/editor.html` & `/demo.html` (kompatibel dengan link internal `main.js`).
- File `public/js/gdrive-config.js` & `gdrive-sync.js` adalah **stub lokal** — keduanya juga 404 di situs aslinya, jadi dibuatkan versi kosong agar tidak error 404.
- **Tanpa notifikasi saat buka web** — auto-popup Welcome dimatikan permanen (tetap bisa dibuka via tombol Info).
- **Tampilan tablet/desktop** (v0.7.0): `public/css/responsive.css` — dashboard lapang + grid project,
  drawer & galeri efek adaptif, breakpoint 768/1024/1440px (mobile tak tersentuh).
- **Siap deploy Vercel** (v0.13.0): function `api/index.js` + `vercel.json`, storage
  tahan read-only FS (data → tmp → memori).
- **Drag & drop langsung di desktop** (v0.12.0): seret file OS ke mana saja di editor,
  veil panduan tampil, file langsung masuk timeline (anti-impor-ganda zona).
- **Gaya tampilan ala AE/CapCut** (v0.11.0): pilih After Effects atau CapCut di desktop,
  CapCut Tablet atau Klasik di tablet (pengaturan → Tampilan Editor); ponsel tak berubah.
- **12 efek setara Alight Motion — batch 1** (v0.10.0): Gaussian/Directional Blur, Threshold,
  Gradient Map, Replace Color, Chroma/Luma Key, Mirror, Offset, Find Edges, Wipe, Glow.
- **Convert Video → Audio + Regangkan ke aspek** (v0.9.0): tombol Extract Audio satu ketuk
  (MP3 masuk timeline + media pool, video tetap ada), dan tombol Pas/Regangkan di pane
  Scale khusus video & foto.
- **Impor font kustom** (v0.8.0): dropdown Font di panel Edit Text (12 built-in + font sendiri
  `.ttf/.otf/.woff/.woff2`, preview WYSIWYG), tersimpan permanen di IndexedDB.
- **Panel FishTools editor 100% lokal & fungsional** (v0.6.1): 19 file klien di-vendor ke `public/Extension/`
  (tanpa ketergantungan CDN), 11 preset CF_* dan SHKE yang tadinya mati/disabled kini semuanya jalan.
- Lisensi mengikuti proyek asli: **MIT**. Kredit UI & aset: [cutefishaep / OpenFishTools](https://github.com/cutefishaep/OpenFishTools).
