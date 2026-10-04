/* ========================================
   home.js — Inicialización de la Home (portfolio)
   Hero + nuevas obras + todas las obras
   ======================================== */

var filtrosHome = { ano: '', disponible: '' };
var cacheObras = [];
var cacheSeries = [];

// Fecha de corte: obras subidas ANTES de esta fecha no se marcan como "nuevas"
// Solo obras subidas después del despliegue aplican el cálculo de ventana
var FECHA_DESPLEGUE = '2026-10-04';

// cache de obras nuevas — calculada una vez, usada por todas las franjas
function cachearNuevas(obras) {
  cacheObras = obras;
  cacheNuevas = obtenerNuevas(obras);
  cacheNuevasIds = cacheNuevas.map(function (x) { return x.id; });
}

var cacheNuevas = [];
var cacheNuevasIds = [];

document.addEventListener('DOMContentLoaded', async function () {
  MODO = 'publico';

  // i18n: cargar idioma y aplicar textos estáticos
  await cargarIdioma();
  aplicarTextosI18n();

  // datos
  await obtenerSeries();
  cacheObras = await obtenerObras();
  cachearNuevas(cacheObras);

  // render
  renderizarHero(cacheObras);
  renderizarNuevas(cacheObras);
  renderizarGaleriaSeries(cacheObras);

  // filtros (año + disponibilidad)
  inicializarFiltrosHome();

  // cerrar modal (init unificado en gallery.js → inicializarModal: overlay click, X, popstate back)
  if (typeof inicializarModal === 'function') inicializarModal();
});

function aplicarTextosI18n() {
  var nodes = document.querySelectorAll('[data-i18n]');
  nodes.forEach(function (el) {
    var k = el.getAttribute('data-i18n');
    if (k && t(k) !== k) el.textContent = t(k);
  });
  var ph = document.querySelectorAll('[data-i18n-placeholder]');
  ph.forEach(function (el) {
    var k = el.getAttribute('data-i18n-placeholder');
    if (k && t(k) !== k) el.placeholder = t(k);
  });
}

function capitalizar(txt) {
  return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt;
}

function obraMasReciente(obras) {
  if (!obras || obras.length === 0) return null;
  var r = obras[0];
  for (var i = 1; i < obras.length; i++) {
    if (obras[i].fechaRegistro > r.fechaRegistro) r = obras[i];
  }
  return r;
}

// Hero: fondo = imagen 2k random de obras del año actual
function obtener2kRandomAnioActual(obras) {
  var a = añoActual();
  var delAnio = obras.filter(function (x) { return x.anio === a && x.imagen2k; });
  if (delAnio.length === 0) {
    // fallback: usar todas las que tengan 2k
    delAnio = obras.filter(function (x) { return x.imagen2k; });
  }
  if (delAnio.length === 0) return null;
  var idx = Math.floor(Math.random() * delAnio.length);
  return delAnio[idx].imagen2k;
}

function renderizarHero(obras) {
  var img = obtener2kRandomAnioActual(obras);
  var fondo = document.getElementById('hero-fondo');
  if (fondo && img) {
    fondo.style.backgroundImage = 'url("' + img + '")';
  }
}

// Cálculo de obras "nuevas"
// obra X es nueva si fechaRegistro >= referencia
// referencia = fecha_mas_reciente - 3 meses - (n_obras_subidas_después × 1 mes)
function calcularFechaVentana(masReciente, obrasDespues) {
  var ref = new Date(masReciente.fechaRegistro);
  ref.setMonth(ref.getMonth() - 3);   // 3 meses base
  ref.setMonth(ref.getMonth() - obrasDespues);  // -1 mes por cada obra subida después
  return ref;
}

function esNueva(obra, masReciente, obrasOrdenadas) {
  if (!obra.fechaRegistro || !masReciente.fechaRegistro) return false;
  // obras subidas ANTES del despliegue no son "nuevas"
  if (obra.fechaRegistro < FECHA_DESPLEGUE) return false;
  if (obra.id === masReciente.id) return true;  // la más reciente siempre es nueva
  // contar obras subidas después de esta
  var despues = 0;
  for (var i = 0; i < obrasOrdenadas.length; i++) {
    if (obrasOrdenadas[i].fechaRegistro > obra.fechaRegistro) despues++;
  }
  var ventana = calcularFechaVentana(masReciente, despues);
  return new Date(obra.fechaRegistro) >= ventana;
}

