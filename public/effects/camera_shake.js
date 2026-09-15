(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  function mulberry(seed) {
    let a = seed >>> 0;
    return function() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  reg.register({
    id: 'camera-shake',
    name: 'Camera Shake',
    category: 'movement',
    icon: 'assets/FXPH.svg',
    description: 'Handheld / earthquake position shake with smooth random motion and edge cover',
    params: [
      { id: 'magnitude', label: 'Magnitude', type: 'number', min: 0, max: 200, default: 24, unit: 'px' },
      { id: 'speed', label: 'Speed', type: 'number', min: 0.5, max: 30, default: 8 },
      { id: 'seed', label: 'Seed', type: 'number', min: 0, max: 999, default: 3 },
      { id: 'zoomCover', label: 'Cover Edges', type: 'switch', default: 1 }
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
      let mag = (f.magnitude !== undefined && f.magnitude !== null) ? +f.magnitude : 24;
      if (isNaN(mag)) mag = 24;
      mag = Math.max(0, Math.min(1000, mag));
      if (mag <= 0) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      let speed = (f.speed !== undefined && f.speed !== null) ? +f.speed : 8;
      if (isNaN(speed)) speed = 8;
      speed = Math.max(0.1, Math.min(120, speed));
      let seed = (f.seed !== undefined && f.seed !== null) ? Math.round(+f.seed) : 3;
      if (isNaN(seed)) seed = 3;
      const cover = !(f.zoomCover === 0 || f.zoomCover === false || f.zoomCover === '0' || f.zoomCover === 'false');

      const t = (typeof currentSec === 'number' && !isNaN(currentSec)) ? currentSec
        : (layer && typeof layer._currentSec === 'number' ? layer._currentSec : 0);
      const pos = t * speed;
      const b0 = Math.floor(pos);
      let frac = pos - b0;
      frac = frac * frac * (3 - 2 * frac); // smoothstep antar-titik acak
      const r0x = mulberry((seed * 1009 + b0 * 2 + 1) | 0)();
      const r1x = mulberry((seed * 1009 + (b0 + 1) * 2 + 1) | 0)();
      const r0y = mulberry((seed * 1009 + b0 * 2 + 2) | 0)();
      const r1y = mulberry((seed * 1009 + (b0 + 1) * 2 + 2) | 0)();
      const ox = ((r0x + (r1x - r0x) * frac) * 2 - 1) * mag;
      const oy = ((r0y + (r1y - r0y) * frac) * 2 - 1) * mag;

      const zoom = cover ? (1 + (mag * 2) / Math.max(1, Math.min(w, h))) : 1;
      const dw = w * zoom;
      const dh = h * zoom;
      const dx = x + (w - dw) / 2 + ox;
      const dy = y + (h - dh) / 2 + oy;
      try { ctx.drawImage(el, dx, dy, dw, dh); } catch (_) {}
    }
  });
})(typeof window !== 'undefined' ? window : this);
