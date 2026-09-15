/**
 * GAUSSIAN BLUR - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Gaussian Blur" Alight Motion)
 *
 * Blur merata ke segala arah. Memakai helper blur engine bila tersedia
 * (window.FishEffects.drawBlurred), fallback ke ctx.filter blur().
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  reg.register({
    id: 'gaussian-blur',
    name: 'Gaussian Blur',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Even blur in all directions (Alight Motion equivalent)',
    params: [
      { id: 'radius', label: 'Radius', type: 'number', min: 0, max: 100, default: 10, unit: 'px' }
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

      const r = Math.max(0, fx && fx.radius !== undefined ? fx.radius : 10);
      if (r <= 0.001) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      if (typeof window !== 'undefined' && window.FishEffects && typeof window.FishEffects.drawBlurred === 'function') {
        ctx.save();
        try {
          ctx.translate(x, y);
          window.FishEffects.drawBlurred(ctx, el, w, h, r);
        } catch (_) {
          try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        }
        ctx.restore();
        return;
      }

      try {
        ctx.save();
        ctx.filter = 'blur(' + r + 'px)';
        ctx.drawImage(el, x, y, w, h);
        ctx.restore();
      } catch (_) {
        try { ctx.restore(); } catch (_) {}
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
      }
    }
  });
})(typeof window !== 'undefined' ? window : this);
