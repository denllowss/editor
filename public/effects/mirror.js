/**
 * MIRROR - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Mirror" Alight Motion)
 *
 * Mencerminkan separuh layer ke separuh lainnya (4 arah),
 * dengan garis cermin yang bisa digeser (Offset).
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  reg.register({
    id: 'mirror',
    name: 'Mirror',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Mirror one half of the layer onto the other (Alight Motion equivalent)',
    params: [
      { id: 'direction', label: 'Direction', type: 'select', options: ['Left to Right', 'Right to Left', 'Top to Bottom', 'Bottom to Top'], default: 'Left to Right' },
      { id: 'offset', label: 'Offset', type: 'number', min: -100, max: 100, default: 0, unit: '%' }
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

      const dir = fx && fx.direction !== undefined ? fx.direction : 'Left to Right';
      const off = Math.max(-100, Math.min(100, fx && fx.offset !== undefined ? fx.offset : 0));
      const vertical = (dir === 'Top to Bottom' || dir === 'Bottom to Top');
      const forward = (dir === 'Left to Right' || dir === 'Top to Bottom');

      if (vertical) {
        const split = Math.max(0, Math.min(h, h / 2 + (off / 100) * (h / 2)));
        // Separuh sumber: normal
        ctx.save();
        try {
          ctx.beginPath();
          if (forward) ctx.rect(x, y, w, split);
          else ctx.rect(x, y + split, w, h - split);
          ctx.clip();
          ctx.drawImage(el, x, y, w, h);
        } catch (_) {}
        ctx.restore();
        // Separuh cermin: gambar utuh dibalik terhadap garis split
        ctx.save();
        try {
          ctx.beginPath();
          if (forward) ctx.rect(x, y + split, w, h - split);
          else ctx.rect(x, y, w, split);
          ctx.clip();
          ctx.setTransform(1, 0, 0, -1, 0, 2 * (y + split));
          ctx.drawImage(el, x, y, w, h);
        } catch (_) {}
        ctx.restore();
      } else {
        const split = Math.max(0, Math.min(w, w / 2 + (off / 100) * (w / 2)));
        ctx.save();
        try {
          ctx.beginPath();
          if (forward) ctx.rect(x, y, split, h);
          else ctx.rect(x + split, y, w - split, h);
          ctx.clip();
          ctx.drawImage(el, x, y, w, h);
        } catch (_) {}
        ctx.restore();
        ctx.save();
        try {
          ctx.beginPath();
          if (forward) ctx.rect(x + split, y, w - split, h);
          else ctx.rect(x, y, split, h);
          ctx.clip();
          ctx.setTransform(-1, 0, 0, 1, 2 * (x + split), 0);
          ctx.drawImage(el, x, y, w, h);
        } catch (_) {}
        ctx.restore();
      }
    }
  });
})(typeof window !== 'undefined' ? window : this);
