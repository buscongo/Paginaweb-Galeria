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

/* ===== Edición de varias obras =====
   Un formulario general (se aplica a todas) y un formulario por obra.
   Lo que se cambie en el formulario de una obra manda sobre el general. */

var MASIVO = { obras: [], iniciales: [] };

async function montarMasivo(cont, ids) {
  cont.innerHTML = '<p class="form-ayuda">Cargando obras…</p>';

  MASIVO.obras = [];
  MASIVO.iniciales = [];
  for (var i = 0; i < ids.length; i++) {
    var o = await obtenerObra(ids[i]);
    if (!o) continue;
    MASIVO.obras.push(o);
    MASIVO.iniciales.push({
      serieId: o.serieId || '',
      anio: String(o.anio == null ? '' : o.anio),
      materiales: o.materiales || '',
      disponible: o.disponible ? 'true' : 'false'
    });
  }

  if (!MASIVO.obras.length) {
    cont.innerHTML = '<p class="mensaje-vacio">No se encontraron las obras.</p>';
    return;
  }

  var opcionesSerie = seriesOrdenadas(cacheSeries, cacheObras).map(function (s) {
    return '<option value="' + s.id + '">' + escaparHTML(s.tema) + '</option>';
  }).join('');

  var html = [];
  html.push('<form class="form-obra" id="form-masivo" novalidate>');
  html.push('  <div class="form-col">');
  html.push('    <h3 class="form-subtitulo">Para todas (' + MASIVO.obras.length + ')</h3>');
  html.push('    <p class="form-ayuda">Marcá solo lo que quieras cambiar en todas. Si después cambiás un dato en una obra puntual, ese dato manda.</p>');

  html.push('    <div class="campo-masivo">');
  html.push('      <label class="campo-check"><input type="checkbox" id="chk-serie"> Cambiar serie</label>');
  html.push('      <select id="masivo-serie">' + opcionesSerie + '</select>');
  html.push('    </div>');

  html.push('    <div class="campo-masivo">');
  html.push('      <label class="campo-check"><input type="checkbox" id="chk-anio"> Cambiar año</label>');
  html.push('      <input type="number" id="masivo-anio" min="1900" max="2100" placeholder="Año">');
  html.push('    </div>');

  html.push('    <div class="campo-masivo">');
  html.push('      <label class="campo-check"><input type="checkbox" id="chk-materiales"> Cambiar materiales y técnica</label>');
  html.push('      <textarea id="masivo-materiales" rows="2" placeholder="Materiales y técnica"></textarea>');
  html.push('    </div>');

  html.push('    <div class="campo-masivo">');
  html.push('      <label class="campo-check"><input type="checkbox" id="chk-disponible"> Cambiar disponibilidad</label>');
  html.push('      <select id="masivo-disponible"><option value="true">Disponible</option><option value="false">Vendida</option></select>');
  html.push('    </div>');
  html.push('  </div>');

  html.push('  <div class="form-col">');
  html.push('    <h3 class="form-subtitulo">Obra por obra</h3>');
  html.push('    <p class="form-ayuda">Cada obra con sus datos actuales. Lo que cambies acá tiene prioridad sobre el formulario general.</p>');

  MASIVO.obras.forEach(function (o, idx) {
    var ini = MASIVO.iniciales[idx];
    html.push('<div class="obra-masiva" id="obra-masiva-' + idx + '">');
    html.push('  <p class="obra-masiva-titulo">' + escaparHTML(o.titulo) + '</p>');

    html.push('  <label class="campo">Serie');
    html.push('    <select id="obra-' + idx + '-serie">' + opcionesSerie + '</select>');
    html.push('  </label>');

    html.push('  <label class="campo">Año');
    html.push('    <input type="number" id="obra-' + idx + '-anio" min="1900" max="2100">');
    html.push('  </label>');

    html.push('  <label class="campo">Materiales y técnica');
    html.push('    <textarea id="obra-' + idx + '-materiales" rows="2"></textarea>');
    html.push('  </label>');

    html.push('  <label class="campo">Disponibilidad');
    html.push('    <select id="obra-' + idx + '-disponible"><option value="true">Disponible</option><option value="false">Vendida</option></select>');
    html.push('  </label>');

    html.push('  <p class="obra-masiva-nota" id="obra-' + idx + '-nota"></p>');
    html.push('</div>');
  });

  html.push('  </div>');

  html.push('  <div class="form-acciones">');
  html.push('    <button type="submit" class="btn btn-primario" id="btn-guardar-masivo">Guardar cambios</button>');
  html.push('    <a href="admin.html" class="btn btn-cancelar" id="btn-cancelar-masivo">Cancelar</a>');
  html.push('    <span class="form-estado" id="estado-masivo"></span>');
  html.push('  </div>');
  html.push('</form>');

  cont.innerHTML = html.join('');

  /* valores iniciales en cada formulario de obra */
  MASIVO.obras.forEach(function (o, idx) {
    var ini = MASIVO.iniciales[idx];
    var sel = document.getElementById('obra-' + idx + '-serie');
    var anio = document.getElementById('obra-' + idx + '-anio');
    var mat = document.getElementById('obra-' + idx + '-materiales');
    var disp = document.getElementById('obra-' + idx + '-disponible');
    if (sel) sel.value = ini.serieId;
    if (anio) anio.value = ini.anio;
    if (mat) mat.value = ini.materiales;
    if (disp) disp.value = ini.disponible;

    [sel, anio, mat, disp].forEach(function (campo) {
      if (!campo) return;
      campo.addEventListener('input', function () { marcarCambioPropio(idx); });
      campo.addEventListener('change', function () { marcarCambioPropio(idx); });
    });
  });

  /* el general habilita sus campos */
  [['chk-serie', 'masivo-serie'], ['chk-anio', 'masivo-anio'],
   ['chk-materiales', 'masivo-materiales'], ['chk-disponible', 'masivo-disponible']].forEach(function (par) {
    var chk = document.getElementById(par[0]);
    var campo = document.getElementById(par[1]);
    if (!chk || !campo) return;
    campo.disabled = true;
    chk.addEventListener('change', function () { campo.disabled = !chk.checked; });
  });

  document.getElementById('form-masivo').addEventListener('submit', function (e) {
    e.preventDefault();
    guardarMasivo(MASIVO.obras, e.target);
  });
}

