## v0.14.0 (Node.js port) — 15 Sep 2026

### Fixed
- **Akar crash init editor**: `CustomFonts.getAll()` tidak ada padahal dipanggil
  `editor.js` saat init → TypeError menghentikan ~60% script (impor media mati,
  `state.id` tak ter-set, phantom "New_Project" lahir saat keluar editor).
  Kini `getAll()` tersedia (built-in + custom berflag).
- **Phantom project**: id diisi SINKRON dari `?id=` saat state dibuat, save
  bersamaan memakai SATU `createProject` (kunci in-flight), init tak lagi
  menimpa id yang sudah terbentuk. Teruji dengan IDB lambat 2,5 detik.
- **Hapus project**: hasil hapus DIVERIFIKASI ke DB (batas 5 detik), modal
  ditutup belakangan & terjaga, filter refresh hanya bila terverifikasi,
  toast jujur saat gagal ("hilang palsu" mustahil).
- Test `test/bugfix-trio.cjs` (+23 asserts): kontrak API custom-fonts.js ASLI
  via VM (tanpa mock — menutup celah yang menyembunyikan bug ini) + statis
  anti-phantom & hapus-terverifikasi. Verifikasi browser sungguhan
  (Chromium headless, desktop + mobile + race): 20/20 lolos.

---

## v0.13.1 (Node.js port) — 15 Sep 2026

### Fixed
- `vercel.json`: `functions.api/index.js.includeFiles` wajib string tunggal
  (`"public/**"`) — array ditolak validasi Vercel. `data/**` tak perlu dibundel
  (seed kosong ditangani fallback storage).

---

## v0.13.0 (Node.js port) — 15 Sep 2026

### Added
- Siap deploy Vercel: `api/index.js` mengekspor app Express utuh, `vercel.json`
  me-rewrite semua request ke function + bundel `public/**` & `data/**`,
  `server.js` hanya listen saat dijalankan langsung (guard require.main).
- Penyimpanan project tahan read-only FS: tulis ke `./data`, fallback `$TMPDIR`
  (semi-persisten antar invocasi hangat), fallback terakhir memori + seed bundel.
- Test `test/vercel.cjs` (+22 asserts): config, entry, guard, fallback storage,
  dan smoke runtime tanpa port.

---

## v0.12.0 (Node.js port) — 15 Sep 2026

### Added
- Drag & drop file langsung di desktop (>=1024px): seret video/foto/audio dari OS
  ke MANA SAJA di jendela editor → veil panduan tampil (dengan hitungan file) →
  jatuhkan → langsung masuk timeline. Drop di zona khusus tetap ditangani zona
  itu (anti-impor-ganda); drop meleset tak lagi membuka file di browser.
- Test `test/desktop-drop.cjs` (+37 asserts): gerbang lebar, veil, anti-navigasi,
  anti-ganda, impor langsung, ringkasan, dan wiring statis.

---

## v0.11.1 (Node.js port) — 15 Sep 2026

### Fixed
- Pilihan gaya tampilan kini benar-benar diterapkan realtime saat diklik: binding
  diubah dari delegasi document (tertahan stopPropagation handler generik) ke
  binding langsung per-item + flag anti-double-binding.
- Test `test/layout-styles.cjs` +6 asserts klik-realtime (total 58).

---

## v0.11.0 (Node.js port) — 15 Sep 2026

### Added
- Gaya tampilan editor per tipe perangkat (pengaturan → Tampilan Editor):
  desktop After Effects (default; timeline bawah penuh + drawer dok-kanan menempel)
  atau CapCut (kartu mengambang + bottom-sheet); tablet CapCut Tablet (default;
  kolom ala editor tablet) atau Klasik. Ponsel tanpa pilihan (tak tersentuh).
- Opsi setting kondisional murni-CSS: kategori sembunyi di ponsel; opsi desktop
  hanya di desktop, opsi tablet hanya di tablet. Pilihan tersimpan per perangkat,
  diterapkan langsung + snippet pra-render anti-kedip.
- Test `test/layout-styles.cjs` (+52 asserts): batas device, default, persistensi,
  validasi, paritas snippet, dan pengurungan CSS.

---

## v0.10.0 (Node.js port) — 15 Sep 2026

### Added
- 12 efek layer baru setara Alight Motion (batch 1 — Blur, Color & Key):
  Gaussian Blur, Directional Blur, Threshold, Gradient Map, Replace Color, Chroma Key,
  Luma Key, Mirror, Offset, Find Edges, Wipe, Glow. Semua Canvas 2D deterministik,
  keyframeable, chain-safe; otomatis tampil di galeri efek + ikut ter-export.
