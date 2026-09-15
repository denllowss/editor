(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  reg.register({
    id: 'light-sweep',
    name: 'Light Sweep',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Diagonal light band sweeping across the layer (CC Light Sweep style)',
    params: [
      { id: 'position', label: 'Position', type: 'number', min: -20, max: 120, default: 50, unit: '%' },
      { id: 'width', label: 'Width', type: 'number', min: 1, max: 60, default: 18, unit: '%' },
      { id: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 200, default: 90, unit: '%' },
      { id: 'angle', label: 'Angle', type: 'number', min: -60, max: 60, default: 25, unit: '°' },
      { id: 'color', label: 'Color', type: 'color', default: '#ffffff' },
      { id: 'softness', label: 'Edge Softness', type: 'number', min: 0, max: 100, default: 60, unit: '%' }
    ],
    render(ctx, el, layer, bounds, fx) {
      if (!ctx || !el) return;
      const x = bounds && bounds.x !== undefined ? bounds.x : 0;
      const y = bounds && bounds.y !== undefined ? bounds.y : 0;
      const w = Math.max(1, Math.round(bounds && bounds.w !== undefined ? bounds.w : (ctx.canvas ? ctx.canvas.width : 100)));
      const h = Math.max(1, Math.round(bounds && bounds.h !== undefined ? bounds.h : (ctx.canvas ? ctx.canvas.height : 100)));

      try { ctx.drawImage(el, x, y, w, h); } catch (_) { return; }

      const f = fx || {};
      let intensity = (f.intensity !== undefined && f.intensity !== null) ? +f.intensity : 90;
      if (isNaN(intensity)) intensity = 90;
      intensity = Math.max(0, Math.min(300, intensity));
      if (intensity <= 0) return;

      let pos = (f.position !== undefined && f.position !== null) ? +f.position : 50;
      if (isNaN(pos)) pos = 50;
      let bw = (f.width !== undefined && f.width !== null) ? +f.width : 18;
      if (isNaN(bw)) bw = 18;
      bw = Math.max(0.5, Math.min(200, bw));
      let ang = (f.angle !== undefined && f.angle !== null) ? +f.angle : 25;
      if (isNaN(ang)) ang = 25;
      ang = Math.max(-80, Math.min(80, ang));
      let soft = (f.softness !== undefined && f.softness !== null) ? +f.softness : 60;
      if (isNaN(soft)) soft = 60;
      soft = Math.max(0, Math.min(100, soft));

      const bandW = (bw / 100) * w;
      const cx = x + (pos / 100) * w;
      const cy = y + h / 2;
      const diag = Math.sqrt(w * w + h * h);
      const inner = 0.5 - (soft / 100) * 0.5; // 0 keras .. 0.5 super lembut
      const col = f.color || '#ffffff';
      const a = Math.min(1, intensity / 100);

      try {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(cx, cy);
        ctx.rotate((ang * Math.PI) / 180);
        let grad = null;
        try {
          if (typeof ctx.createLinearGradient === 'function') {
            grad = ctx.createLinearGradient(-bandW / 2, 0, bandW / 2, 0);
          }
        } catch (_) { grad = null; }
        if (grad && typeof grad.addColorStop === 'function') {
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(Math.max(0, Math.min(0.5, inner)), 'rgba(0,0,0,0)');
          grad.addColorStop(0.5, col);
          grad.addColorStop(Math.max(0.5, Math.min(1, 1 - inner)), 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = col;
        }
        ctx.globalAlpha = a;
        ctx.fillRect(-bandW / 2, -diag / 2, bandW, diag);
        ctx.restore();
      } catch (_) {
        try { ctx.restore(); } catch (_) {}
      }
    }
  });
})(typeof window !== 'undefined' ? window : this);
