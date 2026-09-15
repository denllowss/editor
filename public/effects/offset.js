/**
 * OFFSET - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Offset" Alight Motion)
 *
 * Menggeser layer dalam persen dimensi; mode Wrap mengulang tepi
 * yang keluar ke sisi berlawanan (seamless loop-friendly).
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  function isOn(v, dflt) {
    if (v === undefined || v === null) return !!dflt;
    return !(v === 0 || v === false || v === '0' || v === 'false');
  }

  reg.register({
    id: 'offset',
    name: 'Offset',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Shift the layer with optional seamless wrap (Alight Motion equivalent)',
    params: [
      { id: 'shiftX', label: 'Shift X', type: 'number', min: -100, max: 100, default: 0, unit: '%' },
      { id: 'shiftY', label: 'Shift Y', type: 'number', min: -100, max: 100, default: 0, unit: '%' },
      { id: 'wrap', label: 'Wrap', type: 'switch', default: 1 }
    ],
    render(ctx, el, layer, bounds, fx) {
      if (!ctx || !el) return;
      const x = bounds && bounds.x !== undefined ? bounds.x : 0;
      const y = bounds && bounds.y !== undefined ? bounds.y : 0;
      const w = Math.max(1, Math.round(bounds && bounds.w !== undefined ? bounds.w : (ctx.canvas ? ctx.canvas.width : 100)));
      const h = Math.max(1, Math.round(bounds && bounds.h !== undefined ? bounds.h : (ctx.canvas ? ctx.canvas.height : 100)));

      // Video readiness guard
      if (el.tagName === 'VIDEO' && (el.readyState < 2 || !el.videoWidth || !el.videoHeight)) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      const sx = fx && fx.shiftX !== undefined ? fx.shiftX : 0;
      const sy = fx && fx.shiftY !== undefined ? fx.shiftY : 0;
      const dx = (Math.max(-100, Math.min(100, sx)) / 100) * w;
      const dy = (Math.max(-100, Math.min(100, sy)) / 100) * h;

      if (dx === 0 && dy === 0) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      if (!isOn(fx && fx.wrap, 1)) {
        try { ctx.drawImage(el, x + dx, y + dy, w, h); } catch (_) {}
        return;
      }

      // Wrap: 4 ubin menutup area (offset ternormalisasi ke [0,dim))
      const ox = ((dx % w) + w) % w;
      const oy = ((dy % h) + h) % h;
      try {
        ctx.drawImage(el, x + ox - w, y + oy - h, w, h);
        ctx.drawImage(el, x + ox, y + oy - h, w, h);
        ctx.drawImage(el, x + ox - w, y + oy, w, h);
        ctx.drawImage(el, x + ox, y + oy, w, h);
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
      }
    }
  });
})(typeof window !== 'undefined' ? window : this);
