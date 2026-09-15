/**
 * REPLACE COLOR - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Replace Color" Alight Motion)
 *
 * Mengganti warna sumber dengan warna target dalam radius toleransi
 * (jarak RGB), dengan tepi lembut (softness).
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
    id: 'replace-color',
    name: 'Replace Color',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Swap a source color for a target color (Alight Motion equivalent)',
    params: [
      { id: 'source', label: 'Source', type: 'color', default: '#00ff00' },
      { id: 'target', label: 'Target', type: 'color', default: '#ff0000' },
      { id: 'tolerance', label: 'Tolerance', type: 'number', min: 0, max: 100, default: 30, unit: '%' },
      { id: 'softness', label: 'Softness', type: 'number', min: 0, max: 100, default: 15, unit: '%' },
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

      const src = hexToRgb(fx && fx.source !== undefined ? fx.source : '#00ff00', [0, 255, 0]);
      const tgt = hexToRgb(fx && fx.target !== undefined ? fx.target : '#ff0000', [255, 0, 0]);
      const tol = Math.max(0, Math.min(100, fx && fx.tolerance !== undefined ? fx.tolerance : 30));
      const soft = Math.max(0, Math.min(100, fx && fx.softness !== undefined ? fx.softness : 15));

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
        const dr = d[i] - src[0];
        const dg = d[i + 1] - src[1];
        const db = d[i + 2] - src[2];
        const dist = Math.sqrt(dr * dr + dg * dg + db * db) / 441.67295533 * 100;
        let k;
        if (dist <= tol) k = 1;
        else if (soft <= 0.001 || dist >= tol + soft) k = 0;
        else {
          const t = (dist - tol) / soft;
          k = 1 - (t * t * (3 - 2 * t)); // smoothstep tepi
        }
        if (k > 0) {
          d[i] = Math.round(d[i] + (tgt[0] - d[i]) * k);
          d[i + 1] = Math.round(d[i + 1] + (tgt[1] - d[i + 1]) * k);
          d[i + 2] = Math.round(d[i + 2] + (tgt[2] - d[i + 2]) * k);
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