function obtenerNuevas(obras) {
  if (!obras || obras.length === 0) return [];
  var ordenadas = obras.slice().sort(function (a, b) {
    return b.fechaRegistro.localeCompare(a.fechaRegistro);
  });
  var masReciente = ordenadas[0];
  return obras.filter(function (x) { return esNueva(x, masReciente, ordenadas); });
}

// Franja: nuevas obras (solo si hay)
function renderizarNuevas(obras) {
  var franja = document.getElementById('franja-nuevas');
  var c = document.getElementById('nuevas-container');
  if (!franja || !c) return;
  if (cacheNuevas.length === 0) {
    franja.style.display = 'none';
    return;
  }
  franja.style.display = 'block';
  c.innerHTML = '';
  cacheNuevas.forEach(function (o) {
    o._nuevo = true;
    c.appendChild(crearTarjetaObra(o, false, true));
  });
}

// Filtrar obras por año y disponibilidad
function aplicarFiltros(obras) {
  return obras.filter(function (x) {
    if (filtrosHome.ano && x.anio !== parseInt(filtrosHome.ano)) return false;
    if (filtrosHome.disponible !== '' && x.disponible.toString() !== filtrosHome.disponible) return false;
    return true;
  });
}

function crearFilaSerie(tema, obras) {
  var fila = document.createElement('div');
  fila.className = 'serie-fila';
  var h = document.createElement('h3');
  h.className = 'serie-titulo';
  h.textContent = t('prefijoSerie') + capitalizar(tema);
  fila.appendChild(h);
  var car = document.createElement('div');
  car.className = 'fila-carousel';
  obras.forEach(function (o) {
    o._nuevo = (cacheNuevasIds.indexOf(o.id) !== -1);
    car.appendChild(crearTarjetaObra(o, false, false));
  });
  fila.appendChild(car);
  return fila;
}

// Galería completa: obras agrupadas por serie, una fila carousel por serie
function renderizarGaleriaSeries(obras) {
  var c = document.getElementById('galeria-series');
  if (!c) return;
  var filtradas = aplicarFiltros(obras);

  c.innerHTML = '';
  var series = cacheSeries.slice().sort(function (a, b) { return a.tema.localeCompare(b.tema); });
  series.forEach(function (serie) {
    var delSerie = filtradas.filter(function (x) { return x.serieId === serie.id; });
    if (delSerie.length > 0) c.appendChild(crearFilaSerie(serie.tema, delSerie));
  });

  var sinSerie = filtradas.filter(function (x) {
    return !cacheSeries.some(function (s) { return s.id === x.serieId; });
  });
  if (sinSerie.length > 0) c.appendChild(crearFilaSerie(t('sinSerie'), sinSerie));

  if (filtradas.length === 0) {
    c.innerHTML = '<p class="mensaje-vacio">' + t('sinResultadosFiltro') + '</p>';
  }
}

function poblarAnios(select) {
  if (!select) return;
  var y = {};
  cacheObras.forEach(function (o) { y[o.anio] = true; });
  var años = Object.keys(y).map(Number).filter(function (a) { return a > 0; });
  años.sort(function (a, b) { return b - a; });
  var h = '<option value="">' + t('todosAños') + '</option>';
  años.forEach(function (a) { h += '<option value="' + a + '">' + a + '</option>'; });
  select.innerHTML = h;
}

function poblarDisponibilidad(select) {
  if (!select) return;
  var h = '<option value="">' + t('todos') + '</option>'
    + '<option value="true">' + t('disponible') + '</option>'
    + '<option value="false">' + t('noDisponible') + '</option>';
  select.innerHTML = h;
}

function inicializarFiltrosHome() {
  var sA = document.getElementById('filtro-ano');
  var sD = document.getElementById('filtro-disponibilidad');
  var limpiar = document.getElementById('limpiar-filtros');

  poblarAnios(sA);
  poblarDisponibilidad(sD);

  async function repintar() {
    var obras = await obtenerObras();
    cacheObras = obras;
    cachearNuevas(obras);
    renderizarGaleriaSeries(obras);
  }

  if (sA) sA.addEventListener('change', function () { filtrosHome.ano = sA.value; repintar(); });
  if (sD) sD.addEventListener('change', function () { filtrosHome.disponible = sD.value; repintar(); });
  if (limpiar) limpiar.addEventListener('click', function () {
    filtrosHome = { ano: '', disponible: '' };
    if (sA) sA.value = '';
    if (sD) sD.value = '';
    repintar();
  });
}
