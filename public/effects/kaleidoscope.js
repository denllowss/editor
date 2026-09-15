/**
 * KALEIDOSCOPE - Modular Layer Effect Plugin
 * (Node.js port addition - not part of upstream v0.5.14)
 *
 * Classic mirrored kaleidoscope with adjustable segment count,
 * rotation, zoom and center point. Rotation is keyframeable for
 * smooth spinning mandala animations.
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
    id: 'kaleidoscope',
    name: 'Kaleidoscope',
    category: 'warp',
    icon: 'assets/FXPH.svg',
    description: 'Mirrored kaleidoscope with segments, rotation, zoom and center controls',
    params: [
      { id: 'segments', label: 'Segments', type: 'number', min: 2, max: 12, default: 6, step: 1 },
      { id: 'rotation', label: 'Rotation', type: 'angle', min: -360, max: 360, default: 0, unit: '°' },
      { id: 'zoom', label: 'Zoom', type: 'number', min: 50, max: 200, default: 100, unit: '%' },
      { id: 'centerX', label: 'Center X', type: 'number', min: -100, max: 100, default: 0, unit: '%' },
      { id: 'centerY', label: 'Center Y', type: 'number', min: -100, max: 100, default: 0, unit: '%' }
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

      const N = Math.max(2, Math.min(24, Math.round(fx && fx.segments !== undefined ? fx.segments : 6)));
      const rot = ((fx && fx.rotation !== undefined ? fx.rotation : 0) * Math.PI) / 180;
      const z = Math.max(0.1, Math.min(4, ((fx && fx.zoom !== undefined ? fx.zoom : 100) / 100)));
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

      // Wedge radius comfortably covers the whole bounds from the center
      const R = Math.sqrt(w * w + h * h) * 0.75;
      const seg = (Math.PI * 2) / N;
      const dw = w * z;
      const dh = h * z;

      ctx.save();
      try {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        for (let i = 0; i < N; i++) {
          ctx.save();
          try {
            ctx.translate(cx, cy);
            ctx.rotate(rot + i * seg);
            if (i % 2 === 1) ctx.scale(-1, 1);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, R, -seg / 2, seg / 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(_work, -dw / 2, -dh / 2, dw, dh);
          } catch (_) {}
          ctx.restore();
        }
      } catch (_) {}
      ctx.restore();
    }
  });
})(typeof window !== 'undefined' ? window : this);