- Smoke test +195 asserts (total 309): skema, render default/ekstrem/select, guard video,
  dan 8 assert byte piksel persis (threshold, gradient-map, replace, chroma, luma, edges).

---

## v0.9.0 (Node.js port) — 15 Sep 2026

### Added
- Alat Convert Video → Audio satu ketuk: tombol "Extract Audio" di action grid drawer
  (muncul khusus saat layer video dipilih; sebelumnya hanya via menu ⋯). Hasil MP3 192kbps
  otomatis masuk timeline (di sebelah video) + media pool. **Video TIDAK dihapus** —
  tetap di posisi semula, hanya di-mute agar suara tidak dobel (aktifkan lagi via Volume).
- Fitur Regangkan ke ukuran aspek untuk video & foto: tombol "⤢ Pas" (fit, jaga rasio)
  dan "↔ Regangkan" (stretch penuh kanvas) di pane Scale → Transform, tampil khusus
  layer video/image. Memakai ulang toolbox `window.applyToolboxFitToComp` (undo + simpan
  + redraw otomatis), tanpa duplikasi logika.
- Test `test/video-audio-fit.cjs` (+32 asserts): posisi tombol, wiring, reuse toolbox,
  jaminan video tidak dihapus, dan CSS token tema.

---

## v0.8.1 (Node.js port) — 15 Sep 2026

### Fixed
- Tombol "＋ Impor" font diselaraskan ke token tema (pill matcha seperti badge, hover isi
  solid; tanpa warna hardcode sehingga ikut tema alternatif). Tag "Impor" & tombol hapus ×
  juga memakai token tema (`--color-primary`, `--color-danger`).
- Dropdown Font kini memberi info di dalam menu: daftar kosong ("📭 Belum ada font…"),
  tinggal 1 font ("💡 Hanya ada 1 font…"), belum ada impor ("＋ Tambah font sendiri…"),
  dan modul gagal dimuat — semuanya bisa diklik untuk langsung impor (kecuali gagal muat).
- Test `test/custom-fonts.cjs` +10 asserts statis wiring tema & info (total 50).

---

## v0.8.0 (Node.js port) — 15 Sep 2026

### Added
- Impor font kustom di panel Edit Text: dropdown Font baru (12 built-in + font impor user,
  tiap item preview WYSIWYG dengan fontnya sendiri) + tombol "＋ Impor" untuk file
  `.ttf/.otf/.woff/.woff2` (maks 15MB, validasi + pesan ramah Indonesia).
- Modul murni `js/custom-fonts.js` (tanpa dependensi editor): registrasi via FontFace API,
  persistensi IndexedDB sendiri (`fishtool-custom-fonts`, fallback memory-only), restore
  otomatis saat boot + redraw kanvas, dan hapus font via tombol × (semua layer pemakai
  fallback ke Cal Sans).
- Font tersimpan sebagai `layer.textProps.fontFamily` sehingga preview kanvas & ekspor
  otomatis mengikuti; label fallback untuk stack proyek lama/preset.
- Test `test/custom-fonts.cjs` (+40 asserts): validasi file, sanitasi nama, import,
  persistensi + restore antar-reload, hapus, round-trip id/stack, dan mode memory-only.

---

## v0.7.0 (Node.js port) — 15 Sep 2026

### Added
- Lapisan responsif tablet/desktop `css/responsive.css` (hanya kueri min-width 768/1024/1440px;
  mobile <768px dijamin tak tersentuh):
  - Dashboard: panel tengah lapang (pengganti dock sempit 380px), daftar project grid 2 kolom
    (tablet/desktop) → 3 kolom (layar besar), tombol aksi lebih besar, hero membesar progresif.
  - Editor: drawer dibatasi 720/920/1080px rata tengah, galeri efek 3–4 kolom kategori &
    4–6 kolom item, grid media & aksi lebih kaya, default split preview/timeline 46% di portrait.
  - Demo: kanvas showcase 1180/1320px.
- Test `test/responsive.cjs` (+25 asserts): breakpoint, kaskade link, keseimbangan sintaks,
  selektor kunci, dan larangan display:none.

---

## v0.6.2 (Node.js port) — 15 Sep 2026

### Fixed
- Tombol Add Effects "hilang": empty-state rack ("No Effects Applied") kini punya tombol CTA
  "+ Add Effects" yang besar dan langsung membuka galeri efek (`#btn-add-effect-empty` +
  wiring di `editor.js`). Tombol header juga dikeraskan via `flex-shrink: 0` agar tidak
  pernah terdesak keluar layar di viewport sempit.
- Regression test statis `test/ui-buttons.cjs` (+9 asserts): kedua tombol ada tepat 1x
  di posisi benar, terkabel ke galeri, dan CSS-nya lengkap.

