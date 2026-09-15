/**
 * DESKTOP-DROP - Drag & drop file langsung di desktop (v0.12.0).
 *
 * Zona impor spesifik (timeline, preview, media pool) sudah ada; modul ini
 * menutup SISANYA: seret file dari OS ke MANA SAJA di jendela editor desktop
 * (>=1024px) -> veil penuh tampil -> jatuhkan -> file langsung masuk timeline
 * via handleDropFilesWithAction(files, 'import-media', true).
 *
 * - window dragover/drop SELALU preventDefault saat aktif: browser tidak boleh
 *   membuka file / navigasi pergi saat drop meleset dari zona.
 * - Drop TEPAT di zona khusus dibiarkan ditangani zona itu (anti-impor ganda).
 * - Tanpa dependensi editor.js selain pemanggil impor; aman diuji di Node (VM).
 */
(function (root) {
  'use strict';

  var MIN_WIDTH = 1024;
  var ZONE_SEL = '#timeline-layers-viewport, #editor-preview-container, #add-layer-media-pool';
  var IMPORT_ACTION = 'import-media';

  var VIDEO_EXT = ['mp4', 'mov', 'webm', 'mkv'];
  var IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif', 'jfif'];
  var AUDIO_EXT = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];

  function enabled() {
    try {
      return (root && root.innerWidth !== undefined ? root.innerWidth : 0) >= MIN_WIDTH;
    } catch (_) {
      return false;
    }
  }

  function doc() {
    try {
      return (root && root.document) ? root.document : null;
    } catch (_) {
      return null;
    }
  }

  function veilEl() {
    var d = doc();
    if (!d || typeof d.getElementById !== 'function') return null;
    try {
      return d.getElementById('desktop-drop-veil');
    } catch (_) {
      return null;
    }
  }

  function filesFrom(dt) {
    if (!dt) return [];
    try {
      if (dt.files && dt.files.length) return Array.prototype.slice.call(dt.files);
    } catch (_) {}
    return [];
  }

  function hasFiles(dt) {
    if (!dt) return false;
    try {
      if (dt.files && dt.files.length > 0) return true;
      var types = dt.types;
      if (types) {
        if (typeof types.indexOf === 'function') return types.indexOf('Files') >= 0;
        if (typeof types.contains === 'function') return types.contains('Files');
        for (var i = 0; i < types.length; i++) {
          if (types[i] === 'Files') return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function overZone(target) {
    try {
      if (target && typeof target.closest === 'function') return !!target.closest(ZONE_SEL);
    } catch (_) {}
    return false;
  }

  function extOf(name) {
    if (typeof name !== 'string') return '';
    var parts = name.split('.');
    if (parts.length < 2) return '';
    return parts.pop().toLowerCase();
  }

  function kindOf(file) {
    var mime = '';
    try {
      mime = (file && file.type ? file.type : '').toLowerCase();
    } catch (_) {
      mime = '';
    }
    var ext = extOf(file ? file.name : '');
    if (mime.indexOf('video/') === 0 || VIDEO_EXT.indexOf(ext) >= 0) return 'video';
    if (mime.indexOf('image/') === 0 || IMAGE_EXT.indexOf(ext) >= 0) return 'image';
    if (mime.indexOf('audio/') === 0 || AUDIO_EXT.indexOf(ext) >= 0) return 'audio';
    return 'other';
  }

  function summarizeFiles(files) {
    var list = files || [];
    var c = { video: 0, image: 0, audio: 0, other: 0 };
    for (var i = 0; i < list.length; i++) {
      c[kindOf(list[i])]++;
    }
    var kinds = [];
    if (c.video) kinds.push('video');
    if (c.image) kinds.push('foto');
    if (c.audio) kinds.push('audio');
    var label;
    if (list.length === 0) label = 'file';
    else if (kinds.length === 1 && c.other === 0) label = list.length + ' ' + kinds[0];
    else label = list.length + ' file';
    return { count: list.length, label: label };
  }

  var _lastSig = null;

  function showVeil(files) {
    var v = veilEl();
    if (!v) return;
    var sum = summarizeFiles(files || []);
    var sig = sum.count + '|' + sum.label;
    try {
      if (v.classList) v.classList.add('is-active');
      if (typeof v.setAttribute === 'function') v.setAttribute('aria-hidden', 'false');
      if (sig !== _lastSig) {
        _lastSig = sig;
        var t = (v.querySelector && typeof v.querySelector === 'function')
          ? v.querySelector('#desktop-drop-title') : null;
        var dsc = (v.querySelector && typeof v.querySelector === 'function')
          ? v.querySelector('#desktop-drop-desc') : null;
        if (t) t.textContent = sum.count > 0 ? ('Jatuhkan ' + sum.label + ' di sini') : 'Jatuhkan file di sini';
        if (dsc) dsc.textContent = 'Video • Foto • Audio — langsung masuk timeline';
      }
    } catch (_) {}
  }

  function hideVeil() {
    _lastSig = null;
    var v = veilEl();
    if (!v) return;
    try {
      if (v.classList) v.classList.remove('is-active');
      if (typeof v.setAttribute === 'function') v.setAttribute('aria-hidden', 'true');
    } catch (_) {}
  }

  var _depth = 0;

  function coordsOutside(e) {
    try {
      var w = root.innerWidth || 0;
      var h = root.innerHeight || 0;
      return e.clientX <= 0 || e.clientY <= 0 || e.clientX >= w || e.clientY >= h;
    } catch (_) {
      return false;
    }
  }

  function prevent(e) {
    try {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
    } catch (_) {}
  }

  function toast(msg) {
    try {
      var fn = root && root.showEffectsRackToast;
      if (typeof fn === 'function') fn(msg);
    } catch (_) {}
  }

  function importFiles(files) {
    var fn = null;
    try {
      fn = root && root.handleDropFilesWithAction;
    } catch (_) {
      fn = null;
    }
    if (typeof fn !== 'function') {
      toast('Impor belum siap, coba lagi sebentar.');
      return false;
    }
    try {
      var r = fn(files, IMPORT_ACTION, true);
      if (r && typeof r.catch === 'function') {
        r.catch(function () {
          toast('Gagal mengimpor file.');
        });
      }
    } catch (_) {
      toast('Gagal mengimpor file.');
      return false;
    }
    return true;
  }

  function onDragEnter(e) {
    if (!enabled()) return;
    if (!e || !hasFiles(e.dataTransfer)) return;
    if (overZone(e.target)) return;
    prevent(e);
    _depth++;
    showVeil(filesFrom(e.dataTransfer));
  }

  function onDragOver(e) {
    if (!enabled()) return;
    prevent(e); // mutlak: cegah browser membuka file
    try {
      if (e && e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    } catch (_) {}
    if (!e || !hasFiles(e.dataTransfer) || overZone(e.target)) {
      hideVeil();
      return;
    }
    showVeil(filesFrom(e.dataTransfer));
  }

  function onDragLeave(e) {
    if (!enabled()) return;
    _depth--;
    if (_depth <= 0 || coordsOutside(e)) {
      _depth = 0;
      hideVeil();
    }
  }

  function onDrop(e) {
    if (!enabled()) return;
    prevent(e); // mutlak: cegah navigasi browser
    _depth = 0;
    hideVeil();
    if (!e || overZone(e.target)) return; // zona khusus yang menangani
    var files = filesFrom(e.dataTransfer);
    if (!files.length) return;
    importFiles(files);
  }

  function onDragEnd() {
    _depth = 0;
    hideVeil();
  }

  function init() {
    try {
      if (!root || typeof root.addEventListener !== 'function') return false;
      if (root.__desktopDropWired) return true;
      root.__desktopDropWired = true;
      root.addEventListener('dragenter', onDragEnter);
      root.addEventListener('dragover', onDragOver);
      root.addEventListener('dragleave', onDragLeave);
      root.addEventListener('drop', onDrop);
      root.addEventListener('dragend', onDragEnd);
      return true;
    } catch (_) {
      return false;
    }
  }

  var api = {
    init: init,
    enabled: enabled,
    importFiles: importFiles,
    summarizeFiles: summarizeFiles,
    onDragEnter: onDragEnter,
    onDragOver: onDragOver,
    onDragLeave: onDragLeave,
    onDrop: onDrop,
    MIN_WIDTH: MIN_WIDTH,
    ZONE_SEL: ZONE_SEL
  };

  try {
    if (root) root.DesktopDrop = api;
  } catch (_) {}

  try {
    init();
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
