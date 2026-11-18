/* ========================================
   home.js — Inicialización de la Home (portfolio)
   Hero + nuevas obras + todas las obras (vista única controlada por VER TODO)
   ======================================== */

var filtrosHome = { ano: '', disponible: '', tamano: '' };
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

  renderizarHero(cacheObras);
  renderizarObras(cacheObras);

  inicializarFiltrosHome();

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
  var car = document.createElement('div');
  car.className = 'fila-carousel';
  obras.forEach(function (o) {
    o._nuevo = (cacheNuevasIds.indexOf(o.id) !== -1);
    car.appendChild(crearTarjetaObra(o));
  });
  fila.appendChild(car);
  return fila;
}

function obraMasReciente(obras) {
  if (!obras || obras.length === 0) return null;
  var r = obras[0];
  for (var i = 1; i < obras.length; i++) {
    if (obras[i].fechaRegistro > r.fechaRegistro) r = obras[i];
  }
  return r;
}

function obtener2kRandomAnioActual(obras) {
  var a = añoActual();
  var delAnio = obras.filter(function (x) { return x.anio === a && x.imagen2k; });
  if (delAnio.length === 0) {
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
    fondo.style.backgroundImage = 'url(\"' + img + '\")';
  }
}

// --- Render: vista única (carousels O secciones) ---

function renderizarObras(obras) {
  var contenedor = document.getElementById('contenido-obras');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  var filtradas = aplicarFiltros(obras);
  var modoVerdadero = document.body.classList.contains('ver-todo-activo');

  if (modoVerdadero) {
    renderizarSeriesColapsablesConFiltros(filtradas);
  } else {
    renderizarGaleriaSeriesConFiltros(filtradas);
  }

  // Obras sin serie
  var sinSerie = filtradas.filter(function (x) {
    return !cacheSeries.some(function (s) { return s.id === x.serieId; });
  });
  if (sinSerie.length > 0) {
    if (modoVerdadero) {
      var seccionSin = document.createElement('section');
      seccionSin.className = 'serie-section collapsible';
      seccionSin.id = 'serie-sin-serie';
      var headerSin = document.createElement('div');
      headerSin.className = 'series-header';
      headerSin.innerHTML = '<h2 class="series-title">' + t('sinSerie') + '</h2><button class="btn-show-more" onclick="toggleSerie(this)">Mostrar más</button>';
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
    } else {
      var fila = crearFilaSerie(t('sinSerie'), sinSerie);
      contenedor.appendChild(fila);
    }
  }

  if (filtradas.length === 0) {
    contenedor.innerHTML = '<p class="mensaje-vacio">' + t('sinResultadosFiltro') + '</p>';
  }
}

function renderizarSeriesColapsablesConFiltros(obras) {
  var contenedor = document.getElementById('contenido-obras');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  var series = obras.length > 0 ? cacheSeries.slice().sort(function (a, b) { return a.tema.localeCompare(b.tema); }) : [];

  series.forEach(function (serie) {
    var obrasSerie = obras.filter(function (x) { return x.serieId === serie.id; });
    if (obrasSerie.length === 0) return;

    var seccion = document.createElement('section');
    seccion.className = 'serie-section collapsible';
    seccion.id = 'serie-' + serie.tema.toLowerCase().replace(/\s+/g, '-');

    var header = document.createElement('div');
    header.className = 'series-header';
    header.innerHTML = '<h2 class="series-title">' + capitalizar(serie.tema) + '</h2><button class="btn-show-more" onclick="toggleSerie(this)">Mostrar más</button>';

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
    seccionSin.className = 'serie-section collapsible';
    seccionSin.id = 'serie-sin-serie';
    var headerSin = document.createElement('div');
    headerSin.className = 'series-header';
    headerSin.innerHTML = '<h2 class="series-title">' + t('sinSerie') + '</h2><button class="btn-show-more" onclick="toggleSerie(this)">Mostrar más</button>';
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

  var series = cacheSeries.slice().sort(function (a, b) { return a.tema.localeCompare(b.tema); });
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

// Filtrar obras por año y disponibilidad
function aplicarFiltros(obras) {
  return obras.filter(function (x) {
    if (filtrosHome.ano && x.anio !== parseInt(filtrosHome.ano)) return false;
    if (filtrosHome.disponible !== '' && x.disponible.toString() !== filtrosHome.disponible) return false;
    if (filtrosHome.tamano && tamanoObra(x) !== filtrosHome.tamano) return false;
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

// ===== Botón VER TODO =====
var btnVerTodo = document.getElementById('btn-ver-todo');

if (btnVerTodo) {
  btnVerTodo.addEventListener('click', function() {
    var isActivo = document.body.classList.contains('ver-todo-activo');

    if (isActivo) {
      document.body.classList.remove('ver-todo-activo');
      this.textContent = 'VER TODO';

      var secciones = document.querySelectorAll('.serie-section');
      secciones.forEach(function(sec) {
        sec.classList.remove('expanded');
        setTimeout(function() {
          sec.classList.add('collapsed');
        }, 300);
      });
    } else {
      document.body.classList.add('ver-todo-activo');
      this.textContent = 'VER menos';

      var secciones = document.querySelectorAll('.serie-section');
      secciones.forEach(function(sec) {
        sec.classList.remove('collapsed');
        setTimeout(function() {
          sec.classList.add('expanded');
        }, 300);
      });
    }

    renderizarObras(cacheObras);
  });
}

// Mostrar botón VER TODO al hacer scroll
window.addEventListener('scroll', function() {
  if (btnVerTodo) {
    if (window.scrollY > 300) {
      btnVerTodo.classList.add('visible');
    } else {
      btnVerTodo.classList.remove('visible');
    }
  }
});

// ===== Filters: años, disponibilidad, tamaño ===

function poblarAnios(select) {
  if (!select) return;
  var y = {};
  cacheObras.forEach(function (o) { y[o.anio] = true; });
  var años = Object.keys(y).map(Number).filter(function (a) { return a > 0; });
  años.sort(function (a, b) { return b - a; });
  var h = '<option value="' + t('todosAños') + '">' + t('todosAños') + '</option>';
  años.forEach(function (a) { h += '<option value="' + a + '">' + a + '</option>'; });
  select.innerHTML = h;
}

function poblarDisponibilidad(select) {
  if (!select) return;
  var h = '<option value="' + t('todos') + '">' + t('todos') + '</option>'
    + '<option value="true">' + t('disponible') + '</option>'
    + '<option value="false">' + t('noDisponible') + '</option>';
  select.innerHTML = h;
}

function inicializarFiltrosHome() {
  var sA = document.getElementById('filtro-ano');
  var sD = document.getElementById('filtro-disponibilidad');
  var sT = document.getElementById('filtro-tamano');
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
  if (sD) sD.addEventListener('change', function () { filtrosHome.disponible = sD.value; repintar(); });
  if (sT) sT.addEventListener('change', function () { filtrosHome.tamano = sT.value; repintar(); });
  if (limpiar) limpiar.addEventListener('click', function () {
    filtrosHome = { ano: '', disponible: '', tamano: '' };
    if (sA) sA.value = '';
    if (sD) sD.value = '';
    if (sT) sT.value = '';
    repintar();
  });
}