---

## v0.6.1 (Node.js port) — 15 Sep 2026

### Removed
- Auto-popup notifikasi Welcome setiap buka web dimatikan permanen (`initWelcomeModal` di `js/main.js`).
  Modal tetap bisa dibuka manual via tombol Info (i) di header dashboard & editor.

### Added
- Panel FishTools di editor kini 100% fungsional & 100% lokal:
  - Vendor 19 file klien FishTools ke `public/Extension/` (HTML, CSS, 13 JS, Logo, 2 font) — panel tidak lagi
    bergantung pada CDN/jsDelivr/GitHub raw saat dibuka.
  - 11 tombol preset CF_* yang tadinya mati kini jalan: Colorize (warna acak), Scanline, Mono, Glow Aura,
    Solid Aura, Starburst/Grid/Radio (kombo + bevel + drop shadow), Shatter Simple/Slow (preset cepat/lambat),
    Drop Bevel (kombo bevel + drop shadow).
  - SHKE (S_Shake) yang tadinya disabled kini aktif sebagai pengganti web berbasis oscillate.
- Test routing bridge `npm test` (+15 asserts): mapping CF_*, preset param, remap SHKE, guard tanpa-layer,
  dan sweep 84 tombol panel tanpa-throw.

---

## v0.6.0 (Node.js port) — 15 Sep 2026

### Added
- 6 efek layer baru eksklusif port Node.js: Pixelate / Mosaic (`pixelate`), Zoom Blur (`zoom-blur`),
  Film Grain (`film-grain`), Halftone Dither (`halftone`), Posterize (`posterize`), Kaleidoscope (`kaleidoscope`).
  Semua 100% Canvas 2D, deterministik (preview = export), dan keyframeable.
- Smoke test otomatis `npm test` (114 asserts): validasi registrasi, skema param, render tanpa-throw,
  serta assert deterministik piksel & animasi grain.

---

# Changelog

All notable changes to OpenFishTools Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.14] - 2026-09-14

### Added
- **Smart Look-Ahead Playback Caching (`js/preview-cache.js`)**: Introduced `startLookaheadWorker(fromSec, fps)` — during playback, a background worker pre-renders frames **ahead** of the current playhead into the RAM preview cache (default 1.5 s window, configurable via `window.cacheLookaheadSec`). Uses `MessageChannel` macro-tasks to fire reliably between `requestAnimationFrame` ticks without blocking the main render thread. The lookahead window slides forward with the playhead and auto-restarts only when the playhead advances past the worker's range. Worker stops cleanly on pause, scrub, or export.

### Fixed
- **Look-Ahead Worker Cancel Bug**: Previous implementation called `stopLookaheadWorker()` on every 3rd tick, cancelling the worker before it could render a single frame. Fixed: worker now persists until the playhead advances past its pre-baked range.
- **Canvas Corrupt Mid-Encode Bug**: Worker now `await`s `setFrameFromCanvas` (bitmap encode) **before** scheduling the next step, preventing the offscreen canvas from being overwritten while `createImageBitmap` is still running.
- **O(1) Queue Tail Tracking**: Replaced `Math.max(...queue)` spread (O(n), stack risk on large queues) with a `_lookaheadQueueTail` pointer for O(1) queue extension as the lookahead window slides.

### Improved
- **Canvas 2D Context Caching (`js/editor.js`)**: `renderCanvasFrame` now caches the `2d` context on the canvas element (`canvas._cachedCtx`) instead of calling `getContext()` on every frame. Context is only re-created when `alpha` mode changes (normal → export path). Eliminates redundant browser context lookup overhead per tick.
- **`imageSmoothingQuality` Per-Frame Write Eliminated**: Safari smoothing quality (`'high'`) is now set once per canvas context creation instead of being written every frame, removing a GPU state write per render tick.
- **Look-Ahead Cache Write Guard (`js/editor.js`)**: `renderCanvasFrame` now excludes `triggerSource === 'lookahead-cache'` from the main live-frame cache write path — the lookahead worker writes directly via `setFrameFromCanvas`, preventing double-encode of the same frame.

---

## [0.5.13] - 2026-09-12

### Added
- **Single Source of Truth (SSOT) Versioning (`scripts/sync-version.js`)**: Unified project version management into `version.json`. Changing `version.json` (or running `npm run bump <version>`) automatically synchronizes `package.json`, HTML badges, script cache busters, and release notes feeds across `index.html`, `editor.html`, and `demo.html`.
- **Live Dev Server Version Synchronizer (`server.js`)**: Hooked `syncVersion()` directly into `fs.watch(ROOT)`. Editing and saving `version.json` in any editor immediately propagates new version data and reloads the browser.

