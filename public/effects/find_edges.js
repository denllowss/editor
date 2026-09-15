/**
 * FIND EDGES - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Find Edges" Alight Motion)
 *
 * Deteksi tepi Sobel: garis terang di atas latar hitam (atau sebaliknya
 * bila Invert aktif). Sensitivity mengatur ketajaman respons tepi.
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  let _work = null;
  let _workCtx = null;

  function ensureWork(w, h) {
    if (typeof document === 'undefined') return null;
    if (!_work) {
      _work = document.createElement('canvas');
      _workCtx = _work.getContext('2d');
    }
    if (_work.width !== w || _work.height !== h) {
      _work.width = w;
      _work.height = h;
    }
    return _workCtx;
  }

  function isOn(v, dflt) {
    if (v === undefined || v === null) return !!dflt;
    return !(v === 0 || v === false || v === '0' || v === 'false');
  }

  reg.register({
    id: 'find-edges',
    name: 'Find Edges',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Sobel edge detection on black (Alight Motion equivalent)',
    params: [
      { id: 'sensitivity', label: 'Sensitivity', type: 'number', min: 0, max: 200, default: 100, unit: '%' },
      { id: 'invert', label: 'Invert', type: 'switch', default: 0 },
      { id: 'mix', label: 'Mix', type: 'number', min: 0, max: 100, default: 100, unit: '%' }
    ],
    render(ctx, el, layer, bounds, fx) {
      if (!ctx || !el) return;
      const x = bounds && bounds.x !== undefined ? bounds.x : 0;
      const y = bounds && bounds.y !== undefined ? bounds.y : 0;
      const w = Math.max(1, Math.round(bounds && bounds.w !== undefined ? bounds.w : (ctx.canvas ? ctx.canvas.width : 100)));
      const h = Math.max(1, Math.round(bounds && bounds.h !== undefined ? bounds.h : (ctx.canvas ? ctx.canvas.height : 100)));

      // Video readiness guard
      if (el.tagName === 'VIDEO' && (el.readyState < 2 || !el.videoWidth || !el.videoHeight)) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      const mix = Math.max(0, Math.min(1, ((fx && fx.mix !== undefined ? fx.mix : 100) / 100)));

      // Identity pass
      if (mix <= 0.001) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      const sens = Math.max(0, Math.min(4, (fx && fx.sensitivity !== undefined ? fx.sensitivity : 100) / 100));
      const inv = isOn(fx && fx.invert, 0);

      const wctx = ensureWork(w, h);
      if (!wctx) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      let img = null;
      try {
        wctx.clearRect(0, 0, w, h);
        wctx.drawImage(el, 0, 0, w, h);
        img = wctx.getImageData(0, 0, w, h);
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      let out = null;
      try {
        out = wctx.createImageData(w, h);
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      const d = img.data;
      const o = out.data;
      const lumAt = (px, py) => {
        const cx = px < 0 ? 0 : (px >= w ? w - 1 : px);
        const cy = py < 0 ? 0 : (py >= h ? h - 1 : py);
        const j = (cy * w + cx) * 4;
        return 0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2];
      };
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const gx = -lumAt(px - 1, py - 1) - 2 * lumAt(px - 1, py) - lumAt(px - 1, py + 1)
            + lumAt(px + 1, py - 1) + 2 * lumAt(px + 1, py) + lumAt(px + 1, py + 1);
          const gy = -lumAt(px - 1, py - 1) - 2 * lumAt(px, py - 1) - lumAt(px + 1, py - 1)
            + lumAt(px - 1, py + 1) + 2 * lumAt(px, py + 1) + lumAt(px + 1, py + 1);
          let mag = Math.sqrt(gx * gx + gy * gy) / 4 * sens;
          mag = mag > 255 ? 255 : mag;
          const v = Math.round(inv ? 255 - mag : mag);
          const k = (py * w + px) * 4;
          o[k] = v;
          o[k + 1] = v;
          o[k + 2] = v;
          o[k + 3] = d[k + 3];
        }
      }

      try {
        wctx.putImageData(out, 0, 0);
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      if (mix < 0.999) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        ctx.save();
        try {
          ctx.globalAlpha = mix;
          ctx.drawImage(_work, x, y, w, h);
        } catch (_) {}
        ctx.restore();
      } else {
        try { ctx.drawImage(_work, x, y, w, h); } catch (_) {}
      }
    }
  });
})(typeof window !== 'undefined' ? window : this);
