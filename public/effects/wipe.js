/**
 * WIPE - Modular Layer Effect Plugin
 * (Node.js port addition - setara efek "Wipe" Alight Motion)
 *
 * Menyapu layer searah sudut dengan tepi berbulu (feather).
 * Progress 0% = kosong, 100% = penuh.
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  let _work = null;
  let _workCtx = null;

  function ensureWork(w, h) {
    if (typeof document === 'undefined') return null;
    if (!_work) {
      _work = document.createElement('canvas');
      _workCtx = _work.getContext('2d');
    }
    if (_work.width !== w || _work.height !== h) {
      _work.width = w;
      _work.height = h;
    }
    return _workCtx;
  }

  reg.register({
    id: 'wipe',
    name: 'Wipe',
    category: 'layer',
    icon: 'assets/FXPH.svg',
    description: 'Directional linear wipe with feathered edge (Alight Motion equivalent)',
    params: [
      { id: 'direction', label: 'Direction', type: 'angle', min: -180, max: 180, default: 0, unit: '°' },
      { id: 'progress', label: 'Progress', type: 'number', min: 0, max: 100, default: 50, unit: '%' },
      { id: 'feather', label: 'Feather', type: 'number', min: 0, max: 100, default: 15, unit: '%' }
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

      const ang = (fx && fx.direction !== undefined ? fx.direction : 0) * Math.PI / 180;
      const prog = Math.max(0, Math.min(1, (fx && fx.progress !== undefined ? fx.progress : 50) / 100));
      const feath = Math.max(0, Math.min(1, (fx && fx.feather !== undefined ? fx.feather : 15) / 100));

      if (prog >= 0.999 && feath <= 0.001) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      const wctx = ensureWork(w, h);
      if (!wctx) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      try {
        wctx.clearRect(0, 0, w, h);
        wctx.drawImage(el, 0, 0, w, h);
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      // Masker gradien sepanjang arah sapuan (destination-in)
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);
      const half = (Math.abs(ux) * w + Math.abs(uy) * h) / 2;
      const cx = w / 2;
      const cy = h / 2;
      let g = null;
      try {
        g = wctx.createLinearGradient(cx - ux * half, cy - uy * half, cx + ux * half, cy + uy * half);
      } catch (_) {
        g = null;
      }
      if (!g || typeof g.addColorStop !== 'function') {
        // Lingkungan tanpa gradien (stub uji): tampilkan apa adanya
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }
      const edge = prog;
      const f = feath * 0.5;
      const stopA = Math.max(0, Math.min(1, edge - f));
      const stopB = Math.max(0, Math.min(1, edge + f));
      try {
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(stopA, 'rgba(0,0,0,1)');
        g.addColorStop(stopB, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        wctx.save();
        wctx.globalCompositeOperation = 'destination-in';
        wctx.fillStyle = g;
        wctx.fillRect(0, 0, w, h);
        wctx.restore();
      } catch (_) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
        return;
      }

      try { ctx.drawImage(_work, x, y, w, h); } catch (_) {}
    }
  });
})(typeof window !== 'undefined' ? window : this);
