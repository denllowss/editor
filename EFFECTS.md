# 🎨 Efek Tambahan — DenjiMotion Studio Node.js (v0.6.0 + v0.10.0)

18 efek layer baru eksklusif port Node.js ini (6 orisinal v0.6.0 + 12 setara Alight Motion
v0.10.0), dibangun persis mengikuti arsitektur plugin
`effects/*.js` + `FishEffectsRegistry` milik upstream. Semua efek baru:

- **100% Canvas 2D** (tanpa WebGL) → jalan di semua browser & otomatis ikut ter-render saat export MP4/WebM/ZIP.
- **Deterministik** → preview, RAM cache, dan export menghasilkan piksel identik (noise memakai PRNG ber-seed, bukan `Math.random`).
- **Keyframeable** → semua param angka bisa dianimasikan (mis. putar `Rotation` Kaleidoscope dari 0° ke 360°).
- **Chain-safe** → komposisi benar saat ditumpuk dengan efek lain (pengujian mencakup mode pipeline multi-efek).

Total efek sekarang: **51 upstream + 18 baru = 69 efek**.

## Daftar efek baru

### 1. Pixelate / Mosaic — `pixelate` (Layer)
Kotak mozaik retro. Cocok untuk sensor wajah/plat nomor atau estetika 8-bit.

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Cell Size | number | 2–200 px | 16 px |
| Mix | number | 0–100 % | 100 % |

Tips: turunkan `Mix` ke ~50% untuk efek "semi-sensor" sinematik.

### 2. Zoom Blur — `zoom-blur` (Layer)
Blur radial yang menyebar keluar dari titik fokus — kesan melesat / dolly-zoom.

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Amount | number | 0–100 % | 25 % |
| Center X / Center Y | number | −100–100 % | 0 % |
| Quality | number | 3–16 sampel | 8 |

Tips: animasikan `Amount` 0 → 60 tepat di beat drop musik untuk punch transisi.

### 3. Film Grain — `film-grain` (Lightning)
Butir film sinematik overlay, bisa statis atau beranimasi 24 fps.

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Amount | number | 0–100 % | 25 % |
| Grain Size | number | 1–4 px | 1 px |
| Animated | switch | on/off | on |
| Monochrome | switch | on/off | on |
| Blend Mode | select | overlay, soft-light, source-over | overlay |

Tips: matikan `Animated` + `Monochrome` off untuk tekstur foto diam berwarna. Tile noise di-cache:
tidak diregenerasi jika param & frame sama (hemat CPU).

### 4. Halftone Dither — `halftone` (Lightning)
Dithering terurut Bayer 4×4 ala koran/komik retro atau Game Boy.

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Cell Size | number | 2–24 px | 6 px |
| Levels | number | 2–8 | 2 |
| Mode | select | mono, color | mono |
| Mix | number | 0–100 % | 100 % |

Tips: `Levels: 2` + `Mode: mono` = hitam-putih murni 1-bit. Naikkan `Levels` untuk gradasi lebih halus.

### 5. Posterize — `posterize` (Lightning)
Meratakan gradasi warna menjadi level-level tegas khas poster grafis.

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Levels | number | 2–16 | 4 |
| Mix | number | 0–100 % | 100 % |

Tips: tumpuk dengan **Halftone** (urutan: Posterize → Halftone) untuk gaya pop-art.

### 6. Kaleidoscope — `kaleidoscope` (Warp)
Cermin kaleidoskop klasik dengan segmen, rotasi, zoom, dan titik pusat.

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Segments | number | 2–12 | 6 |
| Rotation | angle | −360–360° | 0° |
| Zoom | number | 50–200 % | 100 % |
| Center X / Center Y | number | −100–100 % | 0 % |

Tips: keyframe `Rotation` 0° → 360° selama 4 detik untuk mandala berputar yang loop sempurna.

## Cara memakai di editor

1. Buka `/editor` → pilih layer di timeline.
2. Add Effect → pilih kategori (Layer / Lightning / Warp) → klik nama efek.
3. Atur parameter di effects rack; klik ikon stopwatch/di-amond untuk keyframe.
4. Efek ikut tersimpan di project (`.ofts` / IndexedDB) dan ikut ter-export.

## Cara menambah efek sendiri

1. Buat file `public/effects/nama_efek.js` meniru pola ini:

```js
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry)
    || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  reg.register({
    id: 'efek-saya',          // unik, huruf-kecil + strip
    name: 'Efek Saya',
    category: 'lightning',    // lightning|layer|expression|warp|movement|background
    icon: 'assets/FXPH.svg',
    description: '...',
    params: [
      { id: 'amount', label: 'Amount', type: 'number', min: 0, max: 100, default: 50, unit: '%' },
      // tipe lain: color, select (butuh options[]), switch, angle, curve
    ],
    render(ctx, el, layer, bounds, fx, currentSec) {
      if (!ctx || !el) return;
      const x = bounds.x || 0, y = bounds.y || 0;
      const w = Math.max(1, Math.round(bounds.w)), h = Math.max(1, Math.round(bounds.h));
      // 1. SELALU gambar base dulu (wajib agar chain multi-efek benar):
      try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
      // 2. ...lalu gambar modifikasimu di atasnya...
    }
  });
})(typeof window !== 'undefined' ? window : this);
```

