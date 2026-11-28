/* admin.js — Página de entrada del admin.
   Dos acciones: Editar (obras por serie, como la home) y Subir obra (subir.html). */

var editando = false;
var SELECCION = {};        // id → true
var CLAVE_FILTROS = 'adminFiltros';

document.addEventListener('DOMContentLoaded', function () {
  MODO = 'admin';
  protegerAdmin(iniciar);
});

async function iniciar() {
  try { await aplicarIdioma(); } catch (e) { /* silencioso */ }

  await obtenerSeries(true);
  await obtenerObras(true);

  pintarFiltros();

  document.getElementById('btn-editar').addEventListener('click', alternarPanel);
  document.getElementById('btn-salir').addEventListener('click', cerrarSesionAdmin);

  var lang = document.getElementById('lang-toggle');
  if (lang) lang.addEventListener('click', cambiarIdioma);

  document.getElementById('filtro-serie').addEventListener('change', render);
  document.getElementById('filtro-ano').addEventListener('change', render);
  document.getElementById('filtro-disponibilidad').addEventListener('change', render);

  var chk = document.getElementById('chk-archivadas');
  chk.addEventListener('change', async function () {
    setMostrarArchivadas(chk.checked);
    invalidarCache();
    await obtenerObras(true);
    render();
  });

  var p = new URLSearchParams(window.location.search);
  if (p.get('ok')) {
    // volver al listado con los mismos filtros que había antes de editar
    if (!editando) alternarPanel();
    mostrarAviso('Obra guardada.');
  }

  cablearSeleccion();
  restaurarFiltros();
}

