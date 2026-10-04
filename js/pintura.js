/* ========================================
   pintura.js — Página de detalle de una obra
   Cargado solo en html/pintura.html
   ======================================== */

document.addEventListener('DOMContentLoaded', async function () {
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
  if (heroFondo && o.imagen2k) heroFondo.style.backgroundImage = 'url("' + o.imagen2k + '")';

  // Meta: año · tamaño · técnica · serie
  var s = buscarSerie(o.serieId);
  var ns = s ? s.tema : t('sinSerie');
  var partes = [];
  if (o.anio && o.anio !== 0) partes.push(String(o.anio));
  if (o.ancho && o.alto) partes.push(o.ancho + ' × ' + o.alto + ' cm');
  if (o.materiales) partes.push(o.materiales);
  partes.push(ns);
  var meta = document.getElementById('pintura-meta-texto');
  if (meta) meta.textContent = partes.join(' · ');

  // Fotos = [portada] + detalles (portada también entra al carousel)
  var fotos = [];
  if (o.imagen2k) fotos.push({ thumb: o.imagen, full: o.imagen2k });
  (o.detalles || []).forEach(function (d) {
    if (d && d.thumb && d.full) fotos.push(d);
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

  // Imagen grande = 2k de la portada (primera foto)
  imgGrande.src = fotos[0].full || fotos[0].thumb;
  imgGrande.alt = o.titulo;
  imgGrande.style.cursor = 'zoom-in';

  // --- Zoom overlay ---
  var zoomOverlay = document.getElementById('zoom-overlay');
  var zoomImg = document.getElementById('zoom-imagen');
  if (imgGrande && zoomOverlay && zoomImg) {
    var zoomScale = 1;
    var maxZoom = 1;

    // abrir zoom: usar la imagen 2k actual
    imgGrande.addEventListener('click', function () {
      zoomImg.src = imgGrande.src;
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
      imgGrande.src = f.full || f.thumb;
      var all = car.querySelectorAll('.carousel-thumb');
      for (var k = 0; k < all.length; k++) all[k].classList.remove('activa');
      th.classList.add('activa');
    });
    car.appendChild(th);
  });
}
