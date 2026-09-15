(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  function hexRgb(hex, fb) {
    let c = (hex || fb || '#ff0000').replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    const n = parseInt(c, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  let lCanvas = null;
  let lCtx = null;

  reg.register({
    id: 'leave-color',
    name: 'Leave Color',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Keep one key color, desaturate everything else (Sin City look)',
    params: [
      { id: 'keyColor', label: 'Keep Color', type: 'color', default: '#ff0000' },
      { id: 'tolerance', label: 'Tolerance', type: 'number', min: 0, max: 100, default: 25, unit: '%' },
      { id: 'softness', label: 'Softness', type: 'number', min: 0, max: 100, default: 30, unit: '%' },
      { id: 'saturation', label: 'Rest Saturation', type: 'number', min: 0, max: 100, default: 0, unit: '%' }
    ],
    render(ctx, el, layer, bounds, fx) {
      if (!ctx || !el) return;
      const x = bounds && bounds.x !== undefined ? bounds.x : 0;
      const y = bounds && bounds.y !== undefined ? bounds.y : 0;
      const w = Math.max(1, Math.round(bounds && bounds.w !== undefined ? bounds.w : (ctx.canvas ? ctx.canvas.width : 100)));
      const h = Math.max(1, Math.round(bounds && bounds.h !== undefined ? bounds.h : (ctx.canvas ? ctx.canvas.height : 100)));

      if (el.tagName === 'VIDEO' && (el.readyState < 2 || !el.videoWidth || !el.videoHeight)) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      const f = fx || {};
      let sat = (f.saturation !== undefined && f.saturation !== null) ? +f.saturation : 0;
      if (isNaN(sat)) sat = 0;
      sat = Math.max(0, Math.min(100, sat)) / 100;
      let tol = (f.tolerance !== undefined && f.tolerance !== null) ? +f.tolerance : 25;
      if (isNaN(tol)) tol = 25;
      tol = Math.max(0, Math.min(100, tol)) / 100;
      let soft = (f.softness !== undefined && f.softness !== null) ? +f.softness : 30;
      if (isNaN(soft)) soft = 30;
      soft = Math.max(0.001, Math.min(1, Math.min(100, soft) / 100));

      if (typeof document === 'undefined') {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      if (!lCanvas) {
        lCanvas = document.createElement('canvas');
        lCtx = lCanvas.getContext('2d');
      }
      if (!lCtx) return;
      const pw = Math.max(2, Math.min(480, Math.round(w)));
      const ph = Math.max(2, Math.min(270, Math.round(h)));
      if (lCanvas.width !== pw || lCanvas.height !== ph) {
        lCanvas.width = pw;
        lCanvas.height = ph;
      }
      try { lCtx.drawImage(el, 0, 0, pw, ph); } catch (_) { return; }
      let img;
      try { img = lCtx.getImageData(0, 0, pw, ph); } catch (_) { return; }

      const kc = hexRgb(f.keyColor, '#ff0000');
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const dr = Math.abs(r - kc[0]) / 255;
        const dg = Math.abs(g - kc[1]) / 255;
        const db = Math.abs(b - kc[2]) / 255;
        const dist = Math.max(dr, Math.max(dg, db));
        // 0 = warna kunci (pertahankan), 1 = jauh (abu-abu)
        let m = (dist - tol) / soft;
        m = Math.max(0, Math.min(1, m));
        m = m * m * (3 - 2 * m);
        const gray = m * (1 - sat);
        d[i] = r + (lum - r) * gray;
        d[i + 1] = g + (lum - g) * gray;
        d[i + 2] = b + (lum - b) * gray;
      }
      try { lCtx.putImageData(img, 0, 0); } catch (_) { return; }
      try { ctx.drawImage(lCanvas, x, y, w, h); } catch (_) {}
    }
  });
})(typeof window !== 'undefined' ? window : this);
