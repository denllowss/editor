(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  function hexRgb(hex, fb) {
    let c = (hex || fb || '#808080').replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    const n = parseInt(c, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  let tCanvas = null;
  let tCtx = null;

  reg.register({
    id: 'tritone',
    name: 'Tritone',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Three-color luminance mapping: shadows, midtones, highlights',
    params: [
      { id: 'shadows', label: 'Shadows', type: 'color', default: '#000000' },
      { id: 'midtones', label: 'Midtones', type: 'color', default: '#888888' },
      { id: 'highlights', label: 'Highlights', type: 'color', default: '#ffffff' },
      { id: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 100, default: 100, unit: '%' }
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
      let k = (f.intensity !== undefined && f.intensity !== null) ? +f.intensity : 100;
      if (isNaN(k)) k = 100;
      k = Math.max(0, Math.min(100, k)) / 100;
      if (k <= 0.001) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      if (typeof document === 'undefined') {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      if (!tCanvas) {
        tCanvas = document.createElement('canvas');
        tCtx = tCanvas.getContext('2d');
      }
      if (!tCtx) return;
      const pw = Math.max(2, Math.min(480, Math.round(w)));
      const ph = Math.max(2, Math.min(270, Math.round(h)));
      if (tCanvas.width !== pw || tCanvas.height !== ph) {
        tCanvas.width = pw;
        tCanvas.height = ph;
      }
      try { tCtx.drawImage(el, 0, 0, pw, ph); } catch (_) { return; }
      let img;
      try { img = tCtx.getImageData(0, 0, pw, ph); } catch (_) { return; }

      const sh = hexRgb(f.shadows, '#000000');
      const md = hexRgb(f.midtones, '#888888');
      const hl = hexRgb(f.highlights, '#ffffff');
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        let tr, tg, tb;
        if (lum < 0.5) {
          const t2 = lum * 2;
          tr = sh[0] + (md[0] - sh[0]) * t2;
          tg = sh[1] + (md[1] - sh[1]) * t2;
          tb = sh[2] + (md[2] - sh[2]) * t2;
        } else {
          const t2 = (lum - 0.5) * 2;
          tr = md[0] + (hl[0] - md[0]) * t2;
          tg = md[1] + (hl[1] - md[1]) * t2;
          tb = md[2] + (hl[2] - md[2]) * t2;
        }
        d[i] = d[i] + (tr - d[i]) * k;
        d[i + 1] = d[i + 1] + (tg - d[i + 1]) * k;
        d[i + 2] = d[i + 2] + (tb - d[i + 2]) * k;
      }
      try { tCtx.putImageData(img, 0, 0); } catch (_) { return; }
      try { ctx.drawImage(tCanvas, x, y, w, h); } catch (_) {}
    }
  });
})(typeof window !== 'undefined' ? window : this);