### Improved
- **Template Editor Initial-Import Auto-Open & Clean Refresh**: Exported `.ofts` project packages now include `isTemplate: true` so the Template Editor pops up automatically on first import. Once displayed, `isTemplate` immediately resets to `false` in memory and IndexedDB and `&template=1` is removed from the URL, guaranteeing the Template Editor never re-appears unexpectedly on browser refresh.
- **Zero Hardcoded Fallback Versions**: Completely eliminated hardcoded fallback version strings in `js/main.js`, `js/editor.js`, and `js/FishExport-Enggine.js`. Runtime components now dynamically query `version.json` or the DOM changelog feed, degrading cleanly without hardcoded version literals.

---

## [0.5.12] - 2026-09-12

### Added
- **Mobile Horizontal Preview Splitter Handle (`.preview-split-handle`)**: Introduced an interactive horizontal drag handle anchored directly on the boundary seam (`top: 0; transform: translateY(-50%)`) between the preview canvas and the controller bar on mobile viewports (`<= 600px`). Allows users to fluidly enlarge or shrink preview height vs timeline height (constrained from 22% to 78%).
- **Theme-Bound Borderless Controller Surface**: Styled the handle pill with pure `var(--bg-panel)` color matching the controller background, with 100% borderless/outlineless geometry (`border: none; outline: none;`) and dynamic neon feedback on hover, touch, and active dragging (`var(--color-primary-hover)` / `var(--color-primary-active)`).
- **Splitter Component Showcase Integration**: Added Section 6b to `demo.html` with a live interactive dragging sandbox and clean boilerplate HTML snippet.
- **Persistent Mobile Preview Sizing**: Automatically caches user's custom preview split height into `localStorage.oft_mobile_preview_height` and synchronizes ruler, playhead needle, and canvas scale in real-time.

---

## [0.5.11] - 2026-09-12

### Fixed
- **Image Sequence (.ZIP) Cancellation & Instant Cache Purge**: Fixed critical issue where clicking "Cancel Export" during Image Sequence export failed to stop execution, causing frames to keep rendering in the background, compressing into a ZIP, and triggering a download. Unified export cancellation across `editor.js` and `FishExport-Enggine.js` (`isExportCancelled = true`, `window.isExportCancelled = true`, `window.isExporting = false`). Added per-frame abort checks, in-memory `zip.files` buffer disposal, canvas deallocation, and automatic trigger of `cleanupAllStudioCaches('export_cancelled')`.
- **Safari Full Video + Audio MP4 Export (Single-Threaded FFmpeg WASM)**: Fixed issue where Safari exported audio-only MP4 files and distorted/cropped video. Identified that Tier 1 WebCodecs prematurely bypassed itself because it falsely assumed FFmpeg remuxing required `SharedArrayBuffer` (which Safari disables without `require-corp`). Bundled FFmpeg.wasm (`ffmpeg-core.wasm`) is 100% single-threaded and executes natively on Safari without `SharedArrayBuffer` or Cross-Origin-Isolation. Tier 1 WebCodecs now renders crisp, uncropped, full-resolution (e.g. 1080x1920 portrait) GPU frames into MP4, followed by an instantaneous (<200ms) `-c:v copy -c:a aac` audio remux.
- **Studio Cache Purge In-Flight Deduplication**: Added in-flight promise lock in `js/db.js` (`cleanupAllStudioCaches`) to prevent redundant, concurrent purge operations when cancellation triggers across multiple modules simultaneously.
- **MediaRecorder WebKit Frame Capture & Repackaging (Tier 2 Fallback)**: Prevented WebKit GPU compositor from dropping frames in Tier 2 fallback by ensuring the canvas has explicit resolution matching composition and is actively composited (`opacity: 0.01` with `requestFrame()` signal), and enabled single-threaded FFmpeg WebM-to-MP4 container conversion across all browsers.

---

## [0.5.2] - 2026-09-12

