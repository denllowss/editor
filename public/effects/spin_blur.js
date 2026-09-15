(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  reg.register({
    id: 'spin-blur',
    name: 'Spin Blur',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Radial spin / rotation motion blur around the layer center',
    params: [
      { id: 'amount', label: 'Amount', type: 'number', min: 0, max: 100, default: 30, unit: '%' },
      { id: 'steps', label: 'Quality', type: 'number', min: 2, max: 16, default: 8 }
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
      let amount = (f.amount !== undefined && f.amount !== null) ? +f.amount : 30;
      if (isNaN(amount)) amount = 30;
      amount = Math.max(0, Math.min(100, amount));
      if (amount <= 0.01) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      let steps = (f.steps !== undefined && f.steps !== null) ? Math.round(+f.steps) : 8;
      if (isNaN(steps)) steps = 8;
      steps = Math.max(2, Math.min(24, steps));

      // Bentang putaran maks 180° pada amount 100
      const span = (amount / 100) * Math.PI;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const alpha = 1 / steps;

      ctx.save();
      try {
        // 'lighter' menjumlahkan stamp: n × (c/n) = c (tanpa penggelapan)
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        for (let i = 0; i < steps; i++) {
          const a = -span / 2 + (span * i) / (steps - 1);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(a);
          ctx.drawImage(el, -w / 2, -h / 2, w, h);
          ctx.restore();
        }
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
      }
      ctx.restore();
    }
  });
})(typeof window !== 'undefined' ? window : this);