function alternarPanel() {
  editando = !editando;
  var panel = document.getElementById('panel-editar');
  var btn = document.getElementById('btn-editar');
  panel.hidden = !editando;
  btn.setAttribute('aria-expanded', editando ? 'true' : 'false');
  btn.classList.toggle('activo', editando);
  if (editando) {
    render();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function pintarFiltros() {
  var selSerie = document.getElementById('filtro-serie');
  var selAnio = document.getElementById('filtro-ano');
  var selDisp = document.getElementById('filtro-disponibilidad');

  selSerie.innerHTML = '<option value="">Todas las series</option>' +
    seriesOrdenadas(cacheSeries, cacheObras).map(function (s) {
      return '<option value="' + s.id + '">' + escaparHTML(s.tema) + '</option>';
    }).join('');

  var anios = {};
  cacheObras.forEach(function (o) {
    if (Number(o.anio) > 0) anios[o.anio] = true;   // sin el año 0
  });
  selAnio.innerHTML = '<option value="">Todos los años</option>' +
    Object.keys(anios).map(Number).sort(function (a, b) { return b - a; }).map(function (a) {
      return '<option value="' + a + '">' + a + '</option>';
    }).join('');

  if (selDisp) {
    selDisp.innerHTML = '<option value="">Toda disponibilidad</option>' +
      '<option value="true">Disponibles</option>' +
      '<option value="false">No disponibles</option>';
  }
}

function obrasFiltradas() {
  var sId = document.getElementById('filtro-serie').value;
  var anio = document.getElementById('filtro-ano').value;
  var disp = document.getElementById('filtro-disponibilidad');
  var disponible = disp ? disp.value : '';
  return cacheObras.filter(function (o) {
    if (sId && o.serieId !== sId) return false;
    if (anio && String(o.anio) !== String(anio)) return false;
    if (disponible === 'true' && !o.disponible) return false;
    if (disponible === 'false' && o.disponible) return false;
    return true;
  });
}

function render() {
  var cont = document.getElementById('obras-por-serie');
  if (!cont) return;

  var obras = obrasFiltradas();
  if (!obras.length) {
    cont.innerHTML = '<p class="mensaje-vacio">No hay obras con esos filtros.</p>';
    return;
  }

  var grupos = {};
  obras.forEach(function (o) { (grupos[o.serieId] = grupos[o.serieId] || []).push(o); });

  var html = '';
  var orden = seriesOrdenadas(cacheSeries, obras).map(function (s) { return s.id; });
  Object.keys(grupos).forEach(function (id) { if (orden.indexOf(id) === -1) orden.push(id); });
  orden.forEach(function (serieId) {
    if (!grupos[serieId]) return;
    var serie = buscarSerie(serieId);
    var tema = serie ? serie.tema : 'Sin serie';
    var lista = grupos[serieId].slice().sort(function (a, b) {
      return String(b.fechaRegistro).localeCompare(String(a.fechaRegistro));
    });

    var todasMarcadas = lista.every(function (o) { return !!SELECCION[o.id]; });

    html += '<div class="serie-fila">';
    html += '<h3 class="serie-titulo">' +
      '<label class="chk-serie" title="Seleccionar todas las obras de esta serie">' +
        '<input type="checkbox" class="chk-serie-sel" data-serie="' + escaparHTML(serieId) + '"' +
          (todasMarcadas && lista.length ? ' checked' : '') + '>' +
        '<span class="chk-serie-texto">Serie: ' + escaparHTML(capitalizar(tema)) + '</span>' +
      '</label>' +
      ' <span class="serie-cuenta">(' + lista.length + ')</span></h3>';
    html += '<div class="fila-wrap"><div class="fila-carousel">';

    lista.forEach(function (o) {
      var img = o.imagen
        ? '<img class="tarjeta-imagen" src="' + escaparHTML(o.imagen) + '" alt="' + escaparHTML(o.titulo) + '" loading="lazy">'
        : '<div class="tarjeta-imagen sin-imagen">Sin imagen</div>';
      var marcada = SELECCION[o.id] ? ' checked' : '';
      html += '<article class="tarjeta-obra tarjeta-admin" data-id="' + escaparHTML(o.id) + '" tabindex="0" role="button" aria-label="Editar ' + escaparHTML(o.titulo) + '">' +
        '<label class="chk-seleccion" title="Seleccionar"><input type="checkbox" class="chk-obra-sel" data-id="' + escaparHTML(o.id) + '"' + marcada + '></label>' +
        img +
        '<div class="tarjeta-info"><h3>' + escaparHTML(o.titulo) + '</h3>' +
        '<div class="tarjeta-meta"><span>' + escaparHTML(o.anio) + '</span><span class="serie-nombre">Editar →</span></div></div>' +
        '</article>';
    });

    html += '</div>';
    html += '<button type="button" class="fila-nav fila-nav-izq" aria-label="Desplazar a la izquierda">‹</button>';
    html += '<button type="button" class="fila-nav fila-nav-der" aria-label="Desplazar a la derecha">›</button>';
    html += '</div></div>';
  });

  cont.innerHTML = html;

  // Flechas de cada fila
  cont.querySelectorAll('.fila-wrap').forEach(function (wrap) {
    var car = wrap.querySelector('.fila-carousel');
    var izq = wrap.querySelector('.fila-nav-izq');
    var der = wrap.querySelector('.fila-nav-der');
    if (!car || !izq || !der) return;

    function sinc() {
      var max = car.scrollWidth - car.clientWidth;
      izq.classList.toggle('oculta', car.scrollLeft <= 2);
      der.classList.toggle('oculta', car.scrollLeft >= max - 2);
    }
    izq.addEventListener('click', function () {
      car.scrollBy({ left: -Math.max(200, car.clientWidth * 0.8), behavior: 'smooth' });
    });
    der.addEventListener('click', function () {
      car.scrollBy({ left: Math.max(200, car.clientWidth * 0.8), behavior: 'smooth' });
    });
    car.addEventListener('scroll', sinc);
    setTimeout(sinc, 0);
  });

  // Casilla de la cabecera: selecciona o deselecciona toda la serie
  cont.querySelectorAll('.chk-serie-sel').forEach(function (chkSerie) {
    chkSerie.addEventListener('click', function (e) { e.stopPropagation(); });
    chkSerie.addEventListener('change', function (e) {
      e.stopPropagation();
      seleccionarSerie(chkSerie.closest('.serie-fila'), chkSerie.checked);
    });
  });

  // Clic en la tarjeta → página de edición
  cont.querySelectorAll('.tarjeta-admin').forEach(function (card) {
    var chk = card.querySelector('.chk-obra-sel');
    if (chk) {
      chk.addEventListener('click', function (e) { e.stopPropagation(); });
      chk.addEventListener('change', function (e) {
        e.stopPropagation();
        alternarSeleccion(chk.getAttribute('data-id'), chk.checked);
      });
    }

    function abrir() {
      guardarFiltros();
      window.location.href = 'editar.html?id=' + encodeURIComponent(card.getAttribute('data-id'));
    }
    card.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.chk-seleccion')) return;
      abrir();
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
    });
  });
}

