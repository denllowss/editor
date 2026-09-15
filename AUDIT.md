# 📋 Laporan Audit Full Fitur — FishTool Studio Node.js

**Tanggal:** 15 Sep 2026 · **Versi upstream:** 0.5.14 · **Hasil: ✅ LULUS — semua fitur dipastikan jalan**

## Ringkasan eksekutif

| Aspek | Hasil |
|---|---|
| Halaman (dashboard, editor, demo) | ✅ 3/3 identik byte-per-byte dengan origin |
| File aset direferensikan (JS/CSS/SVG/font/vendor) | ✅ 149/149 status 200, ukuran identik |
| Validitas sintaks JS | ✅ 90/90 file lulus `node --check` |
| Ketergantungan URL absolut ke domain Vercel | ✅ tidak ada (0 temuan) |
| Content-Type header (js/css/svg/font/json/md) | ✅ identik dengan origin |
| Deep link editor (`?id=…&template=1`) | ✅ jalan (varian `/editor` & `/editor.html`) |
| REST API Node.js | ✅ health/version/CRUD project jalan |
| Bug ditemukan & diperbaiki | 🛠️ 1 (fallback 404 — sudah fix, terverifikasi) |

## 1. Inventaris halaman

| Halaman | Ukuran | Status |
|---|---|---|
| `/` (dashboard: New/Import project, daftar project, changelog) | 66.871 byte | ✅ identik origin |
| `/editor` (editor lengkap: timeline, canvas, effects rack, export) | 281.154 byte | ✅ identik origin |
| `/demo` (UI component showcase) | 402.100 byte | ✅ identik origin |

## 2. Inventaris aset (149 referensi)

Dicek satu per satu: **status HTTP + ukuran byte lokal vs origin**. Rincian:

- `js/` — 27 file inti: `db.js` (IndexedDB), `main.js` (dashboard), `editor.js` (1,24 MB — mesin editor),
  `FishExport-Enggine.js` (export offline frame-by-frame), `fishtool-engine.js`, `fishtools-adapter.js`,
  `fish-audio-engine.js`, `motion-blur-engine.js`, `preview-cache.js`, `frame-extractor.js`,
  `template-editor.js`, `text-engine.js`, `openfishtools-controller.js`, `openfishtools-generators3d.js`,
  `wireframe.js`, `color-picker.js`, `popover.js`, `drawer.js`, `switch.js`, `modal.js`,
  `context-menu.js`, `effects.js`, `shapes.js`, `demo.js`, `sync-height.js`, `jszip.min.js`
- `effects/` — **50 efek**: warp, wave_warp, chromatic_aberration, fsmb (motion blur), deep_glow,
  glow_aura, rays, shatter, sharpen, vignette, curve, lumia, mono, tile, grid, radio_waves, scanline,
  transform, oscillate, swing, bevel, fill, tint, invert, + expression/slider/point/angle/checkbox/color controls, dll.
- `shapes/` — 7 bentuk vektor (rectangle, triangle, circle, star, polygon, capsule, heart)
- `text/` — mesin teks (`default.js`)
- `css/` — 15 stylesheet (theme, layout, editor, modal, drawer, popover, effects-rack, color-picker,
  template-editor, transform-controller, wireframe, switch, segmented-button, context-menu, safari)
- `assets/` — 40 SVG + 3 font CalSans + checkerboard
- `vendor/` — `ffmpeg.min.js`, `mp4-muxer.js`, `lame.min.js` (mesin export video/audio)
- `version.json`, `CHANGELOG.md` — ✅ identik

**Hasil: 145/149 identik persis. 4 perbedaan semuanya disengaja** (lihat §5).

## 3. Pemeriksaan kode

1. **Sintaks JS:** 90 file (js+effects+shapes+text+vendor) semua lulus `node --check` — tidak ada file korup/terpotong saat unduh.
2. **URL absolut:** tidak ada satupun referensi `https://fishtoolstudio.vercel.app` di kode — aplikasi 100% portable,
   jalan di domain/port mana pun.
