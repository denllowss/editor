(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  // Deterministic PRNG (animasi stabil per frame + seed)
  function mulberry(seed) {
    let a = seed >>> 0;
    return function() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let nCanvas = null;
  let nCtx = null;

  reg.register({
    id: 'noise',
    name: 'Noise',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Animated film-style grain overlay (mono or color) with size, speed and seed',
    params: [
      { id: 'amount', label: 'Amount', type: 'number', min: 0, max: 100, default: 45, unit: '%' },
      { id: 'size', label: 'Grain Size', type: 'number', min: 1, max: 12, default: 2, unit: 'px' },
      { id: 'colorMode', label: 'Color Mode', type: 'select', options: ['mono', 'color'], default: 'mono' },
      { id: 'speed', label: 'Speed', type: 'number', min: 0, max: 24, default: 8 },
      { id: 'seed', label: 'Seed', type: 'number', min: 0, max: 999, default: 1 }
    ],
    render(ctx, el, layer, bounds, fx, currentSec) {
      if (!ctx || !el) return;
      const x = bounds && bounds.x !== undefined ? bounds.x : 0;
      const y = bounds && bounds.y !== undefined ? bounds.y : 0;
      const w = Math.max(1, Math.round(bounds && bounds.w !== undefined ? bounds.w : (ctx.canvas ? ctx.canvas.width : 100)));
      const h = Math.max(1, Math.round(bounds && bounds.h !== undefined ? bounds.h : (ctx.canvas ? ctx.canvas.height : 100)));

      try { ctx.drawImage(el, x, y, w, h); } catch (_) { return; }

      const f = fx || {};
      let amount = (f.amount !== undefined && f.amount !== null) ? +f.amount : 45;
      if (isNaN(amount)) amount = 45;
      amount = Math.max(0, Math.min(100, amount));
      if (amount <= 0) return;

      let size = (f.size !== undefined && f.size !== null) ? +f.size : 2;
      if (isNaN(size)) size = 2;
      size = Math.max(1, Math.min(24, size));
      // Batasi resolusi buffer noise agar murah (di-upscale tajam)
      const cell = Math.max(size, w / 320, h / 180);
      const nw = Math.max(2, Math.min(320, Math.round(w / cell)));
      const nh = Math.max(2, Math.min(180, Math.round(h / cell)));

      let speed = (f.speed !== undefined && f.speed !== null) ? +f.speed : 8;
      if (isNaN(speed)) speed = 8;
      speed = Math.max(0, Math.min(60, speed));
      const t = (typeof currentSec === 'number' && !isNaN(currentSec)) ? currentSec
        : (layer && typeof layer._currentSec === 'number' ? layer._currentSec : 0);
      let seed = (f.seed !== undefined && f.seed !== null) ? Math.round(+f.seed) : 1;
      if (isNaN(seed)) seed = 1;
      const bucket = speed > 0 ? Math.floor(t * speed) : 0;
      const rand = mulberry((seed * 100003 + bucket * 9176 + 11) | 0);
      const isColor = (f.colorMode === 'color');

      if (!nCanvas) {
        if (typeof document === 'undefined') return;
        nCanvas = document.createElement('canvas');
        nCtx = nCanvas.getContext('2d');
      }
      if (!nCtx) return;
      if (nCanvas.width !== nw || nCanvas.height !== nh) {
        nCanvas.width = nw;
        nCanvas.height = nh;
      }
      let img;
      try {
        img = nCtx.createImageData(nw, nh);
      } catch (_) { return; }
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (isColor) {
          d[i] = Math.floor(rand() * 256);
          d[i + 1] = Math.floor(rand() * 256);
          d[i + 2] = Math.floor(rand() * 256);
        } else {
          const v = Math.floor(rand() * 256);
          d[i] = v; d[i + 1] = v; d[i + 2] = v;
        }
        d[i + 3] = 255;
      }
      try { nCtx.putImageData(img, 0, 0); } catch (_) { return; }

      ctx.save();
      try {
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = amount / 100;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(nCanvas, x, y, w, h);
      } catch (_) {}
      ctx.restore();
    }
  });
})(typeof window !== 'undefined' ? window : this);
