(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  let eCanvas = null;
  let eCtx = null;

  reg.register({
    id: 'emboss',
    name: 'Emboss',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Relief / stamped-metal emboss with light direction and depth',
    params: [
      { id: 'angle', label: 'Light Angle', type: 'angle', min: 0, max: 360, default: 135, unit: '°' },
      { id: 'depth', label: 'Depth', type: 'number', min: 1, max: 10, default: 3 },
      { id: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 100, default: 80, unit: '%' }
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
      let k = (f.intensity !== undefined && f.intensity !== null) ? +f.intensity : 80;
      if (isNaN(k)) k = 80;
      k = Math.max(0, Math.min(100, k)) / 100;
      if (k <= 0.001) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      let ang = (f.angle !== undefined && f.angle !== null) ? +f.angle : 135;
      if (isNaN(ang)) ang = 135;
      let depth = (f.depth !== undefined && f.depth !== null) ? +f.depth : 3;
      if (isNaN(depth)) depth = 3;
      depth = Math.max(0.5, Math.min(20, depth));

      if (typeof document === 'undefined') {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      if (!eCanvas) {
        eCanvas = document.createElement('canvas');
        eCtx = eCanvas.getContext('2d');
      }
      if (!eCtx) return;
      const pw = Math.max(2, Math.min(640, Math.round(w)));
      const ph = Math.max(2, Math.min(360, Math.round(h)));
      if (eCanvas.width !== pw || eCanvas.height !== ph) {
        eCanvas.width = pw;
        eCanvas.height = ph;
      }
      try { eCtx.drawImage(el, 0, 0, pw, ph); } catch (_) { return; }
      let img;
      try { img = eCtx.getImageData(0, 0, pw, ph); } catch (_) { return; }

      const rad = (ang * Math.PI) / 180;
      const ox = Math.round(Math.cos(rad) * depth);
      const oy = Math.round(Math.sin(rad) * depth);
      const src = new Uint8ClampedArray(img.data);
      const d = img.data;
      const lumAt = (px, py) => {
        const cx = Math.max(0, Math.min(pw - 1, px));
        const cy = Math.max(0, Math.min(ph - 1, py));
        const o = (cy * pw + cx) * 4;
        return 0.2126 * src[o] + 0.7152 * src[o + 1] + 0.0722 * src[o + 2];
      };
      for (let py = 0; py < ph; py++) {
        for (let px = 0; px < pw; px++) {
          const o = (py * pw + px) * 4;
          if (d[o + 3] === 0) continue;
          const diff = lumAt(px, py) - lumAt(px - ox, py - oy);
          const v = 128 + diff * 2 * k;
          d[o] = v; d[o + 1] = v; d[o + 2] = v;
        }
      }
      try { eCtx.putImageData(img, 0, 0); } catch (_) { return; }
      try { ctx.drawImage(eCanvas, x, y, w, h); } catch (_) {}
    }
  });
})(typeof window !== 'undefined' ? window : this);
