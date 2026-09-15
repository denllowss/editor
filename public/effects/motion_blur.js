(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  reg.register({
    id: 'motion-blur',
    name: 'Motion Blur',
    category: 'movement',
    icon: 'assets/FXPH.svg',
    description: 'Classic shutter-style motion blur: smeared samples along a direction (use Motion Blur Pro for optical-flow tracking)',
    params: [
      { id: 'length', label: 'Shutter Length', type: 'number', min: 0, max: 200, default: 40, unit: 'px' },
      { id: 'angle', label: 'Direction', type: 'angle', min: -180, max: 180, default: 0, unit: '°' },
      { id: 'samples', label: 'Samples', type: 'number', min: 2, max: 16, default: 8, step: 1 }
    ],
    render(ctx, el, layer, bounds, fx, currentSec) {
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
      let len = (f.length !== undefined && f.length !== null) ? +f.length : 40;
      if (isNaN(len)) len = 40;
      len = Math.max(0, Math.min(600, len));
      if (len <= 0.001) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      let angDeg = (f.angle !== undefined && f.angle !== null) ? +f.angle : 0;
      if (isNaN(angDeg)) angDeg = 0;
      let n = (f.samples !== undefined && f.samples !== null) ? Math.round(+f.samples) : 8;
      if (isNaN(n)) n = 8;
      n = Math.max(2, Math.min(32, n));

      const ang = angDeg * Math.PI / 180;
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);

      try {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.globalAlpha = 1 / n;
        for (let i = 0; i < n; i++) {
          const t = (i / (n - 1) - 0.5) * len;
          try { ctx.drawImage(el, x + ux * t, y + uy * t, w, h); } catch (_) {}
        }
        ctx.restore();
      } catch (_) {
        try { ctx.restore(); } catch (_) {}
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
      }
    }
  });
})(typeof window !== 'undefined' ? window : this);