### Fixed
- **Safari WebKit Export Modal & Header Popover Dismissal**: Fixed issues where clicking "Export Video (.MP4)" on Safari caused the export modal to dismiss almost immediately (~5ms) and the header Export popover failed to appear on click. Resolved popstate race conditions in `Popover.close()` and eliminated redundant click listeners that triggered instant toggle-close cycles in `Popover.open()`.
- **Safari Video Export Reliability & Direct AAC Muxing**: Fixed VideoToolbox encoder probe failures on macOS/iOS Safari by rendering active pixel data on probe canvases and extending hardware encoder initialization timeouts to 1000ms. Added native `video/mp4` MediaRecorder fallback (Tier 2) and in-memory WebCodecs `AudioEncoder` AAC muxing directly into `Mp4Muxer`, bypassing `SharedArrayBuffer` errors.
- **Safari Popover Tail Arrow Rotation**: Fixed issue where popover arrow tail rendered as unrotated flat square in Safari instead of 45-degree angled diamond. Scoped Safari hardware acceleration selector in `css/safari.css` strictly away from `.popover-tail`, and added explicit `-webkit-transform` and `-webkit-transform-origin: 50% 50%` rules in `css/popover.css` and `css/safari.css`.
- **Template Editor Duplicate Media Cards on Cut/Split Clips**: Resolved issue where splitting or cutting an image/video on the timeline spawned redundant 4th/duplicate cards in the Template Editor Replace Media deck. Timeline split pieces now inherit `sourceLayerId`, and `_collectReplaceableSlots` employs universal Media Pool gathering across IndexedDB and all session memory pools, grouping all cuts and occurrences of the same source asset into a single slot.

- **Template Editor Auto-Open on Project Import**: All imported `.ofts` project packages now automatically launch directly into the Template Editor on first opening (`&template=1` and `projectData.isTemplate = true`).
- **Export Progress UI & Engine Badge Overhaul**: Completely eliminated hyperbolic labels (such as "FFMPEG CPU"). Added a flat, borderless `.export-engine-badge` (`GPU` vs `CPU`) styled in bright theme tokens (`var(--color-primary)`) with high-contrast dark text (`var(--bg-canvas)`). Simplified frame rendering progress text to display frame numbers directly (e.g. `135 / 300`) without wordy prefixes.
- **WebCodecs VideoToolbox "Encoding Task Failed" Resolution**: Fixed WebKit VideoToolbox crash (`VideoEncoder encode failed: Encoding task failed`) in macOS Safari by isolating canvas draws using `createImageBitmap(exportCanvas)` before wrapping into `VideoFrame(bmp)` to prevent iOSurface buffer locking collisions during active rendering. Configured dynamic resolution-aware H.264 levels (`33` for 4K, `2a` for 1080p), prioritized offline `latencyMode: 'quality'` to eliminate low-latency hardware constraints, ensured strictly monotonic microsecond timestamps with keyframe guarantees, and guarded Tier 2 `captureStream` for Safari fallback.
- **Export GPU WebCodecs Acceleration & Timeline Double-Cache Bypass**: Optimized WebCodecs VideoToolbox hardware encoder probing for Safari and Chrome, offscreen DOM canvas layer backing, and full-resolution buffer probing to eliminate slow CPU FFmpeg fallbacks. Completely bypassed timeline preview caching, ruler redrawing, and background idle caching during export rendering to eliminate double processing and render lag.
- **Idle Cache Default Disabled**: Changed background idle caching default state from enabled to disabled (`oft_idle_cache: false`), conserving RAM and background CPU resources until explicitly requested.

### Improved
- **Timeline Left Lane UI (Eye-Only Compact Pill)**: Removed unnecessary layer thumbnail preview circle (`.timeline-layer-thumb-circle`) from timeline layer heads to reduce visual clutter and maximize lane efficiency. The left lane now features a dedicated, streamlined 34x38px eye toggle button (`.timeline-layer-eye-btn`).
- **Timeline Right Handle UI (Theme-Token Dynamic Contrast)**: Completely replaced buggy `mix-blend-mode: difference` and hardcoded white `#ffffff` with 100% theme token colors (`css/theme.css`). Implemented ultra-lightweight 1-line coordinate detection (`updateReorderHandlesContrast`) with `.is-over-clip`: renders deep dark canvas (`var(--bg-canvas)`) when over bright clips, and vibrant primary theme color (`var(--color-primary)`) when over dark track canvas. Zero GPU/CPU overhead, 100% cross-browser compatible.

---

## [0.5.1] - 2026-09-12

### Fixed
- **Template Editor Duplicate Media Cards ("Replace Media")**: Resolved issue where identical media reused across multiple cut layers created duplicate cards in the Replace Media grid. The Template Editor now resolves layers directly against the project Media Pool (`window.FishDatabase.getProjectMedia` and `window._activeMediaMap`) matching by `mediaId`, file name, dataUrl, and thumbnail. Timeline cuts of the same media pool item group cleanly into a single card with cumulative duration, and replacing media updates all linked layers and the Media Pool item simultaneously.
- **Safari WebKit Compatibility for Lightning Effects**: Resolved silent failure of Lightning category effects (`brightness-contrast`, `exposure-gamma`, `saturation-vibrant`, `highlight-shadow`, `invert`, `mono`, `lumia`, `diffusion`, `unsharp-mask`, etc.) on Safari caused by lack of `CanvasRenderingContext2D.filter` support and WebKit `<video>` WebGL texture upload constraints. Added `FishEffects.isCanvasFilterSupported()` runtime probe, `FishEffects.drawBlurred()` multi-pass pyramidal box downscale/upscale smoothing fallback, and WebGL scratch canvas texture uploads.
- **Transform Mode Center Offset & Timeline Vertical Shift**: Fixed viewport centering offset when switching to transform mode, and resolved unexpected timeline vertical displacement.
- **Timeline Layer Drag vs Popover Conflict**: Replaced instant drag activation with a hold-to-drag gesture. Holding without releasing enables horizontal layer sliding without opening the context popover; quick tap and release triggers the popover menu.