function capitalizar(txt) {
  return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt;
}

/* ===== Selección múltiple y filtros que sobreviven ===== */

function guardarFiltros() {
  try {
    sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify({
      serie: document.getElementById('filtro-serie').value,
      anio: document.getElementById('filtro-ano').value,
      disp: document.getElementById('filtro-disponibilidad').value,
      archivadas: document.getElementById('chk-archivadas').checked
    }));
  } catch (e) { /* sin sessionStorage */ }
}

function restaurarFiltros() {
  var datos = null;
  try { datos = JSON.parse(sessionStorage.getItem(CLAVE_FILTROS) || 'null'); } catch (e) { datos = null; }
  if (!datos) return;

  var chkArch = document.getElementById('chk-archivadas');
  var recargar = false;
  if (datos.archivadas && chkArch && !chkArch.checked) {
    chkArch.checked = true;
    recargar = true;
  }

  document.getElementById('filtro-serie').value = datos.serie || '';
  document.getElementById('filtro-ano').value = datos.anio || '';
  document.getElementById('filtro-disponibilidad').value = datos.disp || '';

  if (!editando) alternarPanel(); else render();

  if (recargar) {
    setMostrarArchivadas(true);
    invalidarCache();
    obtenerObras(true).then(function () { render(); });
  }
}

function cablearSeleccion() {
  var btnMasivo = document.getElementById('btn-editar-masivo');
  var btnLimpiar = document.getElementById('btn-limpiar-seleccion');

  if (btnMasivo) {
    btnMasivo.addEventListener('click', function () {
      var ids = Object.keys(SELECCION);
      if (ids.length < 2) return;
      guardarFiltros();
      window.location.href = 'editar.html?ids=' + encodeURIComponent(ids.join(','));
    });
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', function () {
      SELECCION = {};
      document.querySelectorAll('.chk-obra-sel').forEach(function (c) { c.checked = false; });
      actualizarBarraSeleccion();
    });
  }
}

function actualizarBarraSeleccion() {
  var barra = document.getElementById('barra-seleccion');
  var cuenta = document.getElementById('seleccion-cuenta');
  var n = Object.keys(SELECCION).length;
  if (cuenta) cuenta.textContent = n === 1 ? '1 obra seleccionada' : n + ' obras seleccionadas';
  if (barra) barra.hidden = n < 2;   // solo con más de una
}

function alternarSeleccion(id, marcada) {
  if (marcada) { SELECCION[id] = true; } else { delete SELECCION[id]; }
  actualizarBarraSeleccion();
  sincronizarChecksSerie();
}

/* Aviso breve, sin ventana modal que bloquee */
function mostrarAviso(texto) {
  var caja = document.getElementById('aviso-admin');
  if (!caja) return;
  caja.textContent = texto;
  caja.hidden = false;
  caja.classList.add('visible');
  setTimeout(function () {
    caja.classList.remove('visible');
    setTimeout(function () { caja.hidden = true; }, 300);
  }, 3200);
}

/* Selecciona o quita la selección de todas las obras de una fila de serie */
function seleccionarSerie(fila, marcada) {
  if (!fila) return;
  fila.querySelectorAll('.chk-obra-sel').forEach(function (chk) {
    chk.checked = !!marcada;
    alternarSeleccion(chk.getAttribute('data-id'), !!marcada);
  });
  sincronizarChecksSerie();
}

/* La casilla de la serie refleja el estado de sus obras: marcada, vacía o a medias */
function sincronizarChecksSerie() {
  document.querySelectorAll('.serie-fila').forEach(function (fila) {
    var chks = fila.querySelectorAll('.chk-obra-sel');
    var cabecera = fila.querySelector('.chk-serie-sel');
    if (!cabecera || !chks.length) return;
    var marcadas = 0;
    chks.forEach(function (c) { if (c.checked) marcadas++; });
    cabecera.checked = marcadas === chks.length;
    cabecera.indeterminate = marcadas > 0 && marcadas < chks.length;
  });
}
