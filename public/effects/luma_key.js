/**
 * LUMA KEY - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Luma Key" Alight Motion)
 *
 * Keying berdasar kecerahan: buang area gelap ATAU area terang
 * melewati ambang, dengan tepi lembut.
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

  function smooth01(e0, e1, v) {
    if (e1 <= e0) return v > e0 ? 1 : 0;
    let t = (v - e0) / (e1 - e0);
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return t * t * (3 - 2 * t);
  }

  reg.register({
    id: 'luma-key',
    name: 'Luma Key',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Key out dark or bright areas by luminance (Alight Motion equivalent)',
    params: [
      { id: 'mode', label: 'Mode', type: 'select', options: ['Key Out Darker', 'Key Out Brighter'], default: 'Key Out Darker' },
      { id: 'threshold', label: 'Threshold', type: 'number', min: 0, max: 100, default: 50, unit: '%' },
      { id: 'softness', label: 'Softness', type: 'number', min: 0, max: 100, default: 10, unit: '%' }
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

      const brighter = (fx && fx.mode !== undefined ? fx.mode : 'Key Out Darker') === 'Key Out Brighter';
      const thr = Math.max(0, Math.min(1, (fx && fx.threshold !== undefined ? fx.threshold : 50) / 100));
      const soft = Math.max(0, Math.min(1, (fx && fx.softness !== undefined ? fx.softness : 10) / 100));

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
        const keep = brighter ? 1 - smooth01(thr - soft, thr, l) : smooth01(thr, thr + soft, l);
        d[i + 3] = Math.round(d[i + 3] * keep);
      }

      try {
        wctx.putImageData(img, 0, 0);
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      try { ctx.drawImage(_work, x, y, w, h); } catch (_) {}
    }
  });
})(typeof window !== 'undefined' ? window : this);
