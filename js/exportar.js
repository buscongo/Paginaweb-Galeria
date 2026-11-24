/* exportar.js — selección de obras y generación del documento para PDF.

   Flujo:
     1. Se listan las obras por serie con casillas (obra y serie completa).
     2. Filtros (serie, año, disponibilidad, tamaño, nombre) acotan lo visible.
     3. «Seleccionar todo» marca las obras que están en pantalla.
     4. «Exportar» pide el nombre de la portada y abre un HTML con:
          · portada 1920×1080 (Andrés Ramírez Ortiz / Obra <nombre>)
          · una hoja 1920×1080 por obra (imagen a 2/3 + ficha al tercio)
        con un botón fijo «Exportar a PDF» que abre el diálogo de impresión. */

var seleccion = {};        /* id → true */
var filtrosExp = { serie: '', ano: '', disponible: '', tamano: '', texto: '' };
var obrasExp = [];

document.addEventListener('DOMContentLoaded', function () {
  MODO = 'admin';
  protegerAdmin(iniciarExportar);
});

async function iniciarExportar() {
  try { await aplicarIdioma(); } catch (e) { /* silencioso */ }

  await obtenerSeries(true);
  obrasExp = await obtenerObras(true);
  obrasExp = obrasExp.filter(function (o) { return !o.archivado; });

  poblarFiltrosExportar();
  renderExportar();

  document.getElementById('btn-salir').addEventListener('click', cerrarSesionAdmin);
  document.getElementById('filtro-serie').addEventListener('change', leerFiltros);
  document.getElementById('filtro-ano').addEventListener('change', leerFiltros);
  document.getElementById('filtro-disponibilidad').addEventListener('change', leerFiltros);
  document.getElementById('filtro-tamano').addEventListener('change', leerFiltros);
  document.getElementById('btn-todo').addEventListener('click', seleccionarVisibles);
  document.getElementById('btn-limpiar').addEventListener('click', limpiarSeleccion);
  document.getElementById('btn-exportar').addEventListener('click', abrirModalNombre);

  var buscar = document.getElementById('filtro-buscar');
  var espera = null;
  buscar.addEventListener('input', function () {
    clearTimeout(espera);
    espera = setTimeout(function () {
      filtrosExp.texto = normalizarTexto(buscar.value);
      renderExportar();
    }, 180);
  });

  document.getElementById('modal-nombre-cerrar').addEventListener('click', cerrarModalNombre);
  document.getElementById('modal-nombre-cancelar').addEventListener('click', cerrarModalNombre);
  document.getElementById('modal-nombre-generar').addEventListener('click', generarDocumento);
  document.getElementById('campo-nombre').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') generarDocumento();
  });

  actualizarBarra();
}

function poblarFiltrosExportar() {
  var selSerie = document.getElementById('filtro-serie');
  selSerie.innerHTML = '<option value="">Todas las series</option>' +
    cacheSeries.map(function (s) {
      return '<option value="' + escaparHTML(s.id) + '">' + escaparHTML(s.tema) + '</option>';
    }).join('');

  var anos = {};
  obrasExp.forEach(function (o) { if (o.anio) anos[o.anio] = true; });
  document.getElementById('filtro-ano').innerHTML = '<option value="">Todos los años</option>' +
    Object.keys(anos).sort(function (a, b) { return b - a; }).map(function (a) {
      return '<option value="' + escaparHTML(a) + '">' + escaparHTML(a) + '</option>';
    }).join('');

  document.getElementById('filtro-disponibilidad').innerHTML =
    '<option value="">Todas</option><option value="true">Disponibles</option><option value="false">No disponibles</option>';

  poblarSelectTamano(document.getElementById('filtro-tamano'));
}

function leerFiltros() {
  filtrosExp.serie = document.getElementById('filtro-serie').value;
  filtrosExp.ano = document.getElementById('filtro-ano').value;
  filtrosExp.disponible = document.getElementById('filtro-disponibilidad').value;
  filtrosExp.tamano = document.getElementById('filtro-tamano').value;
  renderExportar();
}

function obrasVisibles() {
  return obrasExp.filter(function (o) {
    if (filtrosExp.serie && o.serieId !== filtrosExp.serie) return false;
    if (filtrosExp.ano && String(o.anio) !== String(filtrosExp.ano)) return false;
    if (filtrosExp.disponible !== '' && String(!!o.disponible) !== filtrosExp.disponible) return false;
    if (filtrosExp.tamano && tamanoObra(o) !== filtrosExp.tamano) return false;
    if (filtrosExp.texto && normalizarTexto(o.titulo).indexOf(filtrosExp.texto) === -1) return false;
    return true;
  });
}

