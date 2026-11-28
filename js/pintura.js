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

/* El HD no se publica: su versión pública es el medium del mismo nombre */
function versionMedium(ruta) {
  return String(ruta || '').replace(/_hd\.(jpe?g|png|webp)$/i, '_medium.$1');
}

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
  if (heroFondo && o.imagenMedium) heroFondo.style.backgroundImage = 'url("' + o.imagenMedium + '")';

  // Serie
  var s = buscarSerie(o.serieId);
  var ns = s ? s.tema : t('sinSerie');

  // Precio: el botón abre una ventana para solicitar el precio por correo.
  var btnPrecio = document.getElementById('btn-ver-precio');
  var ovSolicitud = document.getElementById('solicitud-overlay');
  var txtObra = document.getElementById('solicitud-obra');
  var formSolicitud = document.getElementById('form-solicitud');

  function cerrarSolicitud() {
    if (!ovSolicitud) return;
    ovSolicitud.classList.remove('activo');
    document.body.style.overflow = '';
  }

  if (btnPrecio && ovSolicitud) {
    if (txtObra) txtObra.textContent = o.titulo + ' · ' + (o.ancho || '') + ' × ' + (o.alto || '') + ' cm';

    btnPrecio.onclick = function () {
      ovSolicitud.classList.add('activo');
      document.body.style.overflow = 'hidden';
    };

    var cerrarBtn = document.getElementById('solicitud-cerrar');
    if (cerrarBtn) cerrarBtn.onclick = cerrarSolicitud;
    ovSolicitud.addEventListener('click', function (e) {
      if (e.target === ovSolicitud) cerrarSolicitud();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarSolicitud();
    });

    if (formSolicitud) {
      formSolicitud.addEventListener('submit', async function (e) {
        e.preventDefault();
        var nombre = (document.getElementById('solicitud-nombre') || {}).value || '';
        var correo = (document.getElementById('solicitud-correo') || {}).value || '';
        var galeria = (document.getElementById('solicitud-galeria') || {}).value || '';
        var mensaje = (document.getElementById('solicitud-mensaje') || {}).value || '';
        var aviso = document.getElementById('solicitud-aviso');
        var boton = document.getElementById('solicitud-enviar');

        nombre = nombre.trim();
        correo = correo.trim();
        galeria = galeria.trim();
        mensaje = mensaje.trim();

        function decir(texto, error) {
          if (!aviso) return;
          aviso.textContent = texto;
          aviso.classList.toggle('error', !!error);
        }

        if (!nombre || !correo || !galeria || !mensaje) {
          decir('Completá todos los campos para enviar la solicitud.', true);
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
          decir('Revisá el correo: parece que falta algo.', true);
          return;
        }

        var datos = {
          'Nombre': nombre,
          'Correo': correo,
          'Galería o cliente': galeria,
          'Mensaje': mensaje,
          'Obra': o.titulo,
          'Enviado desde la página': 'andresramirezortiz.com',
          _subject: 'Solicitud de precio: ' + o.titulo,
          _replyto: correo,
          _template: 'table'
        };

        if (boton) { boton.disabled = true; boton.textContent = 'Enviando…'; }
        decir('Enviando la solicitud…');

        try {
          var r = await fetch('https://formsubmit.co/ajax/buscongo@gmail.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(datos)
          });
          if (!r.ok) throw new Error('respuesta ' + r.status);

          /* copia en el servidor como respaldo */
          fetch('/api/solicitud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: nombre, correo: correo, galeria: galeria,
              mensaje: mensaje, obra: o.titulo
            })
          }).catch(function () {});

          decir('Solicitud enviada. Te responderé a ' + correo + '.');
          formSolicitud.reset();
        } catch (err) {
          decir('No se pudo enviar. Probá de nuevo o escribí a buscongo@gmail.com.', true);
        } finally {
          if (boton) { boton.disabled = false; boton.textContent = 'Enviar solicitud'; }
        }
      });
    }
  }

  // Ficha técnica
  var fichaEl = document.getElementById('ficha-tecnica');
  if (fichaEl) {
    var tamano = (o.ancho && o.alto) ? (o.ancho + ' × ' + o.alto + ' cm') : 'N/A';
    var materiales = materialesDeObra(o) || o.tecnica || 'N/A';   /* solo si difiere de la técnica */
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
  if (o.imagenMedium) fotos.push({ thumb: o.imagen, view: o.imagenMedium });
  (o.detalles || []).forEach(function (d) {
    if (!d || !d.thumb) return;
    var vista = d.medium || (d.hd ? versionMedium(d.hd) : d.thumb);
    fotos.push({ thumb: d.thumb, view: vista });
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

  // Imagen grande y zoom usan siempre el tamaño mediano (1200 px): el HD no se publica
  var indiceActual = 0;
  imgGrande.src = fotos[0].view || fotos[0].thumb;
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
      zoomImg.src = (actual && actual.view) || imgGrande.src;
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
      imgGrande.src = f.view || f.thumb;
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