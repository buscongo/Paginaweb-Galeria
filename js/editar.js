/* editar.js — Página para editar una obra existente (?id=...). */

document.addEventListener('DOMContentLoaded', function () {
  MODO = 'admin';
  protegerAdmin(async function () {
    try { await aplicarIdioma(); } catch (e) {}

    var cont = document.getElementById('form-obra');
    var id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      cont.innerHTML = '<p class="mensaje-vacio">Falta el id de la obra.</p>';
      return;
    }

    await obtenerSeries(true);
    var obra = await obtenerObra(id);
    if (!obra) {
      cont.innerHTML = '<p class="mensaje-vacio">No se encontró esa obra.</p>';
      return;
    }

    var titulo = document.getElementById('titulo-editar');
    if (titulo) titulo.textContent = 'Editar: ' + obra.titulo;

    await FormObra.montar(cont, { modo: 'editar', obra: obra });
  });
});
