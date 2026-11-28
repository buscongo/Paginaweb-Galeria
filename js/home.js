/* ========================================
   home.js — Inicialización de la Home (portfolio)
   Hero + nuevas obras + todas las obras (vista única controlada por VER TODO)
   ======================================== */

var filtrosHome = { ano: '', disponible: '', tamano: '', texto: '' };
var cacheObras = [];
var cacheSeries = [];
var cacheNuevas = [];
var cacheNuevasIds = [];

var FECHA_DESPLEGUE = '2026-10-04';

// cache de obras "nuevas" — usada por las tarjetas (badge NUEVO)
function cachearNuevas(obras) {
  cacheObras = obras;
  cacheNuevas = obtenerNuevas(obras);
  cacheNuevasIds = cacheNuevas.map(function (x) { return x.id; });
}

// obra X es nueva si fechaRegistro >= referencia
// referencia = fecha_mas_reciente - 3 meses - (n_obras_subidas_después × 1 mes)
function calcularFechaVentana(masReciente, obrasDespues) {
  var ref = new Date(masReciente.fechaRegistro);
  ref.setMonth(ref.getMonth() - 3);
  ref.setMonth(ref.getMonth() - obrasDespues);
  return ref;
}

function esNueva(obra, masReciente, obrasOrdenadas) {
  if (!obra.fechaRegistro || !masReciente.fechaRegistro) return false;
  if (obra.fechaRegistro < FECHA_DESPLEGUE) return false;
  if (obra.id === masReciente.id) return true;
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
  return obras.filter(function (x) { return esNueva(x, ordenadas[0], ordenadas); });
}

document.addEventListener('DOMContentLoaded', async function () {
  MODO = 'publico';

  await cargarIdioma();
  aplicarTextosI18n();

  await obtenerSeries();
  cacheObras = await obtenerObras();
  cachearNuevas(cacheObras);

  document.body.classList.add('ver-todo-activo');
  renderizarObras(cacheObras);
  renderizarTabsHome(cacheObras);

  inicializarFiltrosHome();
  inicializarNav();
  ajustarEspaciadoFiltros();

  if (typeof inicializarModal === 'function') inicializarModal();
});

// --- i18n y utilidades ---

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

// Fila de carrusel horizontal de una serie (vista compacta por defecto)
function crearFilaSerie(tema, obras) {
  var fila = document.createElement('div');
  fila.className = 'serie-fila';
  var h = document.createElement('h3');
  h.className = 'serie-titulo';
  h.textContent = t('prefijoSerie') + capitalizar(tema);
  fila.appendChild(h);

  var wrap = document.createElement('div');
  wrap.className = 'fila-wrap';

  var car = document.createElement('div');
  car.className = 'fila-carousel';
  obras.forEach(function (o) {
    o._nuevo = (cacheNuevasIds.indexOf(o.id) !== -1);
    car.appendChild(crearTarjetaObra(o));
  });
  wrap.appendChild(car);

  // Flechas contextuales: solo visibles en PC con hover (CSS las oculta en mobile)
  var izq = crearFlechaFila(car, -1);
  var der = crearFlechaFila(car, 1);
  wrap.appendChild(izq);
  wrap.appendChild(der);

  function sincronizarFlechas() {
    var max = car.scrollWidth - car.clientWidth;
    izq.classList.toggle('oculta', car.scrollLeft <= 2);
    der.classList.toggle('oculta', car.scrollLeft >= max - 2);
  }
  car.addEventListener('scroll', sincronizarFlechas);
  setTimeout(sincronizarFlechas, 0);

  fila.appendChild(wrap);
  return fila;
}

// Botón de desplazamiento lateral para una fila de obras
function crearFlechaFila(car, dir) {
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'fila-nav ' + (dir < 0 ? 'fila-nav-izq' : 'fila-nav-der');
  b.setAttribute('aria-label', dir < 0 ? 'Desplazar a la izquierda' : 'Desplazar a la derecha');
  b.textContent = dir < 0 ? '‹' : '›';
  b.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var paso = Math.max(200, car.clientWidth * 0.8);
    if (car.scrollBy) {
      car.scrollBy({ left: dir * paso, behavior: 'smooth' });
    } else {
      car.scrollLeft += dir * paso;
    }
  });
  return b;
}

function obraMasReciente(obras) {
  if (!obras || obras.length === 0) return null;
  var r = obras[0];
  for (var i = 1; i < obras.length; i++) {
    if (obras[i].fechaRegistro > r.fechaRegistro) r = obras[i];
  }
  return r;
}

// --- Render: vista única (carousels O secciones) ---

