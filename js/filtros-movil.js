/* filtros-movil.js — en móvil los filtros se abren con un botón «Filtrar».
   El panel se queda abierto al elegir opciones, para poder combinar varios filtros. */

document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('filtros-toggle');
  var panel = document.getElementById('filtros-panel');
  if (!btn || !panel) return;

  function fijarEstado(abierto) {
    panel.classList.toggle('abierto', abierto);
    btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    fijarEstado(!panel.classList.contains('abierto'));
  });
});
