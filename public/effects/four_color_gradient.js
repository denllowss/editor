(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  function hexRgb(hex, fb) {
    let c = (hex || fb || '#808080').replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    const n = parseInt(c, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  let gCanvas = null;
  let gCtx = null;

  reg.register({
    id: 'four-color-gradient',
    name: '4-Color Gradient',
    category: 'background',
    icon: 'assets/FXPH.svg',
    description: 'Bilinear four-corner gradient wash with blend modes',
    params: [
      { id: 'colorTL', label: 'Top Left', type: 'color', default: '#3051ff' },
      { id: 'colorTR', label: 'Top Right', type: 'color', default: '#af52de' },
      { id: 'colorBL', label: 'Bottom Left', type: 'color', default: '#00c7be' },
      { id: 'colorBR', label: 'Bottom Right', type: 'color', default: '#ffcc00' },
      { id: 'blend', label: 'Blend', type: 'select', options: ['normal', 'multiply', 'screen', 'overlay'], default: 'normal' },
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

      if (typeof document === 'undefined') return;
      if (!gCanvas) {
        gCanvas = document.createElement('canvas');
        gCtx = gCanvas.getContext('2d');
      }
      if (!gCtx) return;
      const S = 64;
      if (gCanvas.width !== S || gCanvas.height !== S) {
        gCanvas.width = S;
        gCanvas.height = S;
      }
      const tl = hexRgb(f.colorTL, '#3051ff');
      const tr = hexRgb(f.colorTR, '#af52de');
      const bl = hexRgb(f.colorBL, '#00c7be');
      const br = hexRgb(f.colorBR, '#ffcc00');
      let img;
      try { img = gCtx.createImageData(S, S); } catch (_) { return; }
      const d = img.data;
      for (let py = 0; py < S; py++) {
        const v = py / (S - 1);
        for (let px = 0; px < S; px++) {
          const u = px / (S - 1);
          const o = (py * S + px) * 4;
          const wTL = (1 - u) * (1 - v);
          const wTR = u * (1 - v);
          const wBL = (1 - u) * v;
          const wBR = u * v;
          d[o] = tl[0] * wTL + tr[0] * wTR + bl[0] * wBL + br[0] * wBR;
          d[o + 1] = tl[1] * wTL + tr[1] * wTR + bl[1] * wBL + br[1] * wBR;
          d[o + 2] = tl[2] * wTL + tr[2] * wTR + bl[2] * wBL + br[2] * wBR;
          d[o + 3] = 255;
        }
      }
      try { gCtx.putImageData(img, 0, 0); } catch (_) { return; }

      const blend = (f.blend === 'multiply' || f.blend === 'screen' || f.blend === 'overlay') ? f.blend : 'source-over';
      try {
        ctx.save();
        ctx.globalCompositeOperation = blend;
        ctx.globalAlpha = opacity / 100;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(gCanvas, x, y, w, h);
        ctx.restore();
      } catch (_) {
        try { ctx.restore(); } catch (_) {}
      }
    }
  });
})(typeof window !== 'undefined' ? window : this);