function renderizarObras(obras) {
  var contenedor = document.getElementById('contenido-obras');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  var filtradas = aplicarFiltros(obras);
  renderizarSeriesColapsablesConFiltros(filtradas);

  if (filtradas.length === 0) {
    contenedor.innerHTML = '<p class="mensaje-vacio">' + t('sinResultadosFiltro') + '</p>';
  }
}

function renderizarSeriesColapsablesConFiltros(obras) {
  var contenedor = document.getElementById('contenido-obras');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  var series = obras.length > 0 ? seriesOrdenadas(cacheSeries, obras) : [];

  series.forEach(function (serie) {
    var obrasSerie = obras.filter(function (x) { return x.serieId === serie.id; });
    if (obrasSerie.length === 0) return;

    var seccion = document.createElement('section');
    seccion.className = 'serie-section';
    seccion.id = 'serie-' + serie.tema.toLowerCase().replace(/\s+/g, '-');

    var header = document.createElement('div');
    header.className = 'series-header';
    header.innerHTML = '<h2 class="series-title">' + capitalizar(serie.tema) + '</h2>';

    var grid = document.createElement('div');
    grid.className = 'grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    grid.style.gap = '1rem';
    grid.style.marginTop = '1rem';
    obrasSerie.forEach(function (o) {
      o._nuevo = (cacheNuevasIds.indexOf(o.id) !== -1);
      grid.appendChild(crearTarjetaObra(o, false, false));
    });

    seccion.appendChild(header);
    seccion.appendChild(grid);
    contenedor.appendChild(seccion);
  });

  var sinSerie = obras.filter(function (x) {
    return !cacheSeries.some(function (s) { return s.id === x.serieId; });
  });
  if (sinSerie.length > 0) {
    var seccionSin = document.createElement('section');
    seccionSin.className = 'serie-section';
    seccionSin.id = 'serie-sin-serie';
    var headerSin = document.createElement('div');
    headerSin.className = 'series-header';
    headerSin.innerHTML = '<h2 class="series-title">' + t('sinSerie') + '</h2>';
    var gridSin = document.createElement('div');
    gridSin.className = 'grid';
    gridSin.style.display = 'grid';
    gridSin.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    gridSin.style.gap = '1rem';
    gridSin.style.marginTop = '1rem';
    sinSerie.forEach(function (o) {
      o._nuevo = (cacheNuevasIds.indexOf(o.id) !== -1);
      gridSin.appendChild(crearTarjetaObra(o, false, false));
    });
    seccionSin.appendChild(headerSin);
    seccionSin.appendChild(gridSin);
    contenedor.appendChild(seccionSin);
  }
}

function renderizarGaleriaSeriesConFiltros(obras) {
  var c = document.getElementById('contenido-obras');
  if (!c) return;

  c.innerHTML = '';

  var series = seriesOrdenadas(cacheSeries, obras);
  series.forEach(function (serie) {
    var delSerie = obras.filter(function (x) { return x.serieId === serie.id; });
    if (delSerie.length > 0) c.appendChild(crearFilaSerie(serie.tema, delSerie));
  });

  var sinSerie = obras.filter(function (x) {
    return !cacheSeries.some(function (s) { return s.id === x.serieId; });
  });
  if (sinSerie.length > 0) c.appendChild(crearFilaSerie(t('sinSerie'), sinSerie));

  if (obras.length === 0) {
    c.innerHTML = '<p class="mensaje-vacio">' + t('sinResultadosFiltro') + '</p>';
  }
}

// Alias para compatibilidad con código existente
function renderizarGaleriaSeries(obras) {
  renderizarGaleriaSeriesConFiltros(obras);
}

function renderizarSeriesColapsables(obras) {
  renderizarSeriesColapsablesConFiltros(obras);
}

// --- Franja: nuevas obras (solo si hay) ---

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

// Normaliza para buscar: sin mayúsculas ni tildes
function normalizarBusqueda(txt) {
  return String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Filtrar obras por año, disponibilidad, tamaño y nombre
function aplicarFiltros(obras) {
  var texto = normalizarBusqueda(filtrosHome.texto);
  return obras.filter(function (x) {
    if (filtrosHome.ano && x.anio !== parseInt(filtrosHome.ano)) return false;
    if (filtrosHome.disponible !== '' && x.disponible.toString() !== filtrosHome.disponible) return false;
    if (filtrosHome.tamano && tamanoObra(x) !== filtrosHome.tamano) return false;
    if (texto && normalizarBusqueda(x.titulo).indexOf(texto) === -1) return false;
    return true;
  });
}

// ===== Toggle de series por serie con animación =====
window.toggleSerie = function(button) {
  var serie = button.closest('.serie-section');
  if (!serie) return;

  var isExpanded = serie.classList.contains('expanded');

  if (isExpanded) {
    serie.classList.remove('expanded');
    button.classList.remove('expanded');
    button.textContent = 'Mostrar más';
    setTimeout(function() {
      serie.classList.add('collapsed');
    }, 300);
  } else {
    serie.classList.remove('collapsed');
    setTimeout(function() {
      serie.classList.add('expanded');
      button.classList.add('expanded');
      button.textContent = 'Ver menos';
    }, 300);
  }
};

// ===== Filters: años, disponibilidad, tamaño ===

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
  var h = '<option value="">' + t('ambos') + '</option>'
    + '<option value="true">' + t('disponible') + '</option>'
    + '<option value="false">' + t('vendido') + '</option>';
  select.innerHTML = h;
}

