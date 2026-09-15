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
    id: 'glitch',
    name: 'Glitch',
    category: 'warp',
    icon: 'assets/FXPH.svg',
    description: 'Digital slice-displacement glitch with ghost fringes, animated over time',
    params: [
      { id: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 100, default: 60, unit: '%' },
      { id: 'slices', label: 'Slices', type: 'number', min: 2, max: 60, default: 12 },
      { id: 'shift', label: 'Max Shift', type: 'number', min: 0, max: 100, default: 30, unit: 'px' },
      { id: 'speed', label: 'Speed', type: 'number', min: 0, max: 20, default: 6 },
      { id: 'rgbSplit', label: 'RGB Fringe', type: 'switch', default: 1 },
      { id: 'seed', label: 'Seed', type: 'number', min: 0, max: 999, default: 7 }
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
      let intensity = (f.intensity !== undefined && f.intensity !== null) ? +f.intensity : 60;
      if (isNaN(intensity)) intensity = 60;
      intensity = Math.max(0, Math.min(100, intensity));

      try { ctx.drawImage(el, x, y, w, h); } catch (_) { return; }
      if (intensity <= 0) return;

      const elW = el.videoWidth || el.naturalWidth || el.width || 0;
      const elH = el.videoHeight || el.naturalHeight || el.height || 0;
      if (!elW || !elH) return;

      let slices = (f.slices !== undefined && f.slices !== null) ? Math.round(+f.slices) : 12;
      if (isNaN(slices)) slices = 12;
      slices = Math.max(1, Math.min(120, slices));
      let maxShift = (f.shift !== undefined && f.shift !== null) ? +f.shift : 30;
      if (isNaN(maxShift)) maxShift = 30;
      maxShift = Math.max(0, Math.min(500, maxShift));
      let speed = (f.speed !== undefined && f.speed !== null) ? +f.speed : 6;
      if (isNaN(speed)) speed = 6;
      speed = Math.max(0, Math.min(60, speed));
      let seed = (f.seed !== undefined && f.seed !== null) ? Math.round(+f.seed) : 7;
      if (isNaN(seed)) seed = 7;
      const fringe = !(f.rgbSplit === 0 || f.rgbSplit === false || f.rgbSplit === '0' || f.rgbSplit === 'false');

      const t = (typeof currentSec === 'number' && !isNaN(currentSec)) ? currentSec
        : (layer && typeof layer._currentSec === 'number' ? layer._currentSec : 0);
      const bucket = speed > 0 ? Math.floor(t * speed) : 0;
      const rand = mulberry((seed * 131071 + bucket * 733 + 17) | 0);

      const sliceH = h / slices;
      try {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        for (let i = 0; i < slices; i++) {
          const roll = rand();
          if (roll * 100 >= intensity) continue;
          const jitter = (rand() - 0.5) * sliceH * 0.6;
          const dy = y + i * sliceH + jitter;
          const dh = sliceH * (0.4 + rand() * 0.9);
          const dx = (rand() - 0.5) * 2 * maxShift * (intensity / 100);
          const sy = Math.max(0, Math.min(elH - 1, ((dy - y) / h) * elH));
          const sh = Math.max(1, Math.min(elH - sy, (dh / h) * elH));
          ctx.drawImage(el, 0, sy, elW, sh, x + dx, dy, w, dh);
          if (fringe && Math.abs(dx) > 1) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            const fo = Math.max(2, Math.min(24, Math.abs(dx) * 0.25)) * (dx > 0 ? 1 : -1);
            ctx.drawImage(el, 0, sy, elW, sh, x + dx + fo, dy, w, dh);
            ctx.drawImage(el, 0, sy, elW, sh, x + dx - fo, dy, w, dh);
            ctx.restore();
          }
        }
        ctx.restore();
      } catch (_) {
        try { ctx.restore(); } catch (_) {}
      }
    }
  });
})(typeof window !== 'undefined' ? window : this);