function renderExportar() {
  var cont = document.getElementById('obras-por-serie');
  var obras = obrasVisibles();

  if (!obras.length) {
    cont.innerHTML = '<p class="mensaje-vacio">No hay obras con esos filtros.</p>';
    actualizarBarra();
    return;
  }

  var grupos = {};
  obras.forEach(function (o) { (grupos[o.serieId] = grupos[o.serieId] || []).push(o); });

  var html = '';
  Object.keys(grupos).forEach(function (serieId) {
    var serie = buscarSerie(serieId);
    var tema = serie ? serie.tema : 'sin serie';
    var lista = grupos[serieId].slice().sort(function (a, b) {
      return String(b.fechaRegistro).localeCompare(String(a.fechaRegistro));
    });
    var marcadas = lista.filter(function (o) { return seleccion[o.id]; }).length;

    html += '<div class="serie-fila" data-serie="' + escaparHTML(serieId) + '">';
    html += '<label class="serie-sel">' +
      '<input type="checkbox" class="chk-serie" data-serie="' + escaparHTML(serieId) + '"' +
      (marcadas === lista.length ? ' checked' : '') +
      (marcadas > 0 && marcadas < lista.length ? ' data-parcial="1"' : '') + '>' +
      '<span>Serie: ' + escaparHTML(capitalizar(tema)) + ' <span class="serie-cuenta">(' + lista.length + ')</span></span>' +
      '</label>';
    html += '<div class="fila-wrap"><div class="fila-carousel">';

    lista.forEach(function (o) {
      var marcada = !!seleccion[o.id];
      var img = o.imagen
        ? '<img class="tarjeta-imagen" src="' + escaparHTML(o.imagen) + '" alt="' + escaparHTML(o.titulo) + '" loading="lazy">'
        : '<div class="tarjeta-imagen sin-imagen">Sin imagen</div>';
      html += '<article class="tarjeta-obra tarjeta-sel' + (marcada ? ' marcada' : '') + '"' +
        ' data-id="' + escaparHTML(o.id) + '" role="checkbox" aria-checked="' + (marcada ? 'true' : 'false') + '" tabindex="0">' +
        '<span class="sel-check" aria-hidden="true">✓</span>' + img +
        '<div class="tarjeta-info"><h3>' + escaparHTML(o.titulo) + '</h3>' +
        '<div class="tarjeta-meta"><span>' + escaparHTML(o.anio || '') + '</span>' +
        '<span class="serie-nombre">' + escaparHTML(textoTamanoObra(o)) + '</span></div></div>' +
        '</article>';
    });

    html += '</div>';
    html += '<button type="button" class="fila-nav fila-nav-izq" aria-label="Desplazar a la izquierda">‹</button>';
    html += '<button type="button" class="fila-nav fila-nav-der" aria-label="Desplazar a la derecha">›</button>';
    html += '</div></div>';
  });

  cont.innerHTML = html;

  cont.querySelectorAll('.chk-serie').forEach(function (chk) {
    if (chk.getAttribute('data-parcial') === '1') chk.indeterminate = true;
    chk.addEventListener('change', function () {
      marcarSerie(chk.getAttribute('data-serie'), chk.checked);
    });
  });

  cont.querySelectorAll('.tarjeta-sel').forEach(function (card) {
    function alternar() { alternarObra(card.getAttribute('data-id')); }
    card.addEventListener('click', alternar);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); }
    });
  });

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

  actualizarBarra();
}

function alternarObra(id) {
  if (seleccion[id]) delete seleccion[id];
  else seleccion[id] = true;
  renderExportar();
}

function marcarSerie(serieId, marcar) {
  obrasVisibles().forEach(function (o) {
    if (o.serieId !== serieId) return;
    if (marcar) seleccion[o.id] = true;
    else delete seleccion[o.id];
  });
  renderExportar();
}

function seleccionarVisibles() {
  obrasVisibles().forEach(function (o) { seleccion[o.id] = true; });
  renderExportar();
}

function limpiarSeleccion() {
  seleccion = {};
  renderExportar();
}

function idsSeleccionados() {
  return Object.keys(seleccion);
}

function actualizarBarra() {
  var barra = document.getElementById('exportar-barra');
  var cuenta = document.getElementById('exportar-cuenta');
  var n = idsSeleccionados().length;
  barra.hidden = n === 0;
  document.body.classList.toggle('con-barra-exportar', n > 0);
  cuenta.textContent = n === 1 ? '1 obra seleccionada' : n + ' obras seleccionadas';
  document.getElementById('btn-todo').textContent = 'SELECCIONAR TODO (' + obrasVisibles().length + ')';
}