function inicializarFiltrosHome() {
  var sA = document.getElementById('filtro-ano');
  var sD = document.getElementById('filtro-disponibilidad');
  var sT = document.getElementById('filtro-tamano');
  var buscar = document.getElementById('filtro-buscar');
  var limpiar = document.getElementById('limpiar-filtros');

  poblarAnios(sA);
  poblarDisponibilidad(sD);
  if (typeof poblarSelectTamano === 'function') poblarSelectTamano(sT);

  async function repintar() {
    var obras = await obtenerObras();
    cacheObras = obras;
    cachearNuevas(obras);
    renderizarObras(obras);
  }

  if (sA) sA.addEventListener('change', function () { filtrosHome.ano = sA.value; repintar(); });
  if (sD) sD.addEventListener('change', function () {
    // «Todos» vale vacío: solo 'true' y 'false' filtran
    filtrosHome.disponible = (sD.value === 'true' || sD.value === 'false') ? sD.value : '';
    repintar();
  });
  if (sT) sT.addEventListener('change', function () { filtrosHome.tamano = sT.value; repintar(); });
  if (buscar) {
    var espera = null;
    buscar.addEventListener('input', function () {
      clearTimeout(espera);
      espera = setTimeout(function () {
        filtrosHome.texto = buscar.value;
        repintar();
      }, 180);
    });
    // Escape limpia la búsqueda
    buscar.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { buscar.value = ''; filtrosHome.texto = ''; repintar(); }
    });
  }
  if (limpiar) limpiar.addEventListener('click', function () {
    filtrosHome = { ano: '', disponible: '', tamano: '', texto: '' };
    if (sA) sA.value = '';
    if (sD) sD.value = '';
    if (sT) sT.value = '';
    if (buscar) buscar.value = '';
    repintar();
  });
}

// Espaciado de la barra de filtros: la separación con el header y con la
// primera serie es igual a la altura de la propia barra.
function ajustarEspaciadoFiltros() {
  var barra = document.querySelector('.filtros-barra');
  if (!barra) return;

  function aplicar() {
    var h = Math.round(barra.offsetHeight || 0);
    if (h > 0) document.documentElement.style.setProperty('--filtros-espacio', h + 'px');
  }

  aplicar();
  window.addEventListener('resize', aplicar);
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(aplicar).observe(barra);
  }
}

// ===== Navegación de series: menú hamburguesa (mobile-first) =====
// Mobile: hamburguesa + panel desplegable vertical. Desktop (>=700px): pestañas en fila.
/* Pestañas de la home en el mismo orden que la galería: Nubes primero, luego por cantidad */
function renderizarTabsHome(obras) {
  var nav = document.getElementById('series-tabs');
  if (!nav) return;

  var toggle = nav.querySelector('.series-toggle');
  nav.innerHTML = '';
  if (toggle) nav.appendChild(toggle);

  var inicio = document.createElement('a');
  inicio.href = 'index.html';
  inicio.className = 'tab active';
  inicio.textContent = (typeof t === 'function' && t('inicio')) || 'Inicio';
  nav.appendChild(inicio);

  seriesOrdenadas(cacheSeries, obras).forEach(function (s) {
    var a = document.createElement('a');
    a.href = 'serie.html?serie=' + encodeURIComponent(s.id);
    a.className = 'tab';
    a.textContent = capitalizar(s.tema);
    nav.appendChild(a);
  });
}

function inicializarNav() {
  var nav = document.querySelector('.series-tabs');
  var tgl = document.querySelector('.series-toggle');
  if (!nav || !tgl) return;

  function estado(abierto) {
    nav.classList.toggle('open', abierto);
    tgl.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    tgl.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    tgl.textContent = abierto ? '×' : '☰';
  }

  tgl.addEventListener('click', function (e) {
    e.stopPropagation();
    estado(!nav.classList.contains('open'));
  });

  // Tocar fuera del menú lo cierra
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target)) estado(false);
  });

  // ESC lo cierra
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') estado(false);
  });

  // Al volver a desktop se resetea el estado
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 700) estado(false);
  });

  estado(false);
}