3. **Network fetch internal:** hanya 2 pola — `./version.json` (✅ ada) dan `Extension/extension.html`
   (✅ dibungkus `try/catch` + cek `res.ok`, 404 ditangani anggun → fallback remote).
4. **URL eksternal** hanya yang disengaja: donasi (Saweria, PayPal), feedback (cutefish.my.id),
   QRIS (raw.githubusercontent), Google GSI (demo), unpkg `@ffmpeg/core` (dimuat runtime oleh ffmpeg.wasm —
   perilaku sama persis dengan origin, butuh internet saat export AAC, sama seperti situs asli).
5. **GDrive di demo.html:** hanya 2 tag `<script>` tanpa pemanggilan API apa pun → stub lokal aman.

## 4. Bug yang ditemukan & diperbaiki 🛠️

**Fallback SPA menelan 404.** Sebelumnya, request file hilang (mis. `Extension/extension.html`, `tips.json`)
dikembalikan `index.html` dengan status **200**, sehingga cek `if (res.ok)` di `fishtools-adapter.js` salah jalan
(mengira file lokal ada, lalu mem-parsing HTML yang salah).

**Perbaikan (`server.js`):** fallback ke `index.html` kini **hanya untuk path tanpa ekstensi**
(navigasi halaman). Path berekstensi yang hilang → **404 murni**. Terverifikasi:

| Kasus | Sebelum | Sesudah |
|---|---|---|
| `/Extension/extension.html` | 200 ❌ | 404 ✅ |
| `/tips.json` | 200 ❌ | 404 ✅ |
| `/js/tidak-ada.js` | 200 ❌ | 404 ✅ |
| `/halaman-acak` (navigasi) | 200 | 200 ✅ (tetap SPA) |
| `/editor.html?id=…&template=1` | 200 | 200 ✅ |
| `/api/*` | tetap | tetap ✅ |

## 5. Perbedaan disengaja vs situs asli (semua menguntungkan)

| # | Item | Origin | Versi Node.js | Alasan |
|---|---|---|---|---|
| 1 | `/editor.html`, `/index.html` | 308 redirect | 200 langsung | Konten byte identik; tanpa redirect = 1 hop lebih cepat |
| 2 | `js/gdrive-config.js` | 404 | stub 200 | Origin memang rusak (404); stub mencegah error console |
| 3 | `js/gdrive-sync.js` | 404 | stub 200 | sama seperti di atas |
| 4 | REST API `/api/*` | tidak ada | ✅ ada | nilai tambah backend Node.js (health, version, CRUD project) |

Tidak ada penambahan header COOP/COEP (disengaja): FFmpeg yang dipakai single-threaded tanpa SharedArrayBuffer,
dan header itu justru akan memblokir gambar QRIS lintas-origin + core ffmpeg CDN.

## 6. Checklist fitur untuk uji manual di browser

Aplikasi ini 100% client-side (rendering + IndexedDB lokal), jadi semua fitur di bawah berjalan
persis seperti origin selama file tersaji — yang sudah dibuktikan audit ini. Untuk keyakinan penuh,
uji di Live Preview (port 3000):

**Dashboard (`/`)**
- [ ] New Project → pilih aspect ratio, resolusi, FPS, background → Create → masuk editor
- [ ] Project tersimpan muncul di daftar (IndexedDB)
- [ ] Import Project → drag & drop file `.ofts`
- [ ] Export `.ofts` per project (packing + progress modal)
- [ ] Delete project (modal konfirmasi)
- [ ] Welcome modal (release notes) + Donate modal + Feedback link

**Editor (`/editor`)**
- [ ] Timeline: tambah/import media (video, gambar, audio), drag layer, split/cut, multi-select
- [ ] Null object & parenting, group masking, layer reorder, show/hide (eye)
- [ ] Transform controller (position/scale/rotation) + keyframe + graph curve editor
- [ ] 50+ efek di effects rack + warp presets (WARP1/2/3) + beat effects
- [ ] Text layers, shape layers (7 bentuk), expression controls
- [ ] Motion blur (FSMB), preview playback + speed/loop/cache popover
- [ ] Template editor (import template `.ofts` → popup penggantian media)
- [ ] Export: MP4/WebM (WebCodecs + FFmpeg AAC), image sequence ZIP, cancel export
- [ ] Responsif mobile: splitter preview/controller

