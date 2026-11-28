/* editar.js — Página para editar una obra (?id=...) o varias a la vez (?ids=a,b,c). */

document.addEventListener('DOMContentLoaded', function () {
  MODO = 'admin';
  protegerAdmin(async function () {
    try { await aplicarIdioma(); } catch (e) {}

    var cont = document.getElementById('form-obra');
    var params = new URLSearchParams(window.location.search);
    var idsParam = params.get('ids');
    var id = params.get('id');

    await obtenerSeries(true);

    if (idsParam) {
      var ids = idsParam.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      if (!ids.length) {
        cont.innerHTML = '<p class="mensaje-vacio">No hay obras seleccionadas.</p>';
        return;
      }
      var tituloM = document.getElementById('titulo-editar');
      if (tituloM) tituloM.textContent = 'Editar ' + ids.length + ' obras';
      montarMasivo(cont, ids);
      return;
    }

    if (!id) {
      cont.innerHTML = '<p class="mensaje-vacio">Falta el id de la obra.</p>';
      return;
    }

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

/* ===== Edición de varias obras: solo se cambia lo que se marque ===== */

function montarMasivo(cont, ids) {
  var opciones = seriesOrdenadas(cacheSeries, cacheObras).map(function (s) {
    return '<option value="' + s.id + '">' + escaparHTML(s.tema) + '</option>';
  }).join('');

  cont.innerHTML = [
    '<form class="form-obra" id="form-masivo" novalidate>',
    '  <div class="form-col">',
    '    <p class="form-ayuda">Se aplica a ' + ids.length + ' obras. Marcá solo los datos que quieras cambiar; lo demás queda igual.</p>',

    '    <div class="campo-masivo">',
    '      <label class="campo-check"><input type="checkbox" id="chk-serie"> Cambiar serie</label>',
    '      <select id="masivo-serie">' + opciones + '</select>',
    '    </div>',

    '    <div class="campo-masivo">',
    '      <label class="campo-check"><input type="checkbox" id="chk-anio"> Cambiar año</label>',
    '      <input type="number" id="masivo-anio" min="1900" max="2100" placeholder="Año">',
    '    </div>',

    '    <div class="campo-masivo">',
    '      <label class="campo-check"><input type="checkbox" id="chk-materiales"> Cambiar materiales y técnica</label>',
    '      <textarea id="masivo-materiales" rows="2" placeholder="Materiales y técnica"></textarea>',
    '    </div>',

    '    <div class="campo-masivo">',
    '      <label class="campo-check"><input type="checkbox" id="chk-disponible"> Cambiar disponibilidad</label>',
    '      <select id="masivo-disponible"><option value="true">Disponible</option><option value="false">Vendida</option></select>',
    '    </div>',
    '  </div>',

    '  <div class="form-acciones">',
    '    <button type="submit" class="btn btn-primario" id="btn-guardar-masivo">Guardar cambios</button>',
    '    <a href="admin.html" class="btn btn-cancelar" id="btn-cancelar-masivo">Cancelar</a>',
    '    <span class="form-estado" id="estado-masivo"></span>',
    '  </div>',
    '</form>'
  ].join('');

  var mapa = [['chk-serie', 'masivo-serie'], ['chk-anio', 'masivo-anio'],
              ['chk-materiales', 'masivo-materiales'], ['chk-disponible', 'masivo-disponible']];
  mapa.forEach(function (par) {
    var chk = document.getElementById(par[0]);
    var campo = document.getElementById(par[1]);
    campo.disabled = true;
    chk.addEventListener('change', function () { campo.disabled = !chk.checked; });
  });

  var form = document.getElementById('form-masivo');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    guardarMasivo(ids, form);
  });
}

async function guardarMasivo(ids, form) {
  var usar = {
    serie: document.getElementById('chk-serie').checked,
    anio: document.getElementById('chk-anio').checked,
    materiales: document.getElementById('chk-materiales').checked,
    disponible: document.getElementById('chk-disponible').checked
  };
  var estadoEl = document.getElementById('estado-masivo');
  var btn = document.getElementById('btn-guardar-masivo');

  if (!usar.serie && !usar.anio && !usar.materiales && !usar.disponible) {
    alert('Marcá al menos un dato para cambiar.');
    return;
  }

  var nuevaSerie = document.getElementById('masivo-serie').value;
  var nuevoAnio = document.getElementById('masivo-anio').value;
  var nuevosMateriales = document.getElementById('masivo-materiales').value.trim();
  var nuevaDisp = document.getElementById('masivo-disponible').value;

  if (usar.anio && !nuevoAnio) { alert('Escribí el año.'); return; }
  if (usar.materiales && !nuevosMateriales) { alert('Escribí los materiales y la técnica.'); return; }

  btn.disabled = true;
  var guardadas = 0;

  for (var i = 0; i < ids.length; i++) {
    try {
      var o = await obtenerObra(ids[i]);
      if (!o) continue;

      if (usar.serie) {
        o.serieId = nuevaSerie;
        var serie = buscarSerie(nuevaSerie);
        if (serie) o.precio = calcularPrecio(o.ancho || 0, o.alto || 0, serie.factorPrecio);
      }
      if (usar.anio) o.anio = Number(nuevoAnio);
      if (usar.materiales) o.materiales = nuevosMateriales;
      if (usar.disponible) o.disponible = (nuevaDisp === 'true');

      o.fechaModificacion = new Date().toISOString();

      if (await actualizarObraAPI(o)) guardadas++;
    } catch (err) {
      console.error('No se pudo guardar', ids[i], err);
    }
  }

  invalidarCache();

  if (guardadas === 0) {
    alert('No se pudo guardar ninguna obra.');
    btn.disabled = false;
    return;
  }

  if (estadoEl) estadoEl.textContent = 'Guardadas ' + guardadas + ' de ' + ids.length + '.';
  window.location.href = 'admin.html?ok=1';
}
