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

  var mostrarPrecios = !!document.getElementById('chk-precios').checked;

  boton.disabled = true;
  estado.hidden = false;
  estado.textContent = 'Preparando imágenes…';

  try {
    var imagenes = await prepararImagenes(obras);
    var html = construirDocumento(nombre, obras, imagenes, { precios: mostrarPrecios });
    abrirDocumento(html);
    cerrarModalNombre();
  } catch (e) {
    estado.textContent = 'No se pudo generar: ' + (e && e.message ? e.message : e);
  } finally {
    boton.disabled = false;
  }
}

/* Convierte cada imagen en data URL para que el archivo generado funcione solo.
   Se guardan dos versiones por obra: la grande (hoja) y el thumb (índice). */
async function prepararImagenes(obras) {
  var salida = { grande: {}, chico: {} };
  for (var i = 0; i < obras.length; i++) {
    var o = obras[i];
    salida.grande[o.id] = await embeber(o.imagenHD || o.imagenMedium || o.imagen);
    salida.chico[o.id] = await embeber(o.imagen || o.imagenMedium || o.imagenHD);
  }
  return salida;
}

async function embeber(src) {
  if (!src) return '';
  try {
    var r = await fetch(src);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var blob = await r.blob();
    return await blobADataURL(blob);
  } catch (e) {
    return src;     /* si falla, se usa la ruta relativa */
  }
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

/* Agrupa las obras por serie respetando el orden de las series del sitio */
function agruparPorSerie(obras) {
  var orden = [];
  var mapa = {};
  obras.forEach(function (o) {
    var id = o.serieId || 'sin-serie';
    if (!mapa[id]) { mapa[id] = { id: id, obras: [] }; orden.push(id); }
    mapa[id].obras.push(o);
  });
  return orden.map(function (id) { return mapa[id]; });
}

/* Arma el orden de hojas y numera cada obra como página del PDF */
function planificarSecciones(obras) {
  var grupos = agruparPorSerie(obras);
  var secciones = [{ tipo: 'portada' }];

  var paginasIndice = Math.max(1, Math.ceil(obras.length / OBRAS_POR_INDICE));
  for (var i = 0; i < paginasIndice; i++) {
    secciones.push({ tipo: 'indice', desde: i * OBRAS_POR_INDICE });
  }

  grupos.forEach(function (g) {
    secciones.push({ tipo: 'serie', grupo: g });
    g.obras.forEach(function (o) { secciones.push({ tipo: 'obra', obra: o }); });
  });

  secciones.forEach(function (s, i) { s.numero = i + 1; });

  var paginaDeObra = {};
  secciones.forEach(function (s) { if (s.tipo === 'obra') paginaDeObra[s.obra.id] = s.numero; });

  /* Orden de aparición de las obras (para el índice) */
  var ordenObras = [];
  grupos.forEach(function (g) { g.obras.forEach(function (o) { ordenObras.push(o); }); });

  return { secciones: secciones, paginaDeObra: paginaDeObra, ordenObras: ordenObras, grupos: grupos };
}

var OBRAS_POR_INDICE = 8;

/* Ordena por serie (según el orden del sitio) y dentro de cada serie por fecha */
function ordenarObras(obras) {
  var posicion = {};
  cacheSeries.forEach(function (s, i) { posicion[s.id] = i; });
  return obras.slice().sort(function (a, b) {
    var pa = posicion[a.serieId];
    var pb = posicion[b.serieId];
    pa = pa === undefined ? 999 : pa;
    pb = pb === undefined ? 999 : pb;
    if (pa !== pb) return pa - pb;
    return String(b.fechaRegistro).localeCompare(String(a.fechaRegistro));
  });
}

function construirDocumento(nombre, obras, imagenes, opciones) {
  var precios = !!(opciones && opciones.precios);
  var hoy = new Date();
  var fecha = hoy.getDate() + '/' + (hoy.getMonth() + 1) + '/' + hoy.getFullYear();
  obras = ordenarObras(obras);
  var total = obras.length;
  var plan = planificarSecciones(obras);
  var totalPaginas = plan.secciones.length;

  var hojas = plan.secciones.map(function (s) {
    if (s.tipo === 'portada') return portada(nombre, total, fecha);
    if (s.tipo === 'indice') {
      return hojaIndice(plan.ordenObras.slice(s.desde, s.desde + OBRAS_POR_INDICE),
        imagenes.chico, plan.paginaDeObra, s.numero, totalPaginas);
    }
    if (s.tipo === 'serie') return hojaSerie(s.grupo);
    return hojaObra(s.obra, imagenes.grande[s.obra.id], s.numero, totalPaginas, precios);
  }).join('\n');

  return '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n' +
    '<title>' + escaparHTML(nombre) + ' — Andrés Ramírez Ortiz</title>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=GFS+Didot&display=swap" rel="stylesheet">\n' +
    '<style>' + estilosDocumento() + '</style>\n</head>\n<body>\n' +
    '<div class="barra">' +
      '<span class="barra-titulo">' + escaparHTML(nombre) + ' · ' + total + (total === 1 ? ' obra' : ' obras') +
        ' · ' + totalPaginas + ' páginas</span>' +
      '<span class="barra-nota">Página 1920 × 1080 px · ' + fecha + (precios ? ' · con precios' : '') + '</span>' +
      '<button type="button" class="barra-boton" onclick="window.print()">Exportar a PDF</button>' +
    '</div>\n' +
    hojas + '\n</body>\n</html>';
}

function portada(nombre, total, fecha) {
  return '<section class="hoja portada">' +
    '<p class="portada-nombre">Andrés Ramírez Ortiz</p>' +
    '<p class="portada-obra">Obra ' + escaparHTML(nombre) + '</p>' +
    '<p class="portada-pie">' + total + (total === 1 ? ' obra' : ' obras') + ' · ' + fecha + '</p>' +
    '</section>';
}

/* Hoja de índice: 8 obras por página en dos columnas, con la página de cada una */
function hojaIndice(obras, chico, paginaDeObra, numero, totalPaginas) {
  var filas = obras.map(function (o) {
    var img = chico[o.id]
      ? '<img src="' + chico[o.id] + '" alt="' + escaparHTML(o.titulo) + '">'
      : '<span class="indice-sin">—</span>';
    return '<li class="indice-item">' +
      '<span class="indice-mini">' + img + '</span>' +
      '<span class="indice-texto"><span class="indice-nombre">' + escaparHTML(o.titulo) + '</span>' +
      '<span class="indice-puntos"></span>' +
      '<span class="indice-pagina">' + (paginaDeObra[o.id] || '') + '</span></span>' +
      '</li>';
  }).join('');

  return '<section class="hoja indice">' +
    '<div class="indice-cabecera"><h2>Índice</h2>' +
      '<span class="indice-numero">' + numero + ' / ' + totalPaginas + '</span></div>' +
    '<ul class="indice-lista">' + filas + '</ul>' +
    '</section>';
}

/* Hoja que separa las obras de cada serie */
function hojaSerie(grupo) {
  var serie = buscarSerie(grupo.id);
  var tema = serie ? capitalizar(serie.tema) : 'Sin serie';
  var n = grupo.obras.length;
  return '<section class="hoja serie-hoja">' +
    '<p class="serie-etiqueta">Serie</p>' +
    '<h2 class="serie-nombre-grande">' + escaparHTML(tema) + '</h2>' +
    '<p class="serie-cuenta-grande">' + n + (n === 1 ? ' obra' : ' obras') + '</p>' +
    '</section>';
}

function hojaObra(o, imagen, numero, totalPaginas, mostrarPrecios) {
  var serie = buscarSerie(o.serieId);
  var filas = [];
  if (o.anio) filas.push(['Año', String(o.anio)]);
  if (o.tecnica) filas.push(['Técnica', o.tecnica]);
  if (o.materiales) filas.push(['Materiales', o.materiales]);
  var tam = textoTamanoObra(o);
  if (tam) filas.push(['Medidas', tam]);
  filas.push(['Disponibilidad', o.disponible ? 'Disponible' : 'No disponible']);
  if (mostrarPrecios) {
    filas.push(['Precio', o.disponible && o.precio ? formatoMoneda(o.precio) : 'Consultar']);
  }

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
      '<p class="numero">' + numero + ' / ' + totalPaginas + '</p>' +
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
    '.serie-hoja { background: #4a4a4a; color: #fff; flex-direction: column; justify-content: center;',
    '  padding: 0 160px; gap: 16px; }',
    '.serie-etiqueta { margin: 0; font-size: 22px; letter-spacing: .22em; text-transform: uppercase; opacity: .6; }',
    '.serie-nombre-grande { margin: 0; font-size: 96px; font-weight: 400; line-height: 1.05; }',
    '.serie-cuenta-grande { margin: 12px 0 0; font-size: 30px; opacity: .75; }',
    '.indice { flex-direction: column; padding: 84px 140px 70px; }',
    '.indice-cabecera { display: flex; align-items: baseline; justify-content: space-between;',
    '  border-bottom: 2px solid #111; padding-bottom: 16px; }',
    '.indice-cabecera h2 { margin: 0; font-size: 46px; font-weight: 400; letter-spacing: .04em; }',
    '.indice-numero { font-size: 20px; opacity: .5; letter-spacing: .1em; }',
    '.indice-lista { list-style: none; margin: 22px 0 0; padding: 0; display: grid;',
    '  grid-template-columns: 1fr 1fr; column-gap: 64px; align-content: start; }',
    '.indice-item { display: flex; align-items: center; gap: 20px; padding: 12px 0;',
    '  border-bottom: 1px solid #e2e2e2; height: 132px; }',
    '.indice-mini { flex: 0 0 100px; width: 100px; height: 100px; background: #eee; overflow: hidden;',
    '  display: flex; align-items: center; justify-content: center; font-size: 20px; color: #999; }',
    '.indice-mini img { width: 100px; height: 100px; object-fit: cover; display: block; }',
    '.indice-texto { display: flex; align-items: baseline; gap: 8px; flex: 1; min-width: 0; }',
    '.indice-nombre { font-size: 26px; max-width: 72%; white-space: nowrap; overflow: hidden;',
    '  text-overflow: ellipsis; }',
    '.indice-puntos { flex: 1; border-bottom: 1px dotted #c4c4c4; transform: translateY(-5px); }',
    '.indice-pagina { font-size: 24px; min-width: 42px; text-align: right; }',
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
