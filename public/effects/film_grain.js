/**
 * FILM GRAIN - Modular Layer Effect Plugin
 * (Node.js port addition - not part of upstream v0.5.14)
 *
 * Animated (or static) cinematic film grain overlay with seeded,
 * deterministic noise so preview and export render identically.
 */
(function(window) {
  'use strict';
  const reg = (window && window.FishEffectsRegistry) || (typeof global !== 'undefined' && global.FishEffectsRegistry);
  if (!reg) return;

  const TILE = 160;

  let _small = null;
  let _smallCtx = null;
  let _tile = null;
  let _tileCtx = null;
  let _tileKey = '';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function isOn(v, dflt) {
    if (v === undefined || v === null) return !!dflt;
    return !(v === 0 || v === false || v === '0' || v === 'false');
  }

  function getCurrentTime(layer, currentSec) {
    if (typeof currentSec === 'number' && !isNaN(currentSec)) return currentSec;
    if (layer && typeof layer._currentSec === 'number' && !isNaN(layer._currentSec)) return layer._currentSec;
    if (layer && typeof layer._timeInClip === 'number' && !isNaN(layer._timeInClip)) return layer._timeInClip;
    if (typeof window !== 'undefined') {
      if (typeof window.currentPlaybackSec === 'number' && !isNaN(window.currentPlaybackSec)) return window.currentPlaybackSec;
      if (typeof window.currentSec === 'number' && !isNaN(window.currentSec)) return window.currentSec;
      if (typeof window.getCurrentPlayheadTime === 'function') {
        const pt = window.getCurrentPlayheadTime();
        if (typeof pt === 'number' && !isNaN(pt)) return pt;
      }
      const pps = window.currentPixelsPerSecond || 80;
      const panX = window.timelinePanX !== undefined ? Math.min(0, window.timelinePanX) : 0;
      return Math.max(0, -panX) / pps;
    }
    return 0;
  }

  function ensureTile(frame, size, mono) {
    if (typeof document === 'undefined') return null;
    const key = frame + '|' + size + '|' + (mono ? 1 : 0);
    if (_tile && _tileKey === key) return _tile;
    if (!_small) {
      _small = document.createElement('canvas');
      _smallCtx = _small.getContext('2d');
    }
    if (!_tile) {
      _tile = document.createElement('canvas');
      _tileCtx = _tile.getContext('2d');
    }
    const sw = Math.max(1, Math.ceil(TILE / size));
    const sh = Math.max(1, Math.ceil(TILE / size));
    if (_small.width !== sw || _small.height !== sh) {
      _small.width = sw;
      _small.height = sh;
    }
    if (_tile.width !== TILE || _tile.height !== TILE) {
      _tile.width = TILE;
      _tile.height = TILE;
    }
    const seed = ((frame * 2654435761) ^ (size * 97) ^ (mono ? 13 : 7919)) >>> 0;
    const rand = mulberry32(seed);
    try {
      const img = _smallCtx.createImageData(sw, sh);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (mono) {
          const v = Math.round(128 + (rand() * 2 - 1) * 127);
          d[i] = v; d[i + 1] = v; d[i + 2] = v;
        } else {
          d[i] = Math.round(128 + (rand() * 2 - 1) * 127);
          d[i + 1] = Math.round(128 + (rand() * 2 - 1) * 127);
          d[i + 2] = Math.round(128 + (rand() * 2 - 1) * 127);
        }
        d[i + 3] = 255;
      }
      _smallCtx.putImageData(img, 0, 0);
      _tileCtx.clearRect(0, 0, TILE, TILE);
      _tileCtx.imageSmoothingEnabled = false;
      _tileCtx.drawImage(_small, 0, 0, TILE, TILE);
    } catch (_) {
      return null;
    }
    _tileKey = key;
    return _tile;
  }

  reg.register({
    id: 'film-grain',
    name: 'Film Grain',
    category: 'lightning',
    icon: 'assets/FXPH.svg',
    description: 'Animated cinematic film grain with size, mono/color and blend controls',
    params: [
      { id: 'amount', label: 'Amount', type: 'number', min: 0, max: 100, default: 25, unit: '%' },
      { id: 'size', label: 'Grain Size', type: 'number', min: 1, max: 4, default: 1, step: 1, unit: 'px' },
      { id: 'animated', label: 'Animated', type: 'switch', default: 1 },
      { id: 'mono', label: 'Monochrome', type: 'switch', default: 1 },
      { id: 'blendMode', label: 'Blend Mode', type: 'select', options: ['overlay', 'soft-light', 'source-over'], default: 'overlay' }
    ],
    render(ctx, el, layer, bounds, fx, currentSec) {
      if (!ctx) return;
      const x = bounds && bounds.x !== undefined ? bounds.x : 0;
      const y = bounds && bounds.y !== undefined ? bounds.y : 0;
      const w = Math.max(1, Math.round(bounds && bounds.w !== undefined ? bounds.w : (ctx.canvas ? ctx.canvas.width : 500)));
      const h = Math.max(1, Math.round(bounds && bounds.h !== undefined ? bounds.h : (ctx.canvas ? ctx.canvas.height : 500)));

      if (el) {
        try { ctx.drawImage(el, x, y, w, h); } catch (_) {}
      }

      const amt = Math.max(0, Math.min(1, ((fx && fx.amount !== undefined ? fx.amount : 25) / 100)));
      if (amt <= 0.001) return;

      const size = Math.max(1, Math.min(8, Math.round(fx && fx.size !== undefined ? fx.size : 1)));
      const animated = isOn(fx && fx.animated, 1);
      const mono = isOn(fx && fx.mono, 1);
      const blend = (fx && fx.blendMode) || 'overlay';

      const curTime = getCurrentTime(layer, currentSec);
      const frame = animated ? Math.floor(Math.max(0, curTime) * 24) : 0;

      const tile = ensureTile(frame, size, mono);
      if (!tile) return;

      ctx.save();
      try {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        if (blend && blend !== 'normal') {
          try { ctx.globalCompositeOperation = blend; } catch (_) {}
        }
        ctx.globalAlpha = amt;
        ctx.translate(x, y);
        ctx.fillStyle = ctx.createPattern(tile, 'repeat');
        ctx.fillRect(0, 0, w, h);
      } catch (_) {}
      ctx.restore();
    }
  });
})(typeof window !== 'undefined' ? window : this);