/* ---------- Modal del nombre ---------- */

function abrirModalNombre() {
  if (!idsSeleccionados().length) { alert('Seleccioná al menos una obra.'); return; }
  var ov = document.getElementById('modal-nombre');
  ov.classList.add('activo');
  document.getElementById('modal-nombre-estado').hidden = true;
  setTimeout(function () { document.getElementById('campo-nombre').focus(); }, 50);
}

function cerrarModalNombre() {
  document.getElementById('modal-nombre').classList.remove('activo');
}

async function generarDocumento() {
  var nombre = document.getElementById('campo-nombre').value.trim();
  var estado = document.getElementById('modal-nombre-estado');
  var boton = document.getElementById('modal-nombre-generar');

  if (!nombre) { alert('Escribí un nombre para la portada.'); return; }

  var ids = idsSeleccionados();
  var obras = ids.map(function (id) {
    return obrasExp.find(function (o) { return o.id === id; });
  }).filter(Boolean);

  boton.disabled = true;
  estado.hidden = false;
  estado.textContent = 'Preparando imágenes…';

  try {
    var imagenes = await prepararImagenes(obras);
    var html = construirDocumento(nombre, obras, imagenes);
    abrirDocumento(html);
    cerrarModalNombre();
  } catch (e) {
    estado.textContent = 'No se pudo generar: ' + (e && e.message ? e.message : e);
  } finally {
    boton.disabled = false;
  }
}

/* Convierte cada imagen en data URL para que el archivo generado funcione solo */
async function prepararImagenes(obras) {
  var salida = {};
  for (var i = 0; i < obras.length; i++) {
    var o = obras[i];
    var src = o.imagenHD || o.imagenMedium || o.imagen || '';
    if (!src) { salida[o.id] = ''; continue; }
    try {
      var r = await fetch(src);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var blob = await r.blob();
      salida[o.id] = await blobADataURL(blob);
    } catch (e) {
      salida[o.id] = src;     /* si falla, se usa la ruta relativa */
    }
  }
  return salida;
}

function blobADataURL(blob) {
  return new Promise(function (resolver, rechazar) {
    var fr = new FileReader();
    fr.onload = function () { resolver(fr.result); };
    fr.onerror = function () { rechazar(new Error('No se pudo leer una imagen')); };
    fr.readAsDataURL(blob);
  });
}

/* ---------- Documento ---------- */

function construirDocumento(nombre, obras, imagenes) {
  var hoy = new Date();
  var fecha = hoy.getDate() + '/' + (hoy.getMonth() + 1) + '/' + hoy.getFullYear();
  var total = obras.length;
  var hojas = obras.map(function (o, i) {
    return hojaObra(o, imagenes[o.id], i + 1, total);
  }).join('\n');

  return '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n' +
    '<title>' + escaparHTML(nombre) + ' — Andrés Ramírez Ortiz</title>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=GFS+Didot&display=swap" rel="stylesheet">\n' +
    '<style>' + estilosDocumento() + '</style>\n</head>\n<body>\n' +
    '<div class="barra">' +
      '<span class="barra-titulo">' + escaparHTML(nombre) + ' · ' + total + (total === 1 ? ' obra' : ' obras') + '</span>' +
      '<span class="barra-nota">Tamaño de página: 1920 × 1080 px · ' + fecha + '</span>' +
      '<button type="button" class="barra-boton" onclick="window.print()">Exportar a PDF</button>' +
    '</div>\n' +
    portada(nombre, total, fecha) + '\n' + hojas + '\n</body>\n</html>';
}

function portada(nombre, total, fecha) {
  return '<section class="hoja portada">' +
    '<p class="portada-nombre">Andrés Ramírez Ortiz</p>' +
    '<p class="portada-obra">Obra ' + escaparHTML(nombre) + '</p>' +
    '<p class="portada-pie">' + total + (total === 1 ? ' obra' : ' obras') + ' · ' + fecha + '</p>' +
    '</section>';
}

