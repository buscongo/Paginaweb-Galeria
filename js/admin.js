/* admin.js — Página de entrada del admin.
   Dos acciones: Editar (obras por serie, como la home) y Subir obra (subir.html). */

var editando = false;

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
  if (p.get('ok')) alert('Obra guardada.');
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
  cacheObras.forEach(function (o) { anios[o.anio] = true; });
  selAnio.innerHTML = '<option value="">Todos los años</option>' +
    Object.keys(anios).sort(function (a, b) { return b - a; }).map(function (a) {
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

    html += '<div class="serie-fila">';
    html += '<h3 class="serie-titulo">Serie: ' + escaparHTML(capitalizar(tema)) +
      ' <span class="serie-cuenta">(' + lista.length + ')</span></h3>';
    html += '<div class="fila-wrap"><div class="fila-carousel">';

    lista.forEach(function (o) {
      var img = o.imagen
        ? '<img class="tarjeta-imagen" src="' + escaparHTML(o.imagen) + '" alt="' + escaparHTML(o.titulo) + '" loading="lazy">'
        : '<div class="tarjeta-imagen sin-imagen">Sin imagen</div>';
      html += '<article class="tarjeta-obra tarjeta-admin" data-id="' + escaparHTML(o.id) + '" tabindex="0" role="button" aria-label="Editar ' + escaparHTML(o.titulo) + '">' +
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

  // Clic en la tarjeta → página de edición
  cont.querySelectorAll('.tarjeta-admin').forEach(function (card) {
    function abrir() {
      window.location.href = 'editar.html?id=' + encodeURIComponent(card.getAttribute('data-id'));
    }
    card.addEventListener('click', abrir);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
    });
  });
}

function capitalizar(txt) {
  return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt;
}
