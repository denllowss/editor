/**
 * OpenFishTools Studio — Custom Aspect Ratio helper (v0.16.0, shared).
 *
 * Dipakai index.html (main.js) dan editor.html (editor.js):
 * - parse("W:H") dengan validasi (int 1–999, rasio 0.1–10).
 * - dimsFor(res, aspect): dimensi komposisi; preset dari resMap, custom
 *   dihitung dari sisi-pendek resolusi (1080p → 1080) dan dibulatkan genap.
 * - register(aspect): suntik dimensi custom ke window.resMap semua resolusi
 *   sehingga SELURUH lookup resMap[res][aspect] lama tetap jalan apa adanya.
 * - syncGrid/resolveGrid/updateCustomRow: wiring grid `.modal-aspect-grid`
 *   + baris input custom `#<gridId>-custom[-w|-h]`.
 */
(function (global) {
  'use strict';

  var PRESETS = ['16:9', '9:16', '1:1', '4:3', '21:9'];
  var SHORT_SIDE = { '4K': 2160, '2K': 1440, '1080p': 1080, '720p': 720, '480p': 480 };

  function parse(str) {
    var m = /^\s*(\d{1,4})\s*:\s*(\d{1,4})\s*$/.exec(String(str === undefined || str === null ? '' : str));
    if (!m) return null;
    var w = parseInt(m[1], 10);
    var h = parseInt(m[2], 10);
    if (!(w >= 1 && w <= 999 && h >= 1 && h <= 999)) return null;
    var r = w / h;
    if (!(r >= 0.1 && r <= 10)) return null;
    return { w: w, h: h, text: w + ':' + h };
  }

  function isPreset(str) {
    return PRESETS.indexOf(String(str)) !== -1;
  }

  function resMapRef() {
    if (typeof window !== 'undefined' && window.resMap) return window.resMap;
    if (global && global.resMap) return global.resMap;
    return null;
  }

  function dimsFor(res, aspect) {
    var rm = resMapRef();
    if (rm && rm[res] && rm[res][aspect]) return rm[res][aspect];
    var p = parse(aspect);
    if (!p) return [1920, 1080];
    var S = SHORT_SIDE[res] || 1080;
    if (S % 2) S += 1;
    var L = Math.round((S * Math.max(p.w, p.h)) / Math.min(p.w, p.h));
    if (L % 2) L += 1; // genap (syarat encoder video)
    return p.w >= p.h ? [L, S] : [S, L];
  }

  function register(aspect) {
    var p = parse(aspect);
    if (!p) return aspect;
    if (isPreset(p.text)) return p.text;
    var rm = resMapRef();
    if (rm) {
      Object.keys(SHORT_SIDE).forEach(function (res) {
        if (!rm[res]) rm[res] = {};
        if (!rm[res][p.text]) rm[res][p.text] = dimsFor(res, p.text);
      });
    }
    return p.text;
  }

  function customRow(grid) {
    if (!grid || !grid.id || typeof document === 'undefined') return null;
    return document.getElementById(grid.id + '-custom');
  }

  function updateCustomRow(grid) {
    var row = customRow(grid);
    if (!row || !grid) return;
    var sel = grid.querySelector('.aspect-ratio-frame.is-selected');
    row.hidden = !(sel && sel.dataset && sel.dataset.val === 'custom');
  }

  function syncGrid(grid, aspectVal) {
    if (!grid) return;
    var val = String(aspectVal || '16:9');
    var matched = false;
    grid.querySelectorAll('.aspect-ratio-frame').forEach(function (f) {
      var on = f.dataset && f.dataset.val === val;
      f.classList.toggle('is-selected', !!on);
      if (on) matched = true;
    });
    var p = parse(val);
    var row = customRow(grid);
    if (!matched && p && !isPreset(p.text)) {
      var cf = grid.querySelector('.aspect-ratio-frame[data-val="custom"]');
      if (cf) cf.classList.add('is-selected');
      if (typeof document !== 'undefined') {
        var wEl = document.getElementById(grid.id + '-custom-w');
        var hEl = document.getElementById(grid.id + '-custom-h');
        if (wEl) wEl.value = p.w;
        if (hEl) hEl.value = p.h;
      }
      if (row) row.hidden = false;
    } else if (row) {
      row.hidden = true;
    }
  }

  function resolveGrid(grid) {
    var sel = grid ? grid.querySelector('.aspect-ratio-frame.is-selected') : null;
    var val = (sel && sel.dataset && sel.dataset.val) || '16:9';
    if (val !== 'custom') return { aspect: val };
    var w = '';
    var h = '';
    if (grid && grid.id && typeof document !== 'undefined') {
      var wEl = document.getElementById(grid.id + '-custom-w');
      var hEl = document.getElementById(grid.id + '-custom-h');
      w = wEl ? wEl.value : '';
      h = hEl ? hEl.value : '';
    }
    var p = parse(String(w) + ':' + String(h));
    if (!p) return { error: 'Rasio custom tidak valid (isi L : T, 1–999)' };
    return { aspect: p.text };
  }

  function flagInvalidRow(grid) {
    var row = customRow(grid);
    if (!row) return;
    row.classList.add('is-error');
    setTimeout(function () { row.classList.remove('is-error'); }, 1600);
    if (grid && grid.id && typeof document !== 'undefined') {
      var wEl = document.getElementById(grid.id + '-custom-w');
      if (wEl && wEl.focus) { try { wEl.focus(); } catch (_) {} }
    }
  }

  var api = {
    PRESETS: PRESETS,
    parse: parse,
    isPreset: isPreset,
    dimsFor: dimsFor,
    register: register,
    syncGrid: syncGrid,
    resolveGrid: resolveGrid,
    updateCustomRow: updateCustomRow,
    flagInvalidRow: flagInvalidRow
  };

  if (global) {
    global.CustomAspect = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
