/**
 * GRADIENT MAP - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Gradient Map" Alight Motion)
 *
 * Memetakan luminansi piksel ke gradien 3 henti (Shadow → Midtone → Highlight).
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

  function hexToRgb(c, fallback) {
    const fb = fallback || [255, 255, 255];
    if (typeof c !== 'string') return fb;
    let s = c.charAt(0) === '#' ? c.slice(1) : c;
    if (s.length === 3) s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2);
    if (s.length !== 6) return fb;
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return fb;
    return [r, g, b];
  }

  reg.register({
    id: 'gradient-map',
    name: 'Gradient Map',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Remap luminance to a 3-stop gradient (Alight Motion equivalent)',
    params: [
      { id: 'shadow', label: 'Shadow', type: 'color', default: '#000000' },
      { id: 'midtone', label: 'Midtone', type: 'color', default: '#808080' },
      { id: 'highlight', label: 'Highlight', type: 'color', default: '#ffffff' },
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

      const c0 = hexToRgb(fx && fx.shadow !== undefined ? fx.shadow : '#000000', [0, 0, 0]);
      const c1 = hexToRgb(fx && fx.midtone !== undefined ? fx.midtone : '#808080', [128, 128, 128]);
      const c2 = hexToRgb(fx && fx.highlight !== undefined ? fx.highlight : '#ffffff', [255, 255, 255]);

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

      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        let a, b, t;
        if (l < 0.5) { a = c0; b = c1; t = l * 2; } else { a = c1; b = c2; t = (l - 0.5) * 2; }
        d[i] = Math.round(a[0] + (b[0] - a[0]) * t);
        d[i + 1] = Math.round(a[1] + (b[1] - a[1]) * t);
        d[i + 2] = Math.round(a[2] + (b[2] - a[2]) * t);
      }

      try {
        wctx.putImageData(img, 0, 0);
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
