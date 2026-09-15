(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  reg.register({
    id: 'circle',
    name: 'Circle',
    category: 'background',
    icon: 'assets/FXPH.svg',
    description: 'Soft-edged solid circle overlay with blend modes and invert',
    params: [
      { id: 'color', label: 'Color', type: 'color', default: '#ffffff' },
      { id: 'centerX', label: 'Center X', type: 'number', min: 0, max: 100, default: 50, unit: '%' },
      { id: 'centerY', label: 'Center Y', type: 'number', min: 0, max: 100, default: 50, unit: '%' },
      { id: 'radius', label: 'Radius', type: 'number', min: 0, max: 150, default: 40, unit: '%' },
      { id: 'feather', label: 'Feather', type: 'number', min: 0, max: 100, default: 25, unit: '%' },
      { id: 'blend', label: 'Blend', type: 'select', options: ['normal', 'multiply', 'screen', 'overlay'], default: 'normal' },
      { id: 'invert', label: 'Invert', type: 'switch', default: 0 },
      { id: 'opacity', label: 'Opacity', type: 'number', min: 0, max: 100, default: 100, unit: '%' }
    ],
    render(ctx, el, layer, bounds, fx) {
      if (!ctx || !el) return;
      const x = bounds && bounds.x !== undefined ? bounds.x : 0;
      const y = bounds && bounds.y !== undefined ? bounds.y : 0;
      const w = Math.max(1, Math.round(bounds && bounds.w !== undefined ? bounds.w : (ctx.canvas ? ctx.canvas.width : 100)));
      const h = Math.max(1, Math.round(bounds && bounds.h !== undefined ? bounds.h : (ctx.canvas ? ctx.canvas.height : 100)));

      try { ctx.drawImage(el, x, y, w, h); } catch (_) { return; }

      const f = fx || {};
      let opacity = (f.opacity !== undefined && f.opacity !== null) ? +f.opacity : 100;
      if (isNaN(opacity)) opacity = 100;
      opacity = Math.max(0, Math.min(100, opacity));
      if (opacity <= 0) return;
      let rad = (f.radius !== undefined && f.radius !== null) ? +f.radius : 40;
      if (isNaN(rad)) rad = 40;
      rad = Math.max(0, Math.min(300, rad));
      if (rad <= 0) return;

      let cxp = (f.centerX !== undefined && f.centerX !== null) ? +f.centerX : 50;
      if (isNaN(cxp)) cxp = 50;
      let cyp = (f.centerY !== undefined && f.centerY !== null) ? +f.centerY : 50;
      if (isNaN(cyp)) cyp = 50;
      let feather = (f.feather !== undefined && f.feather !== null) ? +f.feather : 25;
      if (isNaN(feather)) feather = 25;
      feather = Math.max(0, Math.min(100, feather));
      const inv = (f.invert === 1 || f.invert === true || f.invert === '1' || f.invert === 'true');
      const col = f.color || '#ffffff';

      const cx = x + (Math.max(0, Math.min(100, cxp)) / 100) * w;
      const cy = y + (Math.max(0, Math.min(100, cyp)) / 100) * h;
      const R = (rad / 100) * Math.max(w, h);
      const inner = R * (1 - feather / 100);
      const blend = (f.blend === 'multiply' || f.blend === 'screen' || f.blend === 'overlay') ? f.blend : 'source-over';

      try {
        ctx.save();
        ctx.globalCompositeOperation = blend;
        ctx.globalAlpha = opacity / 100;
        let grad = null;
        try {
          if (typeof ctx.createRadialGradient === 'function') {
            grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, R));
          }
        } catch (_) { grad = null; }
        if (grad && typeof grad.addColorStop === 'function') {
          if (!inv) {
            grad.addColorStop(0, col);
            grad.addColorStop(Math.max(0, Math.min(1, inner / Math.max(1, R))), col);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
          } else {
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(Math.max(0, Math.min(1, inner / Math.max(1, R))), 'rgba(0,0,0,0)');
            grad.addColorStop(1, col);
          }
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = col;
        }
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      } catch (_) {
        try { ctx.restore(); } catch (_) {}
      }
    }
  });
})(typeof window !== 'undefined' ? window : this);