2. Daftarkan `<script src="effects/nama_efek.js"></script>` di `public/editor.html`
   (dan `public/demo.html` bila ingin tampil di showcase).
3. Aturan penting:
   - Tanda tangan render: `render(ctx, el, layer, bounds, fx, currentSec)` — `currentSec` adalah
     sumber waktu resmi (deterministik untuk export). Jangan pakai `Date.now()`/`Math.random()`
     untuk hal yang memengaruhi piksel — pakai PRNG ber-seed bila butuh acak.
   - Sertakan *video readiness guard* (`el.tagName === 'VIDEO' && readyState < 2`) dan
     *identity pass* (param netral → cukup `drawImage`, hemat CPU).
   - Jangan akses `document` di level atas file (agar lolos smoke test Node).
4. Daftarkan file barumu di `test/effects-smoke.cjs` (`NEW_EFFECTS`), lalu jalankan `npm test`.

## Batch 2 — Setara Alight Motion (v0.10.0)

12 efek inti yang namanya sama persis dengan
[Alight Motion Effect Guide](https://guide.alightmotion.com/effects/),
diimplementasi ulang sebagai plugin Canvas 2D dengan perilaku & parameter setara.
(Catatan jujur: shader GPU Alight Motion bersifat closed-source, jadi hasilnya
*setara secara visual & perilaku* — bukan salinan biner piksel-per-piksel.)

### 7. Gaussian Blur — `gaussian-blur` (Layer)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Radius | number | 0–100 px | 10 px |

### 8. Directional Blur — `directional-blur` (Layer)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Direction | angle | −180–180° | 0° |
| Strength | number | 0–100 % | 30 % |
| Quality | number | 3–16 sampel | 8 |

### 9. Threshold — `threshold` (Lightning)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Threshold | number | 0–100 % | 50 % |
| Mix | number | 0–100 % | 100 % |

### 10. Gradient Map — `gradient-map` (Lightning)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Shadow / Midtone / Highlight | color | — | hitam / abu / putih |
| Mix | number | 0–100 % | 100 % |

### 11. Replace Color — `replace-color` (Lightning)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Source / Target | color | — | hijau / merah |
| Tolerance | number | 0–100 % | 30 % |
| Softness | number | 0–100 % | 15 % |
| Mix | number | 0–100 % | 100 % |

### 12. Chroma Key — `chroma-key` (Layer)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Key Color | color | — | hijau |
| Tolerance | number | 0–100 % | 30 % |
| Softness | number | 0–100 % | 15 % |
| Despill | number | 0–100 % | 0 % |

### 13. Luma Key — `luma-key` (Layer)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Mode | select | Key Out Darker, Key Out Brighter | Darker |
| Threshold | number | 0–100 % | 50 % |
| Softness | number | 0–100 % | 10 % |

### 14. Mirror — `mirror` (Layer)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Direction | select | 4 arah | Left to Right |
| Offset | number | −100–100 % | 0 % |

### 15. Offset — `offset` (Layer)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Shift X / Shift Y | number | −100–100 % | 0 % |
| Wrap | switch | on/off | on |

### 16. Find Edges — `find-edges` (Lightning)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Sensitivity | number | 0–200 % | 100 % |
| Invert | switch | on/off | off |
| Mix | number | 0–100 % | 100 % |

### 17. Wipe — `wipe` (Layer)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Direction | angle | −180–180° | 0° |
| Progress | number | 0–100 % | 50 % |
| Feather | number | 0–100 % | 15 % |

### 18. Glow — `glow` (Layer)

| Param | Tipe | Rentang | Default |
|---|---|---|---|
| Color | color | — | putih |
| Radius | number | 0–100 px | 20 px |
| Intensity | number | 0–200 % | 100 % |

### Peta jalan batch berikutnya

Batch 2 (Distort): Pinch/Bulge, Swirl, Spherize, Polar Coordinates, Turbulent
Displace, Bend, Squeeze. Batch 3 (Light & Streaks): Spin Blur, Linear/Spin/Zoom
Streaks, Glow Scan, Light Glow, Lens Flare, Flicker, Blink. Batch 4 (Generate &
Pattern): Checker, Stripes, Dots, Clouds, Gradient 4-warna, Starfield. Batch 5
(Time, Text & 3D): didahulukan yang didukung engine (Pulse, Spin, Shake);
efek path/3D/360° menyusul sesuai kemampuan renderer.

## Pengujian

```bash
npm test   # 440 asserts total (smoke efek: 309) — harus 0 gagal
```

Harness memakai stub canvas-2D + VM Node: tiap efek di-render dengan nilai default,
nilai min/max tiap param, tiap opsi select, `fx` kosong, elemen video belum-siap,
dan waktu berbeda. Assert deterministik memverifikasi byte piksel persis
(posterize/halftone/threshold/gradient-map/replace/chroma/luma/find-edges)
serta stabilitas seed noise (film grain).
