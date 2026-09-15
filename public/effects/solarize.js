(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  let sCanvas = null;
  let sCtx = null;

  reg.register({
    id: 'solarize',
    name: 'Solarize',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Classic Sabattier solarize: invert tones above threshold',
    params: [
      { id: 'threshold', label: 'Threshold', type: 'number', min: 0, max: 255, default: 128 },
      { id: 'blend', label: 'Blend', type: 'number', min: 0, max: 100, default: 100, unit: '%' }
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
      let blend = (f.blend !== undefined && f.blend !== null) ? +f.blend : 100;
      if (isNaN(blend)) blend = 100;
      blend = Math.max(0, Math.min(100, blend)) / 100;
      if (blend <= 0.001) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      let thr = (f.threshold !== undefined && f.threshold !== null) ? +f.threshold : 128;
      if (isNaN(thr)) thr = 128;
      thr = Math.max(0, Math.min(255, thr));

      if (typeof document === 'undefined') {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      if (!sCanvas) {
        sCanvas = document.createElement('canvas');
        sCtx = sCanvas.getContext('2d');
      }
      if (!sCtx) return;
      const pw = Math.max(2, Math.min(640, Math.round(w)));
      const ph = Math.max(2, Math.min(360, Math.round(h)));
      if (sCanvas.width !== pw || sCanvas.height !== ph) {
        sCanvas.width = pw;
        sCanvas.height = ph;
      }
      try { sCtx.drawImage(el, 0, 0, pw, ph); } catch (_) { return; }
      let img;
      try { img = sCtx.getImageData(0, 0, pw, ph); } catch (_) { return; }
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const r = d[i] >= thr ? 255 - d[i] : d[i];
        const g = d[i + 1] >= thr ? 255 - d[i + 1] : d[i + 1];
        const b = d[i + 2] >= thr ? 255 - d[i + 2] : d[i + 2];
        d[i] = d[i] + (r - d[i]) * blend;
        d[i + 1] = d[i + 1] + (g - d[i + 1]) * blend;
        d[i + 2] = d[i + 2] + (b - d[i + 2]) * blend;
      }
      try { sCtx.putImageData(img, 0, 0); } catch (_) { return; }
      try { ctx.drawImage(sCanvas, x, y, w, h); } catch (_) {}
    }
  });
})(typeof window !== 'undefined' ? window : this);
