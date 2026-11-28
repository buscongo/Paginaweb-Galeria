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
  document.getElementById('campo-nombre').addEventListener('input', function () {
    revisarNombre(this.value);
  });

  actualizarBarra();
}

function poblarFiltrosExportar() {
  var selSerie = document.getElementById('filtro-serie');
  selSerie.innerHTML = '<option value="">Todas las series</option>' +
    seriesOrdenadas(cacheSeries, obrasExp).map(function (s) {
      return '<option value="' + escaparHTML(s.id) + '">' + escaparHTML(s.tema) + '</option>';
    }).join('');

  var anos = {};
  obrasExp.forEach(function (o) { if (o.anio) anos[o.anio] = true; });
  document.getElementById('filtro-ano').innerHTML = '<option value="">Todos los años</option>' +
    Object.keys(anos).sort(function (a, b) { return b - a; }).map(function (a) {
      return '<option value="' + escaparHTML(a) + '">' + escaparHTML(a) + '</option>';
    }).join('');

  document.getElementById('filtro-disponibilidad').innerHTML =
    '<option value="">Ambos</option><option value="true">Disponible</option><option value="false">Vendido</option>';

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
  var ordenExp = seriesOrdenadas(cacheSeries, obrasExp).map(function (s) { return s.id; });
  Object.keys(grupos).forEach(function (id) { if (ordenExp.indexOf(id) === -1) ordenExp.push(id); });
  ordenExp.forEach(function (serieId) {
    if (!grupos[serieId]) return;
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
    var perfil = await leerPerfil();
    var html = construirDocumento(nombre, obras, imagenes, {
      precios: mostrarPrecios,
      perfil: perfil,
      /* si el documento ya está filtrado, ese dato no se repite en cada ficha */
      omitir: { anio: !!filtrosExp.ano, disponible: filtrosExp.disponible !== '' }
    });
    abrirDocumento(html);
    cerrarModalNombre();
  } catch (e) {
    estado.textContent = 'No se pudo generar: ' + (e && e.message ? e.message : e);
  } finally {
    boton.disabled = false;
  }
}

/* Lee el retrato, el statement y el curriculum de la home para no duplicarlos */
async function leerPerfil() {
  var perfil = { nombre: 'Andrés Ramírez Ortiz', statement: '', curriculum: [] };
  try {
    var html = await (await fetch('index.html')).text();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var nombre = doc.querySelector('.perfil-nombre');
    var st = doc.querySelector('.perfil-bloque p');
    var lis = doc.querySelectorAll('.perfil-lista li');
    if (nombre && nombre.textContent.trim()) perfil.nombre = nombre.textContent.trim();
    if (st) perfil.statement = st.textContent.replace(/\s+/g, ' ').trim();
    perfil.curriculum = Array.prototype.map.call(lis, function (li) {
      return li.textContent.replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
  } catch (e) {
    console.warn('No se pudo leer el perfil de la home:', e.message);
  }
  return perfil;
}

/* Convierte cada imagen en data URL para que el archivo generado funcione solo.
   Se guardan dos versiones por obra: la grande (hoja) y el thumb (índice),
   más el retrato que va en la hoja de perfil. */
async function prepararImagenes(obras) {
  var salida = { grande: {}, chico: {}, retrato: '' };
  for (var i = 0; i < obras.length; i++) {
    var o = obras[i];
    salida.grande[o.id] = await embeber(o.imagenMedium || o.imagen);
    salida.chico[o.id] = await embeber(o.imagen || o.imagenMedium);
  }
  /* el retrato del hero, el mismo de la portada del sitio */
  salida.retrato = await embeber('img/retrato_hero_medium.jpg');
  if (!salida.retrato) salida.retrato = await embeber('img/retrato_hero_thumb.jpg');
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
  var secciones = [{ tipo: 'portada' }, { tipo: 'perfil' }];

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
  seriesOrdenadas(cacheSeries, obrasExp).forEach(function (s, i) { posicion[s.id] = i; });
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
  var omitir = (opciones && opciones.omitir) || {};
  var hoy = new Date();
  var fecha = hoy.getDate() + '/' + (hoy.getMonth() + 1) + '/' + hoy.getFullYear();
  obras = ordenarObras(obras);
  var total = obras.length;
  var plan = planificarSecciones(obras);
  var totalPaginas = plan.secciones.length;

  var hojas = plan.secciones.map(function (s) {
    if (s.tipo === 'portada') return portada(nombre, total, fecha, imagenes.retrato);
    if (s.tipo === 'perfil') return hojaPerfil(opciones.perfil);
    if (s.tipo === 'indice') {
      return hojaIndice(plan.ordenObras.slice(s.desde, s.desde + OBRAS_POR_INDICE),
        imagenes.chico, plan.paginaDeObra, s.numero, totalPaginas);
    }
    if (s.tipo === 'serie') return hojaSerie(s.grupo);
    return hojaObra(s.obra, imagenes.grande[s.obra.id], s.numero, totalPaginas, precios, omitir);
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

/* Hoja de perfil: retrato en un tercio, statement y curriculum en los dos tercios */
function hojaPerfil(perfil) {
  var p = perfil || {};
  var nombre = p.nombre || 'Andrés Ramírez Ortiz';
  var statement = p.statement || '';
  var curriculum = p.curriculum || [];
  /* cada línea: la fecha en una columna y el texto en otra, sin que se meta debajo */
  var lis = curriculum.map(function (x) {
    var m = String(x).match(/^\s*(\d{4}(?:\s*[-–]\s*\d{4})?)\s*[-–:.]?\s*([\s\S]*)$/);
    var anio = m ? m[1].replace(/\s+/g, '') : '';
    var texto = m ? m[2] : x;
    return '<li>' +
      '<span class="tray-anio">' + escaparHTML(anio) + '</span>' +
      '<span class="tray-texto">' + escaparHTML(texto) + '</span>' +
      '</li>';
  }).join('');

  /* cada punto del texto va como párrafo aparte */
  var puntos = String(statement).split(/\n+/).join(' ').match(/[^.]+\.[^.]*|.+$/g) || [];
  var parrafos = puntos
    .map(function (x) { return x.trim(); })
    .filter(Boolean)
    .map(function (x) { return '<p>' + escaparHTML(x) + '</p>'; })
    .join('');

  /* sin foto ni nombre: solo los dos textos, uno al lado del otro y centrados */
  return '<section class="hoja perfil-hoja">' +
    '<div class="perfil-texto">' +
      '<div class="perfil-columnas">' +
        '<div class="perfil-col perfil-col-obra"><h2>Sobre mi obra.</h2>' + parrafos + '</div>' +
        '<div class="perfil-col"><h2>Trayectoria, 2021 al presente.</h2><ul>' + lis + '</ul></div>' +
      '</div>' +
    '</div>' +
  '</section>';
}

function portada(nombre, total, fecha, retrato) {
  return '<section class="hoja portada">' +
    '<div class="portada-foto">' +
      (retrato ? '<img src="' + retrato + '" alt="Andrés Ramírez Ortiz">' : '') +
    '</div>' +
    '<div class="portada-texto">' +
      '<h1 class="portada-nombre">Andrés Ramírez Ortiz</h1>' +
      '<p class="portada-obra">Obra ' + escaparHTML(nombre) + '</p>' +
      '<p class="portada-pie">' + total + (total === 1 ? ' obra' : ' obras') + ' · ' + fecha + '</p>' +
    '</div>' +
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

function hojaObra(o, imagen, numero, totalPaginas, mostrarPrecios, omitir) {
  var serie = buscarSerie(o.serieId);
  var omit = omitir || {};
  var filas = [];
  if (o.anio && !omit.anio) filas.push(['Año', String(o.anio)]);
  if (o.tecnica) filas.push(['Técnica', o.tecnica]);
  var matExtra = materialesDeObra(o);
  if (matExtra) filas.push(['Materiales', matExtra]);
  var tam = textoTamanoObra(o);
  if (tam) filas.push(['Medidas', tam]);
  if (!omit.disponible) filas.push(['Disponibilidad', o.disponible ? 'Disponible' : 'No disponible']);
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
    'html, body { margin: 0; padding: 0; background: #bfbfbf; }',   /* gris claro detrás de las hojas */
    'body { font-family: "GFS Didot", Georgia, "Times New Roman", serif; color: #111; padding-top: 56px; }',
    '.barra { position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 10; display: flex;',
    '  align-items: center; gap: 24px; padding: 0 24px; background: #111; color: #fff; font-size: 14px; }',
    '.barra-titulo { letter-spacing: .08em; text-transform: uppercase; }',
    '.barra-nota { opacity: .6; font-size: 12px; }',
    '.barra-boton { margin-left: auto; padding: 10px 22px; background: #fff; color: #111; border: 0;',
    '  font-family: inherit; font-size: 14px; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; }',
    '.hoja { width: 1920px; height: 1080px; position: relative; overflow: hidden; background: #fff;',
    '  margin: 0 auto; display: flex; }',
    /* portada y presentación con el diseño de la página de inicio */
    '.portada { background: #343434; color: #fff; display: grid; grid-template-columns: 884px 1036px; }',
    '.portada-foto { grid-column: 1; background: #232323; overflow: hidden; }',
    '.portada-foto img { width: 100%; height: 100%; object-fit: cover; object-position: 35% 45%; display: block; }',
    '.portada-texto { grid-column: 2; background: #232323; padding: 0 96px; display: flex;',
    '  flex-direction: column; justify-content: center; gap: 22px; }',
    '.portada-nombre { margin: 0; font-size: 66px; font-weight: 400; line-height: 1.1;',
    '  letter-spacing: .05em; text-transform: uppercase; }',
    '.portada-obra { margin: 0; font-size: 40px; opacity: .92; }',
    '.portada-pie { margin: 26px 0 0; font-size: 19px; opacity: .6; letter-spacing: .16em; text-transform: uppercase; }',
    '.perfil-hoja { background: #343434; color: #fff; display: flex; align-items: center; justify-content: center; }',
    '.perfil-texto { width: 1920px; padding: 90px 150px; display: flex; align-items: center; justify-content: center; background: #232323; }',
    '.perfil-columnas { display: grid; grid-template-columns: 700px 700px; gap: 90px; align-content: center; }',
    '.perfil-col { padding: 0; }',
    '.perfil-col h2 { margin: 0 0 14px; font-size: 15px; letter-spacing: .2em; text-transform: uppercase;',
    '  opacity: .45; font-weight: 400; }',
    '.perfil-col p { margin: 0 0 10px; font-size: 17px; line-height: 1.62; color: #e6e6e6; }',
    '.perfil-col p:last-child { margin-bottom: 0; }',
    '.perfil-col-obra { text-align: right; }',
    '.perfil-col-obra h2 { text-align: right; }',
    '.perfil-col ul { margin: 0; padding: 0; list-style: none; }',
    '.perfil-col li { display: grid; grid-template-columns: 118px 1fr; gap: 14px; align-items: baseline;',
    '  font-size: 14.5px; line-height: 1.4; padding: 6px 0; border-top: 1px solid rgba(255, 255, 255, .16); color: #dcdcdc; }',
    '.tray-anio { color: #ffffff; white-space: nowrap; font-variant-numeric: tabular-nums; }',
    '.tray-texto { display: block; }',
    '.perfil-col li:first-child { border-top: none; padding-top: 0; }',
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

/* ---------- Aviso de posibles typos en el nombre del documento ----------

   Diccionario propio: palabras del sitio (títulos, series), vocabulario de
   pintura y palabras corrientes en español. Se compara sin tildes y se avisa
   cuando una palabra está a una sola letra de distancia de otra conocida. */

var VOCABULARIO_BASE = [
  /* lo que suele escribir en el nombre */
  'obra', 'obras', 'serie', 'series', 'coleccion', 'catalogo', 'seleccion',
  'exposicion', 'exposiciones', 'muestra', 'portafolio', 'documento', 'andres',
  'ramirez', 'ortiz', 'artista', 'galeria', 'museo', 'feria', 'bienal',
  /* pintura */
  'oleo', 'acrilico', 'tecnica', 'tecnica mixta', 'lienzo', 'canvas', 'tela',
  'madera', 'papel', 'carbon', 'grafito', 'acuarela', 'tinta', 'pigmento',
  'barniz', 'marco', 'bastidor', 'medidas', 'ancho', 'alto', 'centimetros',
  'pintura', 'dibujo', 'grabado', 'collage', 'instalacion', 'escultura',
  'disponible', 'vendido', 'vendida', 'reservado', 'precio', 'solicitud',
  /* meses y palabras de fecha */
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'setiembre', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'ano', 'anos',
  /* corrientes en español */
  'sobre', 'entre', 'desde', 'hasta', 'para', 'por', 'con', 'sin', 'los', 'las',
  'del', 'una', 'uno', 'unos', 'unas', 'que', 'como', 'mas', 'muy', 'todo',
  'todos', 'todas', 'parte', 'nuevo', 'nueva', 'grande', 'pequeno', 'pequena',
  'azul', 'rojo', 'verde', 'amarillo', 'negro', 'blanco', 'gris', 'dorado',
  'plata', 'tierra', 'cielo', 'nube', 'nubes', 'atardecer', 'amanecer', 'noche',
  'dia', 'mar', 'playa', 'bosque', 'montana', 'ciudad', 'figura', 'retrato',
  'autorretrato', 'rostro', 'cuerpo', 'memoria', 'tiempo', 'luz', 'sombra',
  'color', 'textura', 'forma', 'espacio', 'silencio', 'paisaje', 'vestigio',
  'selfie', 'exploradores', 'reflexion', 'reflexiones', 'proceso', 'tema',
  'costa', 'rica', 'jose', 'san', 'temporal', 'salita', 'casa', 'estudio',
  'rambar', 'galeria nacional', 'talentum', 'abra', 'croma', 'vitrina', 'islita',
  'steinvorth', 'catalinas', 'museo de costa rica', 'ministerio', 'cultura'
];

var PALABRAS_NOMBRE = {
  'andres': 'Andrés',
  'andes': 'Andrés',
  'ramirez': 'Ramírez',
  'ortiz': 'Ortiz',
  'coleccion': 'Colección',
  'seleccion': 'Selección',
  'exposicion': 'Exposición',
  'exposiciones': 'Exposiciones',
  'catalogo': 'Catálogo',
  'galeria': 'Galería',
  'tecnica': 'Técnica',
  'oleo': 'Óleo',
  'acrilico': 'Acrílico',
  'carbon': 'Carbón',
  'ano': 'año',
  'anos': 'años',
  'mas': 'más',
  'dia': 'día',
  'dia': 'día',
  'reflexion': 'Reflexión',
  'reflexiones': 'Reflexiones',
  'pequeno': 'Pequeño',
  'pequena': 'Pequeña',
  'montana': 'Montaña',
  'jose': 'José',
  'temporal': 'Temporal',
  'nacional': 'Nacional'
};

/* Vocabulario vivo: lo que hay en el sitio + la base */
var VOCAB = {};

function normPalabra(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ]/g, '');
}

function cargarVocabulario() {
  function sumar(frase, formaBuena) {
    String(frase || '').split(/\s+/).forEach(function (w) {
      var n = normPalabra(w);
      if (n.length > 1 && !VOCAB[n]) VOCAB[n] = formaBuena || w;
    });
  }

  VOCABULARIO_BASE.forEach(function (w) { sumar(w); });

  /* títulos y series del catálogo */
  (obrasExp || []).forEach(function (o) {
    sumar(o.titulo);
    var s = buscarSerie(o.serieId);
    if (s && s.tema) sumar(s.tema);
  });
  (cacheSeries || []).forEach(function (s) { if (s.tema) sumar(s.tema); });
}

/* Distancia de edición limitada a 1 (incluye letras intercambiadas) */
function aUnaLetra(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  var i = 0, j = 0, fallos = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++fallos > 1) return false;
    if (a.length > b.length) { i++; }
    else if (a.length < b.length) { j++; }
    else if (a[i + 1] === b[j]) { i++; }          /* letra de más en a */
    else if (a[i] === b[j + 1]) { j++; }          /* letra de más en b */
    else { i++; j++; }                            /* letra cambiada */
  }
  return true;
}

function parecidaConVocabulario(palabra) {
  var n = normPalabra(palabra);
  if (!n || n.length < 4) return null;
  if (VOCAB[n]) return null;
  if (/\d/.test(palabra)) return null;

  var mejor = null;
  var primera = n.charAt(0);
  for (var clave in VOCAB) {
    if (!VOCAB.hasOwnProperty(clave)) continue;
    if (Math.abs(clave.length - n.length) > 1) continue;
    if (clave.charAt(0) !== primera) continue;    /* casi siempre empieza igual */
    if (!aUnaLetra(n, clave)) continue;
    /* manda la palabra del mismo largo: «Nubse» → «Nubes», no «Nube» */
    if (!mejor || clave.length === n.length) {
      mejor = VOCAB[clave];
      if (clave.length === n.length) break;
    }
  }
  return mejor;
}

/* Devuelve el nombre corregido, o null si no hay nada que avisar */
function revisarNombrePDF(valor) {
  var original = String(valor || '');
  if (!original.trim()) return null;

  if (!Object.keys(VOCAB).length) cargarVocabulario();

  /* espacios de más y palabras repetidas seguidas */
  var limpio = original.replace(/\s+/g, ' ').trim();
  limpio = limpio.replace(/\b(\p{L}+)( \1\b)+/giu, '$1');

  limpio = limpio.split(' ').map(function (palabra) {
    var limpia = palabra.replace(/[.,;:!?¡¿"']/g, '');
    var clave = normPalabra(limpia);
    if (!clave) return palabra;

    /* tilde o forma conocida */
    var buena = PALABRAS_NOMBRE[clave];
    if (buena && clave === normPalabra(buena) && limpia !== buena) {
      if (limpia === limpia.toUpperCase() && limpia.length > 2) return buena.toUpperCase();
      return buena.charAt(0).toUpperCase() === limpia.charAt(0)
        ? buena.charAt(0).toUpperCase() + buena.slice(1)
        : buena;
    }

    /* una letra de diferencia con una palabra del sitio: casi seguro un typo */
    var parecida = parecidaConVocabulario(limpia);
    if (parecida) {
      /* recupera la tilde si la conocemos */
      parecida = PALABRAS_NOMBRE[normPalabra(parecida)] || parecida;
      if (limpia.charAt(0) === limpia.charAt(0).toUpperCase()) {
        return parecida.charAt(0).toUpperCase() + parecida.slice(1);
      }
      return parecida;
    }

    return palabra;
  }).join(' ');

  if (limpio === original) return null;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function revisarNombre(valor) {
  var aviso = document.getElementById('modal-nombre-aviso');
  if (!aviso) return;

  var sugerencia = revisarNombrePDF(valor);
  if (!sugerencia) {
    aviso.hidden = true;
    aviso.innerHTML = '';
    return;
  }

  aviso.hidden = false;
  aviso.innerHTML = '¿Quisiste decir «' + escaparHTML(sugerencia) + '»? ' +
    '<button type="button" class="aviso-usar" id="aviso-usar">Usar esa versión</button>';

  var btn = document.getElementById('aviso-usar');
  if (btn) {
    btn.addEventListener('click', function () {
      var campo = document.getElementById('campo-nombre');
      campo.value = sugerencia;
      revisarNombre(sugerencia);
      campo.focus();
    });
  }
}