### Added
- **Media Occurrence Counter Badge**: Added `.template-card-badge-count` (`2x`, `3x`, etc.) in the top-right corner of template media cards when a media asset appears across multiple timeline cuts.
- **Multi-Occurrence Scrubber Range Highlights**: Selecting a grouped media slot in the Template Editor highlights all timeline segments where that media appears simultaneously along the scrubber track.

---

## [0.5.0] - 2026-09-11

### Removed
- **Google Drive Cloud Save** — Complete removal of GDrive integration. Deleted `js/gdrive-sync.js` (839 lines) and `js/gdrive-config.js` (89 lines). Removed all cloud UI from `index.html` (cloud tab panel, login box, user bar, gdrive config modal) and `editor.html` (cloud status icon, remote update banner). Cleaned all GDrive CSS from `css/layout.css` and `css/editor.css`. Stripped all GDrive JS from `js/editor.js` (media hooks, `triggerGDriveSync`, save bypass, project load block, cloud status UI) and `js/main.js` (`initGDriveDashboard`, cloud project list, `isCloud` branches). Project source is now always `local`.

---

## [0.4.9] - 2026-09-11


### Fixed
- **Timeline Visual Offset on Project Open**: Clip blocks appeared horizontally offset from the ruler immediately after opening a project, but snapped to the correct position when zooming. Root cause: `renderTimeline()` has a RAF guard (`if (panX === lastRenderedPanX) return`) that prevents redundant repaints — on first project load (async), the guard blocked the CSS `translate3d` transform from ever being applied to `rulerTrack`/`layersTrack`, so clip blocks rendered at their absolute `left: startPx` without the container offset. Fix: call `updateTimelinePosition(panX, immediate=true)` immediately after `renderTimelineLayers()` on project load to force a synchronous transform flush.

---

## [0.4.8] - 2026-09-11

### Added
- **Offline Frame-by-Frame Export Engine (`FishExport-Enggine.js`)**: Introduced a dedicated standalone export engine that replaces the real-time playback-based MediaRecorder capture with a true deterministic offline render loop. Each frame is rendered at `t = i / fps` (exact timestamp, never wall-clock elapsed time), guaranteeing zero dropped frames regardless of render complexity or GPU load.
- **WebCodecs + Mp4Muxer Primary Path**: On Chrome/Edge/Safari, frames are GPU-encoded via `VideoEncoder` (H.264/VP9) and muxed directly into `.mp4` using `Mp4Muxer` — no real-time capture latency.
- **FFmpeg.wasm CPU Fallback Path**: When WebCodecs is unavailable, the engine renders each frame to JPEG and encodes via `libx264` through FFmpeg.wasm, producing a standards-compliant `.mp4` at full project resolution and FPS.
- **Audio Offline Mixdown**: Audio is mixed via `OfflineAudioContext` (true offline, non-real-time) and merged with the video stream via FFmpeg AAC encode — never tied to playback timing.
- **Engine Delegation**: `exportVideoMP4` in `editor.js` now delegates MP4 exports to `FishExportEngine.export()`. WebM format retains the fast MediaRecorder path.

### Fixed
- **Choppy / Patchy Export Output**: Root cause was MediaRecorder recording wall-clock timestamps. If rendering 1 frame took 80ms (due to heavy effects), the output video naturally had only ~12 FPS instead of 60 FPS. The new offline engine eliminates this entirely — render speed has zero effect on output FPS or smoothness.

---

## [0.4.7] - 2026-09-11

### Fixed
- **WebCodecs Active Probe Verification**: Resolved `DOMException: The given encoding is not supported` on Mozilla Firefox and Hackintosh AMD environments by establishing active `probeEncoderConfig` verification before video export begins, preventing false-positive `VideoEncoder.isConfigSupported` errors from causing runtime export crashes.
- **FFmpeg WebM to MP4 Remux & Transcode**: Resolved `Could not find tag for codec vp8 in stream #0` error when converting MediaRecorder output into MP4. Replaces naive direct copy (`-c copy`) with standards-compliant H.264 (`libx264 ultrafast`) and AAC audio transcode, while preserving fast stream copy when recorded stream is already H.264.
- **Virtual Filesystem Cleanliness**: Virtual FS now aggressively unlinks temporary files (`rec_in.webm`, `rec_out.mp4`, `v_temp.mp4`) before and after operations to eliminate file collision and memory leaks.

