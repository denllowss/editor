/**
 * POSTERIZE - Modular Layer Effect Plugin
 * (Node.js port addition - not part of upstream v0.5.14)
 *
 * Reduces the number of tonal levels per channel for a bold,
 * flat graphic-poster look. Adjustable levels and blend mix.
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

  reg.register({
    id: 'posterize',
    name: 'Posterize',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Flat graphic-poster look with adjustable tonal levels and mix',
    params: [
      { id: 'levels', label: 'Levels', type: 'number', min: 2, max: 16, default: 4, step: 1 },
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

      const levels = Math.max(2, Math.min(32, Math.round(fx && fx.levels !== undefined ? fx.levels : 4)));
      const step = levels - 1;

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
        d[i] = Math.round(Math.round((d[i] / 255) * step) / step * 255);
        d[i + 1] = Math.round(Math.round((d[i + 1] / 255) * step) / step * 255);
        d[i + 2] = Math.round(Math.round((d[i + 2] / 255) * step) / step * 255);
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
