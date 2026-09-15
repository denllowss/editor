/**
 * GLOW - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Glow" Alight Motion)
 *
 * Cahaya di sekitar bagian opak layer: siluet diwarnai → diblur →
 * di-blend screen di atas gambar asli. Intensity mengatur kekuatan.
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  let _tint = null;
  let _tintCtx = null;
  let _blur = null;
  let _blurCtx = null;

  function ensureCanvas(slot, w, h) {
    if (typeof document === 'undefined') return null;
    if (slot === 0) {
      if (!_tint) {
        _tint = document.createElement('canvas');
        _tintCtx = _tint.getContext('2d');
      }
      if (_tint.width !== w || _tint.height !== h) {
        _tint.width = w;
        _tint.height = h;
      }
      return _tintCtx;
    }
    if (!_blur) {
      _blur = document.createElement('canvas');
      _blurCtx = _blur.getContext('2d');
    }
    if (_blur.width !== w || _blur.height !== h) {
      _blur.width = w;
      _blur.height = h;
    }
    return _blurCtx;
  }

  function hexToCss(c) {
    if (typeof c === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) return c;
    return '#ffffff';
  }

  reg.register({
    id: 'glow',
    name: 'Glow',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Light glow around opaque areas (Alight Motion equivalent)',
    params: [
      { id: 'color', label: 'Color', type: 'color', default: '#ffffff' },
      { id: 'radius', label: 'Radius', type: 'number', min: 0, max: 100, default: 20, unit: 'px' },
      { id: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 200, default: 100, unit: '%' }
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

      // Gambar dasar selalu dulu (chain-safe + blend screen di atasnya)
      try { ctx.drawImage(el, x, y, w, h); } catch (_) {}

      const intensity = Math.max(0, Math.min(2, (fx && fx.intensity !== undefined ? fx.intensity : 100) / 100));
      if (intensity <= 0.001) return;
      const radius = Math.max(0, fx && fx.radius !== undefined ? fx.radius : 20);
      const color = hexToCss(fx && fx.color !== undefined ? fx.color : '#ffffff');

      const tctx = ensureCanvas(0, w, h);
      const bctx = ensureCanvas(1, w, h);
      if (!tctx || !bctx) return;

      // 1. Siluet: gambar → isi warna (alpha dipertahankan)
      try {
        tctx.clearRect(0, 0, w, h);
        tctx.drawImage(el, 0, 0, w, h);
        tctx.save();
        tctx.globalCompositeOperation = 'source-in';
        tctx.fillStyle = color;
        tctx.fillRect(0, 0, w, h);
        tctx.restore();
      } catch (_) {
        return;
      }

      // 2. Blur siluet
      try {
        bctx.clearRect(0, 0, w, h);
        if (radius > 0.001 && typeof window !== 'undefined' && window.FishEffects && typeof window.FishEffects.drawBlurred === 'function') {
          window.FishEffects.drawBlurred(bctx, _tint, w, h, radius);
        } else if (radius > 0.001) {
          bctx.save();
          bctx.filter = 'blur(' + radius + 'px)';
          bctx.drawImage(_tint, 0, 0, w, h);
          bctx.restore();
        } else {
          bctx.drawImage(_tint, 0, 0, w, h);
        }
      } catch (_) {
        return;
      }

      // 3. Blend screen di atas dasar
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = Math.min(1, intensity);
        ctx.drawImage(_blur, x, y, w, h);
        if (intensity > 1) {
          // Intensity >100%: lapis kedua untuk dorongan ekstra
          ctx.globalAlpha = Math.min(1, intensity - 1);
          ctx.drawImage(_blur, x, y, w, h);
        }
      } catch (_) {}
      ctx.restore();
    }
  });
})(typeof window !== 'undefined' ? window : this);
