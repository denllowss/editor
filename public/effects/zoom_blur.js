/**
 * ZOOM BLUR - Modular Layer Effect Plugin
 * (Node.js port addition - not part of upstream v0.5.14)
 *
 * Radial zoom blur streaking outward from a focal center point.
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
    id: 'zoom-blur',
    name: 'Zoom Blur',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Radial blur streaking outward from a focal center point',
    params: [
      { id: 'amount', label: 'Amount', type: 'number', min: 0, max: 100, default: 25, unit: '%' },
      { id: 'centerX', label: 'Center X', type: 'number', min: -100, max: 100, default: 0, unit: '%' },
      { id: 'centerY', label: 'Center Y', type: 'number', min: -100, max: 100, default: 0, unit: '%' },
      { id: 'samples', label: 'Quality', type: 'number', min: 3, max: 16, default: 8, step: 1 }
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

      const amount = Math.max(0, Math.min(1, ((fx && fx.amount !== undefined ? fx.amount : 25) / 100)));

      // Identity pass
      if (amount <= 0.001) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      const samples = Math.max(2, Math.min(16, Math.round(fx && fx.samples !== undefined ? fx.samples : 8)));
      const cx = x + w * (0.5 + (fx && fx.centerX !== undefined ? fx.centerX : 0) / 200);
      const cy = y + h * (0.5 + (fx && fx.centerY !== undefined ? fx.centerY : 0) / 200);

      const wctx = ensureWork(w, h);
      if (!wctx) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      try {
        wctx.clearRect(0, 0, w, h);
        wctx.drawImage(el, 0, 0, w, h);
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      // Zoom about the focal point: the point at fractions (u, v) stays fixed
      const u = (cx - x) / w;
      const v = (cy - y) / h;
      const spread = amount * 0.30;

      ctx.save();
      try {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.globalAlpha = 1 / samples;
        for (let i = 0; i < samples; i++) {
          const t = samples === 1 ? 0 : i / (samples - 1);
          const s = 1 + spread * t;
          const dw = w * s;
          const dh = h * s;
          const dx = cx - u * dw;
          const dy = cy - v * dh;
          ctx.drawImage(_work, dx, dy, dw, dh);
        }
      } catch (_) {}
      ctx.restore();
    }
  });
})(typeof window !== 'undefined' ? window : this);
