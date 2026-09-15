/**
 * DIRECTIONAL BLUR - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Directional Blur" Alight Motion)
 *
 * Blur searah sudut tertentu (efek gerak linear). Multi-tap drawImage
 * terpusat: makin banyak sampel (Quality) makin halus hasilnya.
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  reg.register({
    id: 'directional-blur',
    name: 'Directional Blur',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Linear motion-style blur along an angle (Alight Motion equivalent)',
    params: [
      { id: 'angle', label: 'Direction', type: 'angle', min: -180, max: 180, default: 0, unit: '°' },
      { id: 'strength', label: 'Strength', type: 'number', min: 0, max: 100, default: 30, unit: '%' },
      { id: 'quality', label: 'Quality', type: 'number', min: 3, max: 16, default: 8, step: 1 }
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

      const strength = Math.max(0, Math.min(100, fx && fx.strength !== undefined ? fx.strength : 30));
      if (strength <= 0.001) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      const ang = (fx && fx.angle !== undefined ? fx.angle : 0) * Math.PI / 180;
      const n = Math.max(2, Math.min(32, Math.round(fx && fx.quality !== undefined ? fx.quality : 8)));
      const len = (strength / 100) * Math.min(w, h) * 0.75;
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);

      ctx.save();
      try {
        ctx.globalAlpha = 1 / n;
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * len;
          try { ctx.drawImage(el, x + ux * t, y + uy * t, w, h); } catch (_) {}
        }
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
      }
      ctx.restore();
    }
  });
})(typeof window !== 'undefined' ? window : this);