### Added
- **Export Format Switch (MP4 / WebM)**: Introduced a format selector in the Export Video modal (`#export-format-switch`), allowing instantaneous 0-second export to native `.webm` without CPU-heavy FFmpeg transcoding.
- **Browser Environment Auto-Detection**: Auto-detects browser capabilities; defaults to `WebM (Fast)` on Mozilla Firefox or platforms without native hardware MP4 encoding, and defaults to `MP4 (H.264)` on Chrome/Edge/Safari for hardware GPU acceleration.

---

## [0.4.6] - 2026-09-10

### Fixed
- **Null Expression Beat Marker Scoping**: Resolved an issue where stacked null layers (e.g. `X BEAT`, `Y BEAT`, `OSCILLATE`) had composition beat markers improperly restricted to adjacent null layer durations, enabling null beat expressions to evaluate freely across their full duration regardless of other null trims.
- **Motion Blur on Chained / Null-Driven Layers**: Added null hierarchy transform evaluation to `FishMotionBlurEngine` (`motion-blur-engine.js`), allowing layers moved by parent expressions without raw keyframes to correctly activate velocity-based sub-frame multi-sampling.
- **Space Lock Input Guard**: Added `typeof el.getAttribute === 'function'` check in `isTextInputElement` (`editor.js`) to prevent `TypeError` when Space key is pressed while `document` or `window` has focus.

### Added
- **Timeline Empty State**: Introduced a clean, centered placeholder in the timeline viewport displaying the upload icon and *"Drop media here to import"* text when no layers are present, with interactive color adaptation on dragover.

### Improved
- **After Effects Timeline Link Connectors**: Redesigned parent-child hierarchy connector lines in `#timeline-layers-track` to match After Effects 1:1, featuring smooth Bézier/quadratic corner curves (`R = 6`), channel nesting without overlap, origin dot on parent left edge, arrowhead pointing into child left edge, and intermediate junction nodes.

---

## [0.4.5] - 2026-09-10

### Added
- **OpenFishTools Warp Presets (`WARP1`, `WARP2`, `WARP3`)**: Added a dedicated "Preset" section under Beat Effects featuring one-click multi-layer adjustment presets (`Mid-Wave`, `Ghost Effect`, `Hue Spin`, `Warp Effect`) with automatic layer stacking, synchronized keyframes, and cubic Bézier easing curves.

### Fixed
- **Timeline Playhead Synchronization & Sub-frame Drift**: Resolved background cache render pollution of `window.currentSec` during asset preview generation; established `getCurrentPlayheadTime()` with strict project-FPS frame-snapping so presets land precisely on the current playhead frame.
- **Wave Warp Effect Rendering**: Enhanced `effects/wave_warp.js` to support smooth-noise wave synthesis, direction angle handling, speed/phase offsets, and seamless edge tiling.

### Improved
- **Debug & Layer Inspector Telemetry**: Expanded OpenFishTools Debug Inspector with real-time playhead timecode, multi-layer sequence duration metrics, and layer property overview for precision inspection.

---

## [0.4.4] - 2026-09-10

### Fixed
- **Debug / Layer Inspector Relocation**: Relocated Debug panel from Composition Settings header to OpenFishTools Settings panel (`Extension/extension.html`), complete with JSON state copying and live status indicators.
- **IndexedDB Storage Calculation**: Fixed project database storage calculation to accurately account for all raw binary media blobs and frame render cache.
- **Template Editor Media Replace**: Media replacement dock is now pinned to the top on desktop, and media cards are enlarged on mobile for easier touch manipulation.
- **Template Media Slot Isolation**: Prevented audio and video tracks from automatically entering template replacement slots.
- **Audio Type Handling**: Corrected audio MIME type detection during media replacement in Template Editor.
- **Scrollbar UI Visibility**: Removed forced global `hide scrollbar` rule (`display: none`), replacing it with clean, theme-matched slim Matcha scrollbars across all scrollable lists.

