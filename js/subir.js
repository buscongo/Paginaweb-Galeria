/* subir.js — Página para dar de alta una obra nueva. */

document.addEventListener('DOMContentLoaded', function () {
  MODO = 'admin';
  protegerAdmin(async function () {
    try { await aplicarIdioma(); } catch (e) {}
    await FormObra.montar(document.getElementById('form-obra'), { modo: 'nuevo' });
  });
});