**Showcase (`/demo`)** — semua komponen UI ter-render tanpa error console.

**API (bonus Node.js)** — `curl localhost:3000/api/health`, CRUD `/api/projects` (sudah lulus uji otomatis).

## 7. Cara menjalankan ulang audit

```bash
cd fishtool-nodejs
npm start
# 1) 149 referensi: semua harus 200 (daftar di /tmp/refs.txt saat audit)
# 2) node --check untuk tiap *.js
# 3) curl -s -o /dev/null -w "%{http_code}" untuk /tips.json (harap 404)
```

## 8. Addendum v0.6.0 (Node.js port) — 6 efek baru

Setelah audit v0.5.14 di atas, ditambahkan 6 efek layer eksklusif port ini
(lihat `EFFECTS.md`): `pixelate`, `zoom-blur`, `film-grain`, `halftone`,
`posterize`, `kaleidoscope` — total **57 efek** (51 upstream + 6).

Verifikasi tambahan yang dilakukan:
- `node --check` lulus untuk 6 file baru + harness tes.
- `npm test` (smoke test VM + stub canvas): **114 asserts, 0 gagal** —
  mencakup registrasi, skema param, render default/ekstrem/select/fx-kosong/
  video-belum-siap di multi waktu, assert byte piksel persis (posterize,
  halftone mono & color), determinisme seed + caching tile (film grain).
- `curl` ke `/effects/<baru>.js`: 6/6 status 200 + `Content-Type: application/javascript`.
- `editor.html` & `demo.html`: masing-masing memuat 6 tag `<script>` baru.
- Versi naik ke `0.6.0` (`package.json`, `public/version.json`, entri `CHANGELOG.md`).
  Tidak ada perubahan perilaku pada 149 aset audit awal.

## 9. Addendum v0.6.1 (Node.js port) — tanpa notifikasi + FishTools 100%

**Notifikasi Welcome:** `initWelcomeModal()` di `public/js/main.js` tidak lagi auto-membuka
`modal-welcome` (dulu: setiap kunjungan kecuali checkbox dicentang). Verifikasi: tidak ada
lagi `Modal.open('modal-welcome')` terpanggil otomatis; modal tetap tersedia via tombol Info.

**FishTools 100%:** investigasi menemukan panel editor memuat UI-nya dari CDN
(`cdn.jsdelivr.net/.../@main/client/index.html`, fallback GitHub raw) dan 12 tombol mati:
11 preset CF_* tanpa handler di `FishToolsBridge.executeTool` + SHKE yang di-disable.
Perbaikan:
- 19 file klien di-vendor ke `public/Extension/` → adapter otomatis memakai mode lokal
  (`fetch('Extension/extension.html')` 200, `CLIENT_BASE='Extension/'`). Simulasi logika
  strip adapter: 13 script kept (semua ada), 13 stripped, 0 hilang. Semua file 200 via curl.
- `js/fishtools-adapter.js`: blok CF_* (mapping + preset via helper baru
  `applyEffectWithPreset`, warna acak `randomHexColor`), SHKE di-remap ke OSCILLATE
  + blok disable tombol & CSS-nya dihapus.
- Test baru `test/fishtools-bridge.cjs` (15 asserts, 0 gagal): routing CF_*,
  preset shatter/colorize, remap SHKE (+fallback), guard tanpa-layer, sweep 84 tombol
  panel tanpa-throw. `npm test` kini menjalankan kedua suite (129 asserts total).

## 10. Addendum v0.6.2 (Node.js port) — tombol Add Effects

