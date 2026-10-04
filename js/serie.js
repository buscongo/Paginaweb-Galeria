/* ========================================
   serie.js — Página dedicada a una serie
   Hero con nombre de serie + grid de obras
   (reúsa crearTarjetaObra de gallery.js)
   ======================================== */
function capitalizar(txt) {
  return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt;
}

// Fecha de corte: obras subidas ANTES no marcan "nuevo"
var FECHA_DESPLEGUE_SERIE = '2026-10-04';
var cacheNuevasIds = [];

function qs(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// Cálculo de obras nuevas (réplica mínima de home.js)
function obtenerNuevasSerie(obras) {
  if (!obras || obras.length === 0) return [];
  var ordenadas = obras.slice().sort(function (a, b) {
    return b.fechaRegistro.localeCompare(a.fechaRegistro);
  });
  var masReciente = ordenadas[0];
  return obras.filter(function (x) {
    if (!x.fechaRegistro || !masReciente.fechaRegistro) return false;
    if (x.fechaRegistro < FECHA_DESPLEGUE_SERIE) return false;
    if (x.id === masReciente.id) return true;
    var despues = 0;
    for (var i = 0; i < ordenadas.length; i++) {
      if (ordenadas[i].fechaRegistro > x.fechaRegistro) despues++;
    }
    var ref = new Date(masReciente.fechaRegistro);
    ref.setMonth(ref.getMonth() - 3 - despues);
    return new Date(x.fechaRegistro) >= ref;
  });
}

// 2k random de las obras de esta serie
function obtener2kSerie(obras) {
  var pool = obras.filter(function (x) { return x.imagen2k; });
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].imagen2k;
}

// Tabs dinámicas — marca activa según serie en ?serie=
function renderizarTabs(serieActiva) {
  var cont = document.getElementById('series-tabs');
  if (!cont) return;
  var inicio = '<a href="index.html" class="tab">' +
    ((typeof t === 'function') ? (t('inicio') || 'Inicio') : 'Inicio') + '</a>';
  var html = inicio;
  if (typeof cacheSeries !== 'undefined' && cacheSeries.length) {
    cacheSeries.forEach(function (s) {
      var activo = (s.id === serieActiva);
      html += '<a href="serie.html?serie=' + s.id + '" class="tab' +
        (activo ? ' active' : '') + '">' +
        escaparHTML(capitalizar(s.tema)) + '</a>';
    });
  }
  cont.innerHTML = html;
}

async function initSerie() {
  MODO = 'publico';
  try { await cargarIdioma(); } catch (e) { /* idioma opcional */ }

  await obtenerSeries();
  var obrasTodas = await obtenerObras();

  // sello "Nuevo" (obras nuevas post-despliegue)
  cacheNuevasIds = obtenerNuevasSerie(obrasTodas).map(function (x) { return x.id; });

  var serieId = qs('serie') || '';
  renderizarTabs(serieId);
  // init cierre modal (shared en gallery.js): X, overlay click y back/popstate
  if (typeof inicializarModal === 'function') inicializarModal();

  var deSerie = obrasTodas.filter(function (x) { return x.serieId === serieId; });
  var serie = buscarSerie(serieId);
  var nombreSerie = serie
    ? (t('prefijoSerie') + capitalizar(serie.tema))
    : (t('sinSerie') || 'Sin serie');

  // Header: fondo 2k + nombre centrado
  var fondo = document.getElementById('hero-fondo');
  var img = obtener2kSerie(deSerie);
  if (fondo && img) fondo.style.backgroundImage = 'url("' + img + '")';
  var titulo = document.getElementById('serie-nombre');
  if (titulo) titulo.textContent = nombreSerie;

  // Grid de cards
  var g = document.getElementById('galeria-series');
  if (!g) return;
  g.innerHTML = '';
  if (deSerie.length === 0) {
    g.innerHTML = '<p class="mensaje-vacio">' +
      ((typeof t === 'function') ? (t('sinResultadosFiltro') || 'No se encontraron obras.') : 'No se encontraron obras.') +
      '</p>';
    return;
  }
  deSerie.forEach(function (o) {
    o._nuevo = (cacheNuevasIds.indexOf(o.id) !== -1);
    g.appendChild(crearTarjetaObra(o));
  });
}

document.addEventListener('DOMContentLoaded', initSerie);
