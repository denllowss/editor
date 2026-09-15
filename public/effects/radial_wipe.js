(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  let wCanvas = null;
  let wCtx = null;

  reg.register({
    id: 'radial-wipe',
    name: 'Radial Wipe',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Clock-wipe circular reveal with start angle, direction and feathered edge',
    params: [
      { id: 'completion', label: 'Completion', type: 'number', min: 0, max: 100, default: 50, unit: '%' },
      { id: 'feather', label: 'Feather', type: 'number', min: 0, max: 100, default: 12, unit: '%' },
      { id: 'clockwise', label: 'Clockwise', type: 'switch', default: 1 },
      { id: 'startAngle', label: 'Start Angle', type: 'angle', min: 0, max: 360, default: 0, unit: '°' }
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
      let comp = (f.completion !== undefined && f.completion !== null) ? +f.completion : 50;
      if (isNaN(comp)) comp = 50;
      comp = Math.max(0, Math.min(100, comp));
      if (comp <= 0) return; // habis terhapus
      if (comp >= 100) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      let feather = (f.feather !== undefined && f.feather !== null) ? +f.feather : 12;
      if (isNaN(feather)) feather = 12;
      feather = Math.max(0, Math.min(100, feather));
      const cw = (f.clockwise === 0 || f.clockwise === false || f.clockwise === '0' || f.clockwise === 'false') ? false : true;
      let startDeg = (f.startAngle !== undefined && f.startAngle !== null) ? +f.startAngle : 0;
      if (isNaN(startDeg)) startDeg = 0;

      if (typeof document === 'undefined') {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      if (!wCanvas) {
        wCanvas = document.createElement('canvas');
        wCtx = wCanvas.getContext('2d');
      }
      if (!wCtx) return;
      const scale = Math.min(1, 960 / Math.max(w, h));
      const pw = Math.max(2, Math.round(w * scale));
      const ph = Math.max(2, Math.round(h * scale));
      if (wCanvas.width !== pw || wCanvas.height !== ph) {
        wCanvas.width = pw;
        wCanvas.height = ph;
      }
      try { wCtx.drawImage(el, 0, 0, pw, ph); } catch (_) { return; }

      const frac = comp / 100;
      const sweep = frac * Math.PI * 2;
      const startRad = ((startDeg - 90) * Math.PI) / 180; // 0° = jam 12
      const a1 = startRad + (cw ? sweep : 0);
      const a2 = a1 + (Math.PI * 2 - sweep);
      const cx = pw / 2;
      const cy = ph / 2;
      const R = Math.sqrt(pw * pw + ph * ph);

      try {
        wCtx.save();
        wCtx.globalCompositeOperation = 'destination-out';
        wCtx.fillStyle = '#000000';
        wCtx.shadowColor = '#000000';
        wCtx.shadowBlur = (feather / 100) * Math.max(pw, ph) * 0.25;
        wCtx.beginPath();
        wCtx.moveTo(cx, cy);
        wCtx.arc(cx, cy, R, a1, a2, false);
        wCtx.closePath();
        wCtx.fill();
        wCtx.restore();
      } catch (_) {}
      try { ctx.drawImage(wCanvas, x, y, w, h); } catch (_) {}
    }
  });
})(typeof window !== 'undefined' ? window : this);
