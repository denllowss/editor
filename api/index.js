/**
 * Vercel serverless entry (v0.13.0).
 *
 * Mengekspor aplikasi Express utuh dari ../server.js (static + halaman +
 * REST API). vercel.json me-rewrite SEMUA request ke function ini sehingga
 * perilaku di Vercel identik dengan `node server.js` lokal.
 *
 * Catatan: server.js TIDAK memanggil app.listen() saat diimpor
 * (dijaga require.main === module) — wajib untuk serverless.
 */
const app = require('../server');

module.exports = app;
