(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  reg.register({
    id: 'venetian-blinds',
    name: 'Venetian Blinds',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Slatted blinds reveal: horizontal or vertical strips with animated opening',
    params: [
      { id: 'direction', label: 'Direction', type: 'select', options: ['horizontal', 'vertical'], default: 'horizontal' },
      { id: 'width', label: 'Slat Width', type: 'number', min: 2, max: 200, default: 28, unit: 'px' },
      { id: 'completion', label: 'Open', type: 'number', min: 0, max: 100, default: 65, unit: '%' },
      { id: 'invert', label: 'Invert', type: 'switch', default: 0 }
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
      let comp = (f.completion !== undefined && f.completion !== null) ? +f.completion : 65;
      if (isNaN(comp)) comp = 65;
      comp = Math.max(0, Math.min(100, comp));
      if (comp <= 0) return;
      if (comp >= 100) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      let period = (f.width !== undefined && f.width !== null) ? +f.width : 28;
      if (isNaN(period)) period = 28;
      period = Math.max(2, Math.min(2000, period));
      const vertical = (f.direction === 'vertical');
      const inv = (f.invert === 1 || f.invert === true || f.invert === '1' || f.invert === 'true');
      const open = period * (comp / 100);
      const phase = inv ? period / 2 : 0;

      try {
        if (!vertical) {
          for (let yy = -period + phase; yy < h + period; yy += period) {
            if (open <= 0) continue;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y + yy, w, open);
            ctx.clip();
            ctx.drawImage(el, x, y, w, h);
            ctx.restore();
          }
        } else {
          for (let xx = -period + phase; xx < w + period; xx += period) {
            if (open <= 0) continue;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x + xx, y, open, h);
            ctx.clip();
            ctx.drawImage(el, x, y, w, h);
            ctx.restore();
          }
        }
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
      }
    }
  });
})(typeof window !== 'undefined' ? window : this);
