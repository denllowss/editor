/**
 * PIXELATE / MOSAIC - Modular Layer Effect Plugin
 * (Node.js port addition - not part of upstream v0.5.14)
 *
 * Retro mosaic blocks with adjustable cell size and blend mix.
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  let _tiny = null;
  let _tinyCtx = null;

  function ensureTiny(w, h) {
    if (typeof document === 'undefined') return null;
    if (!_tiny) {
      _tiny = document.createElement('canvas');
      _tinyCtx = _tiny.getContext('2d');
    }
    if (_tiny.width !== w || _tiny.height !== h) {
      _tiny.width = w;
      _tiny.height = h;
    }
    return _tinyCtx;
  }

  reg.register({
    id: 'pixelate',
    name: 'Pixelate / Mosaic',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Retro mosaic pixel blocks with adjustable cell size and blend mix',
    params: [
      { id: 'cellSize', label: 'Cell Size', type: 'number', min: 2, max: 200, default: 16, step: 1, unit: 'px' },
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

      const cell = Math.max(1, Math.round(fx && fx.cellSize !== undefined ? fx.cellSize : 16));
      const mix = Math.max(0, Math.min(1, ((fx && fx.mix !== undefined ? fx.mix : 100) / 100)));

      // Identity pass
      if (cell <= 1 || mix <= 0.001) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      const tw = Math.max(1, Math.round(w / cell));
      const th = Math.max(1, Math.round(h / cell));
      const tctx = ensureTiny(tw, th);
      if (!tctx) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      try {
        tctx.clearRect(0, 0, tw, th);
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = 'high';
        tctx.drawImage(el, 0, 0, tw, th);
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      // Base first when blending, then stretched mosaic blocks
      if (mix < 0.999) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
      }
      ctx.save();
      try {
        if (mix < 0.999) ctx.globalAlpha = mix;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(_tiny, x, y, w, h);
      } catch (_) {}
      ctx.restore();
    }
  });
})(typeof window !== 'undefined' ? window : this);