function hojaObra(o, imagen, numero, total) {
  var serie = buscarSerie(o.serieId);
  var filas = [];
  if (o.anio) filas.push(['Año', String(o.anio)]);
  if (o.tecnica) filas.push(['Técnica', o.tecnica]);
  if (o.materiales) filas.push(['Materiales', o.materiales]);
  var tam = textoTamanoObra(o);
  if (tam) filas.push(['Medidas', tam]);
  filas.push(['Disponibilidad', o.disponible ? 'Disponible' : 'No disponible']);
  if (o.disponible && o.precio) filas.push(['Precio', formatoMoneda(o.precio)]);

  var ficha = filas.map(function (f) {
    return '<div class="fila"><dt>' + escaparHTML(f[0]) + '</dt><dd>' + escaparHTML(f[1]) + '</dd></div>';
  }).join('');

  var foto = imagen
    ? '<img src="' + imagen + '" alt="' + escaparHTML(o.titulo) + '">'
    : '<span class="sin-imagen">Sin imagen</span>';

  return '<section class="hoja obra">' +
    '<div class="obra-imagen">' + foto + '</div>' +
    '<div class="obra-info">' +
      (serie ? '<p class="serie">Serie: ' + escaparHTML(capitalizar(serie.tema)) + '</p>' : '') +
      '<h1 class="titulo">' + escaparHTML(o.titulo) + '</h1>' +
      '<dl class="ficha">' + ficha + '</dl>' +
      '<p class="numero">' + numero + ' / ' + total + '</p>' +
    '</div>' +
    '</section>';
}

function estilosDocumento() {
  return [
    '@page { size: 1920px 1080px; margin: 0; }',
    '* { box-sizing: border-box; }',
    'html, body { margin: 0; padding: 0; background: #2f2f2f; }',
    'body { font-family: "GFS Didot", Georgia, "Times New Roman", serif; color: #111; padding-top: 56px; }',
    '.barra { position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 10; display: flex;',
    '  align-items: center; gap: 24px; padding: 0 24px; background: #111; color: #fff; font-size: 14px; }',
    '.barra-titulo { letter-spacing: .08em; text-transform: uppercase; }',
    '.barra-nota { opacity: .6; font-size: 12px; }',
    '.barra-boton { margin-left: auto; padding: 10px 22px; background: #fff; color: #111; border: 0;',
    '  font-family: inherit; font-size: 14px; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; }',
    '.hoja { width: 1920px; height: 1080px; position: relative; overflow: hidden; background: #fff;',
    '  margin: 0 auto; display: flex; }',
    '.portada { background: #4a4a4a; color: #fff; flex-direction: column; justify-content: center;',
    '  padding: 0 160px; gap: 26px; }',
    '.portada-nombre { margin: 0; font-size: 92px; line-height: 1.04; letter-spacing: .02em; text-transform: uppercase; }',
    '.portada-obra { margin: 0; font-size: 44px; opacity: .9; }',
    '.portada-pie { margin: 24px 0 0; font-size: 22px; opacity: .65; letter-spacing: .12em; text-transform: uppercase; }',
    '.obra-imagen { width: 1280px; height: 1080px; display: flex; align-items: center; justify-content: center;',
    '  background: #ececec; padding: 40px; }',
    '.obra-imagen img { max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; }',
    '.obra-imagen .sin-imagen { font-size: 26px; opacity: .5; }',
    '.obra-info { width: 640px; height: 1080px; padding: 96px 76px; display: flex; flex-direction: column;',
    '  justify-content: center; gap: 30px; }',
    '.serie { margin: 0; font-size: 20px; letter-spacing: .16em; text-transform: uppercase; opacity: .65; }',
    '.titulo { margin: 0; font-size: 62px; line-height: 1.08; font-weight: 400; }',
    '.ficha { margin: 10px 0 0; display: flex; flex-direction: column; }',
    '.fila { display: flex; justify-content: space-between; gap: 24px; padding: 16px 0;',
    '  border-top: 1px solid #d8d8d8; font-size: 24px; }',
    '.fila:first-child { border-top: 1px solid #111; }',
    '.fila dt { margin: 0; opacity: .6; letter-spacing: .1em; text-transform: uppercase; font-size: 17px; padding-top: 6px; }',
    '.fila dd { margin: 0; text-align: right; max-width: 62%; }',
    '.numero { margin: 18px 0 0; font-size: 18px; opacity: .45; letter-spacing: .14em; }',
    '.hoja + .hoja { margin-top: 24px; }',
    '@media print {',
    '  body { padding-top: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    '  .barra { display: none; }',
    '  .hoja, .hoja + .hoja { margin: 0; }',
    '  .hoja { break-after: page; page-break-after: always; }',
    '  .hoja:last-of-type { break-after: auto; page-break-after: auto; }',
    '}'
  ].join('\n');
}

function abrirDocumento(html) {
  var blob = new Blob([html], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  var ventana = window.open(url, '_blank');
  if (!ventana) {
    alert('El navegador bloqueó la pestaña. Permití las ventanas emergentes para ver el documento.');
  }
  setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
}