### Added
- **OFTS Export Progress Modal**: Added real-time export progress modal with DEFLATE Level 9 compression for fast and lightweight `.ofts` project package export.
- **FSMB (Fish Motion Blur)**: Added velocity-based frame blending motion blur effect for moving layers.
- **Playback Controls Popover**: Added quick playback controls (Loop On/Off, Playback Speed 0.5x–2x, Realtime RAM Cache On/Off) accessible via long-press on the Play button.
- **Changelog Section on Welcome Modal**: Added comprehensive multi-version changelog feed directly inside the Welcome modal with category badges (*Fixed*, *Added*, *Improved*, *Changed*).

### Improved
- **Welcome Modal Tone**: Refined Welcome notice copy to be objective, friendly, and transparent regarding the active Alpha development stage.
- **Playback RAM Cache**: Optimized preview RAM cache clamping for smoother, more consistent 60 FPS playback.

---

## [0.4.3] - 2026-09-08

### Fixed
- **Multi-layer Keyframe Shift**: Synchronized keyframe shifting when adjusting multi-layer duration in the timeline, isolating interactions to active properties.
- **Expression Persistence**: Ensured layer expression scripts persist intact across project serialization and undo/redo history snapshots.
- **Audio Detection**: Fixed AAC/MP3 audio format detection during timeline import and playback.

### Improved
- **Preview Cache RAM Optimization**: Dynamic preview cache clamping and frame memory allocation for smoother 60 FPS rendering.

---

## [0.4.2] - 2026-09-05

### Fixed
- **OFTS Export/Import Memory Crash**: Sanitized runtime memory caches (`videoFrames`, `canvasBuffers`, blob URLs) before export and optimized memory allocation during large project imports to prevent browser tab crashes.
- **Runtime Blob Sanitization**: Periodic garbage collection of canvas buffer references during editor page navigation.

---

## [0.4.1] - 2026-09-02

### Added
- **Multi-layer Selection Drag**: Ability to select and drag multiple layers simultaneously across the timeline.
- **Multi-copy Paste 1:1**: Batch layer duplicate and paste preserving exact timing intervals and relative offset relations.
- **Null Object Hierarchy & Layer Parenting**: Hierarchical transform parenting support between layers and null object controllers.
- **Group Masking (Alight Motion style)**: Mask group and exclude group creation with blend mode options (*destination-in* & *destination-out*).

### Fixed
- **Audio Scrubbing Glitch**: Eliminated audio popping and distortion noise during rapid timeline playhead scrubbing.
- **Wireframe Selection Retain**: Maintained bounding wireframe transform box during playback for currently selected layers.

---

## [0.3.0] - 2026-08-25

### Added
- **Modular Layer Effects Registry**: Extensible modular JavaScript layer effects plugin architecture under `effects/` (`FishEffectsRegistry`).
- **Graph Curve Editor**: Interactive keyframe bezier curve editor with control handle nodes, tangent lines, and preset rails.
- **Contextual Selection Navigation**: Dynamic header actions when layers are selected (rename, precompose, group mask, parenting).
- **Vector Preset Icons**: Added Group Mask and Exclude vector icons styled after Alight Motion.

### Fixed
- **3D Depth Calculation**: Corrected z-depth axis calculations in 3D generator component rendering.
- **Database Error Resilience**: Graceful error recovery and silent catch handlers across storage and renderer engines.

### Improved
- **Codebase Modularization**: Extracted inline HTML scripts into clean, decoupled module files inside `js/`.
- **Matcha Theme Standardization**: Standardized 100% theme color tokens from `css/theme.css` and Cal Sans typography.

---

## [0.2.0] - 2026-08-15

### Added
- **Motion Blur Engine**: Integrated motion blur calculation engine with Shutter Angle and Shutter Phase settings.
- **Text Engine**: Full typography text layer creation and editing support.
- **Transform Controller**: Interactive controller for position, scale, rotation, anchor point, and opacity properties.
- **Shape Asset Library**: Added basic vector shapes (Star, Heart, Capsule, Polygon) under `assets/Shape/`.
- **Responsive Splitter Handle**: Vertical pill-shaped drag handle for fluid dynamic timeline pane resizing on desktop and tablet viewports.

### Improved
- **Modal Navigation System**: Standardized responsive popups (slide-down on mobile, center scale-in on desktop) with native browser back button (`popstate`) handling.

---

## [0.1.0] - 2026-08-01

### Added
- **First Public Release**: Initial launch of OpenFishTools Studio as an in-browser motion graphics and video editor.
- **Multi-layer Timeline**: Multi-layer timeline editor with duration controls, trim in/out, and playhead scrubbing.
- **OpenFishTools CEP Integration**: CEP extension panel adapter via iframe bridge.
- **Client-Side Project Storage**: Local browser-based storage engine using IndexedDB (`FishDatabase`).
- **OFTS Project Format**: Native `.ofts` (OpenFishTools Studio) project package format for offline saving and loading.
