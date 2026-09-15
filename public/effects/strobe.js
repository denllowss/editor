(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  reg.register({
    id: 'strobe',
    name: 'Strobe Light',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Rhythmic color flash / strobe pulse synced to time',
    params: [
      { id: 'color', label: 'Color', type: 'color', default: '#ffffff' },
      { id: 'rate', label: 'Rate', type: 'number', min: 0.5, max: 30, default: 8, unit: 'Hz' },
      { id: 'duty', label: 'On Time', type: 'number', min: 1, max: 99, default: 50, unit: '%' },
      { id: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 100, default: 80, unit: '%' }
    ],
    render(ctx, el, layer, bounds, fx, currentSec) {
      if (!ctx || !el) return;
      const x = bounds && bounds.x !== undefined ? bounds.x : 0;
      const y = bounds && bounds.y !== undefined ? bounds.y : 0;
      const w = Math.max(1, Math.round(bounds && bounds.w !== undefined ? bounds.w : (ctx.canvas ? ctx.canvas.width : 100)));
      const h = Math.max(1, Math.round(bounds && bounds.h !== undefined ? bounds.h : (ctx.canvas ? ctx.canvas.height : 100)));

      try { ctx.drawImage(el, x, y, w, h); } catch (_) { return; }

      const f = fx || {};
      let intensity = (f.intensity !== undefined && f.intensity !== null) ? +f.intensity : 80;
      if (isNaN(intensity)) intensity = 80;
      intensity = Math.max(0, Math.min(100, intensity));
      if (intensity <= 0) return;

      let rate = (f.rate !== undefined && f.rate !== null) ? +f.rate : 8;
      if (isNaN(rate)) rate = 8;
      rate = Math.max(0.1, Math.min(60, rate));
      let duty = (f.duty !== undefined && f.duty !== null) ? +f.duty : 50;
      if (isNaN(duty)) duty = 50;
      duty = Math.max(0, Math.min(100, duty));

      const t = (typeof currentSec === 'number' && !isNaN(currentSec)) ? currentSec
        : (layer && typeof layer._currentSec === 'number' ? layer._currentSec : 0);
      const phase = ((t * rate) % 1 + 1) % 1;
      if (phase >= duty / 100) return;

      ctx.save();
      try {
        ctx.globalAlpha = intensity / 100;
        ctx.fillStyle = f.color || '#ffffff';
        ctx.fillRect(x, y, w, h);
      } catch (_) {}
      ctx.restore();
    }
  });
})(typeof window !== 'undefined' ? window : this);
