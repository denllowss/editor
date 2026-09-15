/**
 * LAYOUT-STYLES - Gaya tampilan editor per tipe perangkat (v0.11.0).
 *
 * - Deteksi kelas perangkat dari lebar viewport: phone (<600) / tablet
 *   (600-1023) / desktop (>=1024). Ponsel: tanpa pilihan (tampilan bawaan).
 * - Pilihan gaya tersimpan per kelas di localStorage:
 *     desktop -> after-effects (default) | capcut | klasik
 *     tablet  -> capcut-tablet (default) | klasik
 * - Menerapkan html[data-device] + html[data-layout] yang dibaca
 *   css/layout-styles.css. Sinkron dengan snippet pra-render di <head>
 *   editor.html (konstanta KUNCI & DEFAULT SAMA — diuji paritasnya).
 * - Mode after-effects: drawer di-reparent ke body sebagai dok kanan;
 *   dikembalikan ke induk semula saat gaya lain dipilih.
 * - Tanpa dependensi editor.js; aman diuji di Node (VM).
 */
(function (root) {
  'use strict';

  var KEY_DESKTOP = 'fishtool_layout_desktop';
  var KEY_TABLET = 'fishtool_layout_tablet';

  var OPTIONS = {
    desktop: [
      { id: 'after-effects', label: 'After Effects' },
      { id: 'capcut', label: 'CapCut' },
      { id: 'klasik', label: 'Klasik' }
    ],
    tablet: [
      { id: 'capcut-tablet', label: 'CapCut Tablet' },
      { id: 'klasik', label: 'Klasik' }
    ]
  };
  var DEFAULTS = { desktop: 'after-effects', tablet: 'capcut-tablet' };

  function deviceClass(width) {
    var w = (width === undefined)
      ? ((root && root.innerWidth !== undefined) ? root.innerWidth : 0)
      : width;
    if (w < 600) return 'phone';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  function store() {
    try {
      return (root && root.localStorage) ? root.localStorage : null;
    } catch (_) {
      return null;
    }
  }

  function optionsFor(cls) {
    return OPTIONS[cls] || [];
  }

  function validId(cls, id) {
    var list = optionsFor(cls);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return true;
    }
    return false;
  }

  function keyFor(cls) {
    return cls === 'desktop' ? KEY_DESKTOP : KEY_TABLET;
  }

  function getSaved(cls) {
    if (cls !== 'desktop' && cls !== 'tablet') return null;
    var st = store();
    var v = null;
    if (st) {
      try {
        v = st.getItem(keyFor(cls));
      } catch (_) {
        v = null;
      }
    }
    return validId(cls, v) ? v : DEFAULTS[cls];
  }

  function setSaved(cls, id) {
    var st = store();
    if (!st || !validId(cls, id)) return false;
    try {
      st.setItem(keyFor(cls), id);
    } catch (_) {
      return false;
    }
    return true;
  }

  function labelFor(id) {
    var clss = ['desktop', 'tablet'];
    for (var c = 0; c < clss.length; c++) {
      var list = optionsFor(clss[c]);
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i].label;
      }
    }
    return '';
  }

  function doc() {
    try {
      return (root && root.document) ? root.document : null;
    } catch (_) {
      return null;
    }
  }

  // Sinkronkan dropdown + ringkasan setting dari state aktif.
  function syncSettings(cls, layout) {
    var d = doc();
    if (!d || typeof d.getElementById !== 'function') return;
    var label = labelFor(layout);
    var dd = null;
    try {
      dd = d.getElementById('dropdown-layout-style');
    } catch (_) {
      dd = null;
    }
    if (dd) {
      try {
        if (typeof dd.setAttribute === 'function') dd.setAttribute('data-value', layout);
        else if (dd.dataset) dd.dataset.value = layout;
        var lab = (typeof dd.querySelector === 'function')
          ? dd.querySelector('.custom-dropdown-label') : null;
        if (lab) lab.textContent = label;
        var items = (typeof dd.querySelectorAll === 'function')
          ? dd.querySelectorAll('.custom-dropdown-item') : [];
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var val = null;
          if (it.getAttribute) {
            try {
              val = it.getAttribute('data-val');
            } catch (_) {
              val = null;
            }
          } else if (it.dataset) {
            val = it.dataset.val;
          }
          if (it.classList && typeof it.classList.toggle === 'function') {
            it.classList.toggle('is-selected', val === layout);
          }
        }
      } catch (_) {}
    }
    var sum = null;
    try {
      sum = d.getElementById('summary-settings-layout');
    } catch (_) {
      sum = null;
    }
    if (sum) {
      try {
        sum.textContent = label;
      } catch (_) {}
    }
  }

  // Rumah semula drawer (untuk restore keluar mode dok).
  var _dockHome = null;

  // After Effects: drawer menempel ke body sebagai dok kanan.
  // Gaya lain: kembalikan ke induk semula + cabut status dok.
  function syncDock(layout) {
    try {
      var d = doc();
      if (!d || typeof d.getElementById !== 'function' || !d.body) return;
      var drawer = d.getElementById('timeline-layer-drawer');
      if (!drawer) return;
      if (layout === 'after-effects') {
        if (drawer.parentNode !== d.body) {
          _dockHome = { parent: drawer.parentNode, next: drawer.nextSibling };
          d.body.appendChild(drawer);
        }
        if (drawer.classList) drawer.classList.add('is-docked');
      } else {
        if (drawer.parentNode === d.body && _dockHome && _dockHome.parent) {
          try {
            _dockHome.parent.insertBefore(drawer, _dockHome.next);
          } catch (_) {}
        }
        if (drawer.classList) drawer.classList.remove('is-docked');
        if (d.body.classList) d.body.classList.remove('has-docked-drawer');
      }
    } catch (_) {}
  }

  // Konten menempel (tiling) hanya saat dok AE terbuka.
  function refreshDockedMargin() {
    try {
      var d = doc();
      if (!d || !d.body || !d.body.classList) return;
      var layout = d.documentElement && d.documentElement.dataset
        ? d.documentElement.dataset.layout : null;
      var drawer = (typeof d.getElementById === 'function')
        ? d.getElementById('timeline-layer-drawer') : null;
      var open = layout === 'after-effects' && drawer && drawer.classList &&
        typeof drawer.classList.contains === 'function' &&
        drawer.classList.contains('is-active');
      d.body.classList.toggle('has-docked-drawer', !!open);
    } catch (_) {}
  }

  function apply() {
    var d = doc();
    if (!d || !d.documentElement || !d.documentElement.dataset) return null;
    var cls = deviceClass();
    var layout = cls === 'phone' ? 'mobile' : getSaved(cls);
    try {
      d.documentElement.dataset.device = cls;
      d.documentElement.dataset.layout = layout;
    } catch (_) {
      return null;
    }
    syncSettings(cls, layout);
    syncDock(layout);
    refreshDockedMargin();
    return { device: cls, layout: layout };
  }

  function toast(msg) {
    try {
      var fn = root && root.showEffectsRackToast;
      if (typeof fn === 'function') fn(msg);
    } catch (_) {}
  }

  function setLayout(id) {
    var cls = deviceClass();
    if (cls === 'phone') return false;
    if (!validId(cls, id)) return false;
    setSaved(cls, id);
    apply();
    var label = labelFor(id);
    if (label) toast('Tampilan: ' + label);
    return true;
  }

  // Binding LANGSUNG per-item (bukan delegasi document): item menu ini statis
  // sehingga handler generik .custom-dropdown lebih dulu stopPropagation.
  // Kedua handler boleh jalan beriringan (generik urus label, ini terapkan).
  function wireMenu() {
    var d = doc();
    if (!d || typeof d.getElementById !== 'function') return;
    var menu = null;
    try {
      menu = d.getElementById('menu-layout-style');
    } catch (_) {
      menu = null;
    }
    if (!menu || typeof menu.querySelectorAll !== 'function') return;
    var items = [];
    try {
      items = menu.querySelectorAll('.custom-dropdown-item');
    } catch (_) {
      items = [];
    }
    for (var i = 0; i < items.length; i++) {
      (function (it) {
        try {
          if (!it || typeof it.addEventListener !== 'function') return;
          if (it.dataset && it.dataset.layoutWired === '1') return;
          if (it.dataset) it.dataset.layoutWired = '1';
          it.addEventListener('click', function () {
            try {
              var id = null;
              if (typeof it.getAttribute === 'function') id = it.getAttribute('data-val');
              else if (it.dataset) id = it.dataset.val;
              if (id) setLayout(id);
            } catch (_) {}
          });
        } catch (_) {}
      })(items[i]);
    }
  }

  function watchDrawer() {
    try {
      if (!root || typeof root.MutationObserver !== 'function') return;
      var d = doc();
      if (!d || typeof d.getElementById !== 'function') return;
      var drawer = d.getElementById('timeline-layer-drawer');
      if (!drawer) return;
      var obs = new root.MutationObserver(function () {
        refreshDockedMargin();
      });
      obs.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    } catch (_) {}
  }

  var _rzT = null;
  function onResize() {
    try {
      if (_rzT && typeof root.clearTimeout === 'function') root.clearTimeout(_rzT);
      if (root && typeof root.setTimeout === 'function') {
        _rzT = root.setTimeout(function () {
          apply();
        }, 150);
      } else {
        apply();
      }
    } catch (_) {}
  }

  function init() {
    apply();
    wireMenu();
    watchDrawer();
    try {
      if (root && typeof root.addEventListener === 'function') {
        root.addEventListener('resize', onResize);
      }
    } catch (_) {}
  }

  var api = {
    deviceClass: deviceClass,
    getSaved: getSaved,
    setLayout: setLayout,
    apply: apply,
    labelFor: labelFor,
    syncSettings: syncSettings,
    OPTIONS: OPTIONS,
    DEFAULTS: DEFAULTS,
    KEYS: { desktop: KEY_DESKTOP, tablet: KEY_TABLET }
  };

  try {
    if (root) root.LayoutStyles = api;
  } catch (_) {}

  try {
    var d0 = doc();
    if (d0 && typeof d0.addEventListener === 'function') {
      if (d0.readyState === 'loading') d0.addEventListener('DOMContentLoaded', init);
      else init();
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
