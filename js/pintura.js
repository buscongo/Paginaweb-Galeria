/* ========================================
   pintura.js — Página de detalle de una obra
   Layout 3: Grid 1fr/1fr tipo catálogo editorial
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
  inicializarNav();
  await aplicarIdioma();
  await obtenerSeries();

  var id = new URLSearchParams(window.location.search).get('id');
  if (!id) { mostrarError(); return; }

  var o = await obtenerObra(id);
  if (!o) { mostrarError(); return; }

  renderizarDetalle(o);
});

function mostrarError() {
  var titulo = document.getElementById('pintura-titulo');
  var meta = document.getElementById('pintura-meta-texto');
  if (titulo) titulo.textContent = 'Obra no encontrada';
  if (meta) meta.textContent = 'Revisa el enlace o vuelve a la galería.';
}

function renderizarDetalle(o) {
  // Títulos
  var titulo = document.getElementById('pintura-titulo');
  var tituloD = document.getElementById('pintura-titulo-detalle');
  if (titulo) titulo.textContent = o.titulo;
  if (tituloD) tituloD.textContent = o.titulo;
  document.title = o.titulo + ' — Andrés Ramírez Ortíz';

  // Hero detalle: fondo 2k de la obra (efecto frost vía .hero-overlay)
  var heroFondo = document.getElementById('hero-fondo');
  if (heroFondo && o.imagenHD) heroFondo.style.backgroundImage = 'url("' + (o.imagenMedium || o.imagenHD) + '")';

  // Serie
  var s = buscarSerie(o.serieId);
  var ns = s ? s.tema : t('sinSerie');

  // Meta: año · tamaño · técnica · serie
  var partes = [];
  if (o.anio && o.anio !== 0) partes.push(String(o.anio));
  if (o.ancho && o.alto) partes.push(o.ancho + ' × ' + o.alto + ' cm');
  if (o.materiales) partes.push(o.materiales);
  partes.push(ns);
  var meta = document.getElementById('pintura-meta-texto');
  if (meta) meta.textContent = partes.join(' · ');

  // Precio: solo se muestra si la obra está disponible.
  // Va al final de la información, después de la ficha técnica.
  var precioEl = document.getElementById('pintura-precio');
  if (precioEl) {
    if (o.disponible && o.precio) {
      precioEl.textContent = t('precio') + ': ' + formatoMoneda(o.precio);
      precioEl.hidden = false;
      precioEl.removeAttribute('hidden');
    } else {
      precioEl.textContent = '';
      precioEl.hidden = true;
      precioEl.setAttribute('hidden', '');
    }
  }

  // Serie (footer)
  var serieEl = document.getElementById('pintura-serie');
  if (serieEl) serieEl.textContent = 'Serie: ' + ns;

  // Descripción (puede venir de la obra o ser generada)
  var descEl = document.getElementById('pintura-descripcion');
  if (descEl) {
    if (o.descripcion) {
      descEl.textContent = o.descripcion;
    } else {
      descEl.textContent = 'Obra perteneciente a la serie "' + ns + '". ' + (o.materiales || '') + ', año ' + (o.anio || 'fecha por confirmar') + '.';
    }
  }

  // Ficha técnica
  var fichaEl = document.getElementById('ficha-tecnica');
  if (fichaEl) {
    var tamano = (o.ancho && o.alto) ? (o.ancho + ' × ' + o.alto + ' cm') : 'N/A';
    var materiales = o.materiales || 'N/A';
    var anio = o.anio || '.fecha por confirmar';
    var disponible = o.disponible ? t('disponible') : t('noDisponible');
    var disponibleClass = o.disponible ? 'badge-disponible si' : 'badge-disponible no';

    fichaEl.innerHTML = 
      '<div class="ficha-item">' +
        '<span class="ficha-label">' + t('tamaño') + '</span>' +
        '<span class="ficha-value">' + tamano + '</span>' +
      '</div>' +
      '<div class="ficha-item">' +
        '<span class="ficha-label">' + t('materialesTecnica') + '</span>' +
        '<span class="ficha-value">' + materiales + '</span>' +
      '</div>' +
      '<div class="ficha-item">' +
        '<span class="ficha-label">' + t('anio') + '</span>' +
        '<span class="ficha-value">' + anio + '</span>' +
      '</div>' +
      '<div class="ficha-item">' +
        '<span class="ficha-label">' + t('serie') + '</span>' +
        '<span class="ficha-value serie-nombre">' + ns + '</span>' +
      '</div>' +
      '<div class="ficha-item">' +
        '<span class="ficha-label">' + t('disponibilidad') + '</span>' +
        '<span class="' + disponibleClass + '">' + disponible + '</span>' +
      '</div>';
  }

  // Fotos = [portada] + detalles (portada también entra al carousel)
  var fotos = [];
  if (o.imagenHD) fotos.push({ thumb: o.imagen, view: o.imagenMedium || o.imagenHD, hd: o.imagenHD });
  (o.detalles || []).forEach(function (d) {
    if (d && d.thumb && (d.hd || d.full)) fotos.push({ thumb: d.thumb, view: d.hd || d.full, hd: d.hd || d.full });
  });

  var imgGrande = document.getElementById('imagen-grande');
  var car = document.getElementById('detalles-carousel');
  var sec = document.getElementById('seccion-detalles');
  if (!imgGrande || !car) return;

  if (fotos.length === 0) {
    if (sec) sec.style.display = 'none';
    if (o.imagen) imgGrande.src = o.imagen;
    imgGrande.alt = o.titulo;
    return;
  }

  // Imagen grande = tamaño mediano (1200 px); el HD se usa al hacer zoom
  var indiceActual = 0;
  imgGrande.src = fotos[0].view || fotos[0].hd || fotos[0].thumb;
  imgGrande.alt = o.titulo;
  imgGrande.style.cursor = 'zoom-in';

  // --- Zoom overlay ---
  var zoomOverlay = document.getElementById('zoom-overlay');
  var zoomImg = document.getElementById('zoom-imagen');
  if (imgGrande && zoomOverlay && zoomImg) {
    var zoomScale = 1;
    var maxZoom = 1;

    // abrir zoom: el HD de la foto que se está viendo
    imgGrande.addEventListener('click', function () {
      var actual = fotos[indiceActual] || fotos[0];
      zoomImg.src = (actual && actual.hd) || imgGrande.src;
      zoomImg.alt = o.titulo;
      zoomOverlay.classList.add('activo');
      zoomScale = 1;
      zoomImg.classList.remove('zoomed');
      zoomImg.style.transform = 'scale(1)';
      document.body.style.overflow = 'hidden';
    });

    // la imagen nativa carga → calcular zoom máximo (= tamaño real)
    zoomImg.onload = function () {
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var ratio = Math.min(
        vw / zoomImg.naturalWidth,
        vh / zoomImg.naturalHeight
      );
      maxZoom = Math.max(ratio, 1 / ratio);  // escala para ocupar full viewport vs 1:1
      // el zoom máximo = factor para que la imagen ocupe todo el viewport desde object-fit:contain
    };

    // cerrar
    var cerrarZoom = function () {
      zoomOverlay.classList.remove('activo');
      document.body.style.overflow = '';
      zoomImg.src = '';
      zoomScale = 1;
    };
    var zoomClose = document.getElementById('zoom-close');
    if (zoomClose) zoomClose.addEventListener('click', cerrarZoom);
    zoomOverlay.addEventListener('click', function (e) {
      if (e.target === zoomOverlay) cerrarZoom();
    });

    // zoom con rueda: de 1 (object-fit:contain) hasta tamaño real nativo
    zoomImg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var delta = e.deltaY < 0 ? 0.1 : -0.1;
      zoomScale = Math.max(1, Math.min(zoomScale + delta, maxZoom));
      if (zoomScale > 1.01) {
        zoomImg.classList.add('zoomed');
      } else {
        zoomImg.classList.remove('zoomed');
        zoomScale = 1;
      }
      zoomImg.style.transform = 'scale(' + zoomScale + ')';
    });

    // cerrar con ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && zoomOverlay.classList.contains('activo')) cerrarZoom();
    });
  }

  // Carousel "Detalles": thumbnails; click → 2k en la imagen grande
  car.innerHTML = '';
  fotos.forEach(function (f, i) {
    var th = document.createElement('img');
    th.src = f.thumb;
    th.alt = o.titulo + ' — ' + (i + 1);
    th.className = 'carousel-thumb' + (i === 0 ? ' activa' : '');
    th.addEventListener('click', function () {
      imgGrande.src = f.view || f.hd || f.thumb;
      indiceActual = i;
      var all = car.querySelectorAll('.carousel-thumb');
      for (var k = 0; k < all.length; k++) all[k].classList.remove('activa');
      th.classList.add('activa');
    });
    car.appendChild(th);
  });
}

// ===== Navegación de series: menú hamburguesa (mobile-first) =====
// Mobile: hamburguesa + panel desplegable vertical. Desktop (>=700px): pestañas en fila.
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

  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target)) estado(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') estado(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 700) estado(false);
  });

  estado(false);
}