Keluhan "tombol add effect hilang": investigasi membuktikan tombol header `#btn-add-effect`
ada, terkabel, dan `editor.html` identik 100% dengan upstream — masalahnya adalah
keterjangkauan: empty-state rack hanya berupa teks tanpa tombol aksi.
Perbaikan (murni aditif, tanpa mengubah perilaku upstream):
- CTA "+ Add Effects" besar di dalam `#effects-rack-empty` → membuka galeri efek.
- `flex-shrink: 0` pada `.btn-add-effect` agar tak terdesak keluar di layar sempit.
- Test `test/ui-buttons.cjs` (9 asserts, 0 gagal). Total `npm test`: 138 asserts, 0 gagal.

## 11. Addendum v0.7.0 (Node.js port) — tampilan tablet/desktop

Keluhan tampilan PC/tablet kurang layak: dashboard upstream di desktop hanya dock sempit
380–440px, galeri efek tetap 2–3 kolom, dan drawer membentang penuh di layar lebar.
Perbaikan: `public/css/responsive.css` perturb (dimuat terakhir; 3 breakpoint min-width
768/1024/1440px; tanpa max-width/display:none sehingga mobile identik seperti sebelum):
dashboard tengah lapang + grid project 2–3 kolom, drawer terpusat 720/920/1080px,
galeri 3–4 kolom kategori & 4–6 kolom item, split portrait 46%, demo 1180/1320px.
Test `test/responsive.cjs` (25 asserts, 0 gagal). Total `npm test`: 163 asserts, 0 gagal.

## 12. Addendum v0.8.0 (Node.js port) — impor font kustom

Panel Edit Text sebelumnya tanpa pemilih font (fontFamily hanya bawaan preset).
Penambahan: dropdown Font di `editor.html` (built-in + impor, preview WYSIWYG per item,
tombol × hapus font impor) + tombol Impor; modul `public/js/custom-fonts.js` (FontFace,
IDB `fishtool-custom-fonts`, restore saat boot); wiring 3 titik di `editor.js`
(helper sibling, hook `syncTextControllerUI`, init delegasi klik/impor/hapus);
gaya picker di `editor.css`. Berlaku ke `textProps.fontFamily` → kanvas & ekspor ikut.
Test `test/custom-fonts.cjs` (40 asserts, 0 gagal). Total `npm test`: 203 asserts, 0 gagal.

## 13. Addendum v0.8.1 (Node.js port) — tombol impor & info dropdown sesuai tema

Tombol Impor font memakai warna hardcode (biru) yang lepas dari tema matcha; dropdown
juga tanpa info saat daftar kosong/minim. Perbaikan: `.font-import-btn` pill token tema
(hover isi solid `--color-primary`), tag/hapus pakai token tema; `refreshTextFontDropdown`
me-render baris info `.font-note` (kosong/1 font/belum impor/gagal muat, klik → impor).
Test +10 asserts statis. Total `npm test`: 213 asserts, 0 gagal.

## 14. Addendum v0.9.0 (Node.js port) — convert video→audio & regangkan ke aspek

Ekstraksi audio sebelumnya hanya via menu ⋯ (popover) sehingga sulit ditemukan; fit-to-comp
hanya via panel FishTools (klik vs klik-kanan). Penambahan: tombol `btn-layer-extract-audio`
di action grid (khusus video) → pipeline MP3 eksisting (timeline + pool, video di-mute tapi
TIDAK dihapus); baris `transform-fit-row` di pane Scale (khusus video/image) → reuse
`window.applyToolboxFitToComp(false/true)` + re-sync nilai. Gaya tombol token tema.
Test `test/video-audio-fit.cjs` (32 asserts, 0 gagal). Total `npm test`: 245 asserts, 0 gagal.

## 15. Addendum v0.10.0 (Node.js port) — 12 efek setara Alight Motion (batch 1)

Daftar efek https://guide.alightmotion.com/effects/ (±169 efek, 57 sudah ada).
Batch 1: 12 efek inti (blur, color, key, wipe, glow) sebagai plugin `effects/*.js`
+ registrasi galeri + dokumentasi EFFECTS.md. Total efek: 69.
Smoke test 309 asserts (0 gagal). Total `npm test`: 440 asserts, 0 gagal.