/* Avisa en la obra si algún dato se cambió a mano */
function marcarCambioPropio(idx) {
  var ini = MASIVO.iniciales[idx];
  var actual = leerObraFormulario(idx);
  var propia = actual.serieId !== ini.serieId ||
               String(actual.anio) !== String(ini.anio) ||
               actual.materiales !== ini.materiales ||
               String(actual.disponible) !== String(ini.disponible);
  var nota = document.getElementById('obra-' + idx + '-nota');
  var caja = document.getElementById('obra-masiva-' + idx);
  if (nota) nota.textContent = propia ? 'Dato propio: tiene prioridad.' : '';
  if (caja) caja.classList.toggle('con-cambio', propia);
}

function leerObraFormulario(idx) {
  function v(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  return {
    serieId: v('obra-' + idx + '-serie'),
    anio: v('obra-' + idx + '-anio'),
    materiales: v('obra-' + idx + '-materiales'),
    disponible: v('obra-' + idx + '-disponible')
  };
}

async function guardarMasivo(obras, form) {
  var general = {
    serie: document.getElementById('chk-serie').checked,
    anio: document.getElementById('chk-anio').checked,
    materiales: document.getElementById('chk-materiales').checked,
    disponible: document.getElementById('chk-disponible').checked
  };
  var gSerie = document.getElementById('masivo-serie').value;
  var gAnio = document.getElementById('masivo-anio').value;
  var gMateriales = document.getElementById('masivo-materiales').value.trim();
  var gDisponible = document.getElementById('masivo-disponible').value;

  var estadoEl = document.getElementById('estado-masivo');
  var btn = document.getElementById('btn-guardar-masivo');

  if (general.anio && !gAnio) { alert('Escribí el año del formulario general.'); return; }
  if (general.materiales && !gMateriales) { alert('Escribí los materiales del formulario general.'); return; }

  var hayCambiosGeneral = general.serie || general.anio || general.materiales || general.disponible;

  btn.disabled = true;
  var guardadas = 0;

  for (var i = 0; i < obras.length; i++) {
    var o = obras[i];
    var propio = leerObraFormulario(i);
    var ini = MASIVO.iniciales[i];

    var destino = {
      serieId: o.serieId,
      anio: o.anio,
      materiales: o.materiales,
      disponible: !!o.disponible
    };

    /* 1) lo del formulario general */
    if (general.serie) destino.serieId = gSerie;
    if (general.anio) destino.anio = Number(gAnio);
    if (general.materiales) destino.materiales = gMateriales;
    if (general.disponible) destino.disponible = (gDisponible === 'true');

    /* 2) lo de esta obra manda sobre el general */
    if (propio.serieId !== ini.serieId) destino.serieId = propio.serieId;
    if (String(propio.anio) !== String(ini.anio)) destino.anio = Number(propio.anio);
    if (propio.materiales !== ini.materiales) destino.materiales = propio.materiales;
    if (String(propio.disponible) !== String(ini.disponible)) destino.disponible = (propio.disponible === 'true');

    var cambio = destino.serieId !== (o.serieId || '') ||
                 String(destino.anio) !== String(o.anio) ||
                 (destino.materiales || '') !== (o.materiales || '') ||
                 destino.disponible !== !!o.disponible;

    if (!cambio) continue;

    try {
      o.serieId = destino.serieId;
      o.anio = destino.anio;
      o.materiales = destino.materiales;
      o.disponible = destino.disponible;

      var serie = buscarSerie(o.serieId);
      if (serie) o.precio = calcularPrecio(o.ancho || 0, o.alto || 0, serie.factorPrecio);
      o.fechaModificacion = new Date().toISOString();

      if (await actualizarObraAPI(o)) guardadas++;
    } catch (err) {
      console.error('No se pudo guardar', o.id, err);
    }
  }

  invalidarCache();

  if (!guardadas) {
    if (!hayCambiosGeneral) alert('No hay cambios para guardar.');
    else alert('No se pudo guardar ninguna obra.');
    btn.disabled = false;
    return;
  }

  if (estadoEl) estadoEl.textContent = 'Guardadas ' + guardadas + ' de ' + obras.length + '.';
  window.location.href = 'admin.html?ok=1';
}
