/* ========================================
   admin.js — Inicialización de la página Admin
   Cargado solo en html/admin.html
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  MODO = 'admin';

  // Aplicar idioma y renderizar galería
  await aplicarIdioma();
  await inicializarFormulario();
  await cargarObrasActuales();
  inicializarFiltros();

  // Toggle de idioma
  var toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.addEventListener('click', cambiarIdioma);
  }

  // Cerrar modal
  var overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) cerrarModal();
    });
  }
  var cerrar = document.querySelector('.modal-cerrar');
  if (cerrar) cerrar.addEventListener('click', cerrarModal);

  // Cerrar modal de precios al hacer click fuera
  var precioOverlay = document.getElementById('precio-modal-overlay');
  if (precioOverlay) {
    precioOverlay.addEventListener('click', function (e) {
      if (e.target === precioOverlay) cerrarModalPrecio();
    });
  }
  var precioCerrar = document.querySelector('#precio-modal-overlay .modal-cerrar');
  if (precioCerrar) precioCerrar.addEventListener('click', cerrarModalPrecio);

  // Toggle de obras archivadas
  var btnArch = document.getElementById('btn-ver-archivadas');
  var chkArch = document.getElementById('chk-ver-archivadas');
  if (btnArch && chkArch) {
    btnArch.addEventListener('click', async function () {
      chkArch.checked = !chkArch.checked;
      setMostrarArchivadas(chkArch.checked);
      invalidarCache();
      await actualizarFiltrosSerie();
      await actualizarFiltroAno();
      await renderizarGaleria();
      await cargarObrasActuales();
    });
  }
});