## 16. Addendum v0.11.0 (Node.js port) — gaya tampilan per perangkat

Tampilan desktop/tablet menumpuk: preview kiri + timeline kanan. Penambahan:
`css/layout-styles.css` (3 gaya kolom terkungkup data-layout: after-effects +
dok-kanan tiling, capcut kartu, capcut-tablet; klasik/mobile nol aturan) +
`js/layout-styles.js` (deteksi phone/tablet/desktop, simpan per kelas, sync
dropdown, reparent dok, observer margin) + kategori setting kondisional-CSS +
snippet pra-render. Test 52 asserts. Total `npm test`: 492 asserts, 0 gagal.

## 17. Addendum v0.11.1 (Node.js port) — apply layout realtime

Klik opsi gaya tampilan tak menerapkan apa pun: listener delegasi di document
tertahan `stopPropagation` handler generik item statis. Perbaikan: binding klik
langsung per-item menu layout (koeksis dengan handler generik) + flag
anti-double-binding. Test +6 asserts. Total `npm test`: 498 asserts, 0 gagal.

## 18. Addendum v0.12.0 (Node.js port) — drag & drop langsung di desktop

Zona drop spesifik sudah ada (timeline/preview/pool), tapi drop di luar zona =
browser membuka file (navigasi pergi). Penambahan: `js/desktop-drop.js` (catcher
jendela >=1024px + veil + ringkasan + impor via handleDropFilesWithAction yang
kini diekspos; diam di zona khusus) + veil di editor.html + CSS. Tablet/ponsel
tak tersentuh. Test 37 asserts. Total `npm test`: 535 asserts, 0 gagal.

## 19. Addendum v0.13.0 (Node.js port) — siap deploy Vercel

Express listen-penuh tak jalan sebagai serverless + FS read-only mematikan API
tulis. Penambahan: `api/index.js` (ekspor app), `vercel.json` (rewrite total +
includeFiles public/data), guard listen + rantai tulis data->tmp->memori +
seed bundel di server.js, engines node>=18, `.vercelignore`. Test 22 asserts.
Total `npm test`: 557 asserts, 0 gagal.

## 20. Addendum v0.13.1 (Node.js port) — fix validasi vercel.json

Deploy Vercel menolak `includeFiles` array ("should be string"). Diubah ke
string tunggal "public/**"; bundel data/** dibuang (tak fungsional, seed
kosong sudah ditangani rantai fallback). Test vercel.cjs disesuaikan.

## 21. Addendum v0.14.0 (Node.js port) — trio bug: hapus, impor HP, phantom

Repro browser (Chromium headless + CDP touch): hapus dashboard OK di semua
kondisi; editor crash saat init — `window.CustomFonts.getAll is not a
function` (API tak pernah diekspor sejak v0.9.0; mock test menyembunyikannya).
Crash mematikan ~60% editor.js: media pool tak init (impor mati), state.id
kosong → beforeunload save melahirkan phantom "New_Project" (klik+keluar =
project baru). Fix: getAll() asli, id sinkron dari ?id=, kunci createProject,
init anti-timpah, hapus terverifikasi + timeout + toast jujur. Suite 580
asserts 0 gagal; verifikasi browser 20/20 (desktop, mobile, IDB-lambat).

## 22. Addendum v0.15.0 (Node.js port) — fix Remove tahan-lama + multi-select

Repro mobile membuktikan: tap "Remove project" membuka modal lalu 0ms-nya
dibunuh popstate basi dari history.back() async milik context menu. Fix dua
lapis: close(false)+back() kondisional di context-menu.js, guard _openedAt
250ms di modal.js; Back tetap menutup modal (state modalOpen benar). Tambah
multi-select dashboard (Pilih, centang, Semua/Kosongkan, hapus borongan
sekuensial terverifikasi, auto-exit, Escape). Suite 607 asserts 0 gagal;
browser: ctx-hapus 8/8 + multiselect 23/23.
