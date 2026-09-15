/**
 * HALFTONE DITHER - Modular Layer Effect Plugin
 * (Node.js port addition - not part of upstream v0.5.14)
 *
 * Retro ordered (Bayer 4x4) dithering in mono or color with
 * adjustable cell size, levels and blend mix.
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  const BAYER4 = [
     0,  8,  2, 10,
    12,  4, 14,  6,
     3, 11,  1,  9,
    15,  7, 13,  5
  ];

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
    id: 'halftone',
    name: 'Halftone Dither',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Retro ordered Bayer dithering in mono or color with levels and mix',
    params: [
      { id: 'cellSize', label: 'Cell Size', type: 'number', min: 2, max: 24, default: 6, step: 1, unit: 'px' },
      { id: 'levels', label: 'Levels', type: 'number', min: 2, max: 8, default: 2, step: 1 },
      { id: 'mode', label: 'Mode', type: 'select', options: ['mono', 'color'], default: 'mono' },
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

      const cell = Math.max(1, Math.round(fx && fx.cellSize !== undefined ? fx.cellSize : 6));
      const levels = Math.max(2, Math.min(16, Math.round(fx && fx.levels !== undefined ? fx.levels : 2)));
      const mono = ((fx && fx.mode) || 'mono') === 'mono';
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
      for (let py = 0; py < h; py++) {
        const by = (((py / cell) | 0) % 4 + 4) % 4;
        for (let px = 0; px < w; px++) {
          const bx = (((px / cell) | 0) % 4 + 4) % 4;
          const t = (BAYER4[by * 4 + bx] + 0.5) / 16 - 0.5;
          const o = (py * w + px) * 4;
          if (mono) {
            const lum = (d[o] * 0.2126 + d[o + 1] * 0.7152 + d[o + 2] * 0.0722) / 255;
            let q = Math.round(lum * step + t);
            q = q < 0 ? 0 : (q > step ? step : q);
            const v = Math.round((q / step) * 255);
            d[o] = v; d[o + 1] = v; d[o + 2] = v;
          } else {
            for (let c = 0; c < 3; c++) {
              const nl = d[o + c] / 255;
              let q = Math.round(nl * step + t);
              q = q < 0 ? 0 : (q > step ? step : q);
              d[o + c] = Math.round((q / step) * 255);
            }
          }
        }
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
