/**
 * OUTLINE — Universal stroke effect (Fase 2, v0.27.0).
 * - Mode "alpha": garis mengikuti kontur transparansi (PNG cutout, teks, shape)
 *   via dilasi multi-sampel offscreen + tint source-in, digambar di belakang layer.
 * - Mode "box": stroke persegi di sekeliling bounds layer (murah, 1 draw).
 * Berlaku untuk semua tipe visual (video/image/shape/text/precomp) karena
 * bekerja pada elemen hasil render di pipeline efek (pratinjau + ekspor).
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  // Offscreen daur-ulang untuk siluet (hindari alokasi per-frame).
  let _off = null;
  let _octx = null;

  function hexToRgba(hex, alpha) {
    let c = (hex || '#ffffff').replace('#', '');
    if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
    const num = parseInt(c, 16) || 0;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
  }

  function getOffscreen(w, h) {
    if (typeof document === 'undefined') return null;
    if (!_off) {
      _off = document.createElement('canvas');
      _octx = _off.getContext('2d');
    }
    const nw = Math.max(1, Math.ceil(w));
    const nh = Math.max(1, Math.ceil(h));
    if (_off.width !== nw || _off.height !== nh) {
      _off.width = nw;
      _off.height = nh;
    }
    return _octx;
  }

  reg.register({
    id: 'outline',
    name: 'Outline',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Universal stroke: alpha-following outline for cutouts, or box stroke around layer bounds',
    params: [
      { id: 'width', label: 'Width', type: 'number', min: 0, max: 100, default: 8, unit: 'px' },
      { id: 'color', label: 'Color', type: 'color', default: '#ffffff' },
      { id: 'opacity', label: 'Opacity', type: 'number', min: 0, max: 100, default: 100, unit: '%' },
      { id: 'mode', label: 'Mode', type: 'select', options: ['alpha', 'box'], default: 'alpha' },
      { id: 'quality', label: 'Quality', type: 'select', options: ['fast', 'smooth'], default: 'fast' }
    ],
    render(ctx, el, layer, bounds, fx) {
      if (!ctx || !el) return;
      const x = bounds && bounds.x !== undefined ? bounds.x : 0;
      const y = bounds && bounds.y !== undefined ? bounds.y : 0;
      const w = Math.max(1, bounds && bounds.w !== undefined ? bounds.w : (ctx.canvas ? ctx.canvas.width : 100));
      const h = Math.max(1, bounds && bounds.h !== undefined ? bounds.h : (ctx.canvas ? ctx.canvas.height : 100));

      const width = Math.max(0, fx && fx.width !== undefined ? Number(fx.width) : 8);
      const op = Math.max(0, Math.min(1, ((fx && fx.opacity !== undefined ? fx.opacity : 100) / 100)));
      const mode = (fx && fx.mode) || 'alpha';

      // Passthrough: tidak ada garis terlihat -> gambar biasa (nol overhead ekstra).
      if (!(width > 0) || !(op > 0)) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      const color = (fx && fx.color) || '#ffffff';

      if (mode === 'box') {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        ctx.save();
        ctx.strokeStyle = hexToRgba(color, op);
        ctx.lineWidth = width;
        // Stroke di tengah tepi (konsisten dengan stroke shape bawaan).
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
        return;
      }

      // ---- Mode alpha: dilasi K-sampel mengelilingi radius selebar garis ----
      const samples = (fx && fx.quality === 'smooth') ? 16 : 8;
      const pad = Math.ceil(width) + 1;
      const octx = getOffscreen(w + pad * 2, h + pad * 2);
      if (!octx) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      octx.clearRect(0, 0, _off.width, _off.height);
      octx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < samples; i++) {
        const a = (i / samples) * Math.PI * 2;
        const dx = Math.cos(a) * width;
        const dy = Math.sin(a) * width;
        try { octx.drawImage(el, pad + dx, pad + dy, w, h); } catch (_) {}
      }
      // Tint siluet gabungan (union) menjadi warna garis.
      octx.globalCompositeOperation = 'source-in';
      octx.fillStyle = hexToRgba(color, op);
      octx.fillRect(0, 0, _off.width, _off.height);
      octx.globalCompositeOperation = 'source-over';

      try { ctx.drawImage(_off, x - pad, y - pad); } catch (_) {}
      try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
    }
  });
})(typeof window !== 'undefined' ? window : this);
