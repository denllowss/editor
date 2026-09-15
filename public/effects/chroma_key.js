/**
 * CHROMA KEY - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Chroma Key" Alight Motion)
 *
 * Green-screen keying: piksel dekat warna kunci jadi transparan,
 * dengan tepi lembut (softness) dan pengurang tumpahan warna (despill).
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
    const fb = fallback || [0, 255, 0];
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

  function smooth01(e0, e1, v) {
    if (e1 <= e0) return v > e0 ? 1 : 0;
    let t = (v - e0) / (e1 - e0);
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return t * t * (3 - 2 * t);
  }

  reg.register({
    id: 'chroma-key',
    name: 'Chroma Key',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Green-screen style color keying with despill (Alight Motion equivalent)',
    targets: ['video', 'image', 'precomp'],
    params: [
      { id: 'keyColor', label: 'Key Color', type: 'color', default: '#00ff00' },
      { id: 'tolerance', label: 'Tolerance', type: 'number', min: 0, max: 100, default: 30, unit: '%' },
      { id: 'softness', label: 'Softness', type: 'number', min: 0, max: 100, default: 15, unit: '%' },
      { id: 'despill', label: 'Despill', type: 'number', min: 0, max: 100, default: 0, unit: '%' }
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

      const key = hexToRgb(fx && fx.keyColor !== undefined ? fx.keyColor : '#00ff00', [0, 255, 0]);
      const tol = Math.max(0, Math.min(1, (fx && fx.tolerance !== undefined ? fx.tolerance : 30) / 100));
      const soft = Math.max(0, Math.min(1, (fx && fx.softness !== undefined ? fx.softness : 15) / 100));
      const desp = Math.max(0, Math.min(1, (fx && fx.despill !== undefined ? fx.despill : 0) / 100));
      // Kanal dominan warna kunci (untuk despill generik)
      const dom = key[1] >= key[0] && key[1] >= key[2] ? 1 : (key[2] >= key[0] ? 2 : 0);

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
        const dr = d[i] - key[0];
        const dg = d[i + 1] - key[1];
        const db = d[i + 2] - key[2];
        const dist = Math.sqrt(dr * dr + dg * dg + db * db) / 441.67295533;
        const keep = smooth01(tol, tol + soft, dist);
        d[i + 3] = Math.round(d[i + 3] * keep);
        if (desp > 0 && keep > 0) {
          // Despill: jepit kanal dominan ke maks kanal lain
          const m = Math.max(d[i + ((dom + 1) % 3)], d[i + ((dom + 2) % 3)]);
          if (d[i + dom] > m) {
            d[i + dom] = Math.round(d[i + dom] + (m - d[i + dom]) * desp);
          }
        }
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
