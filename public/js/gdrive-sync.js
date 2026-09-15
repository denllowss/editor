// Stub lokal (Node.js port) — sinkronisasi GDrive nonaktif secara default.
(function () {
  if (window.GDRIVE_CONFIG && window.GDRIVE_CONFIG.enabled) {
    console.warn('[gdrive-sync] enabled but no implementation in this port.');
  }
})();
