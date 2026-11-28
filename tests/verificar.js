/* tests/verificar.js — Verificación sin navegador de los invariantes del sitio.
   Uso: node tests/verificar.js   (o npm test)

   Comprueba datos, archivos de imagen y coherencia del código estático.
   Las pruebas visuales/interactivas se hacen aparte en el navegador. */

var fs = require('fs');
var path = require('path');

var RAIZ = path.join(__dirname, '..');
var ok = [];
function check(nombre, condicion) { ok.push([nombre, !!condicion]); }

function leer(rel) { return fs.readFileSync(path.join(RAIZ, rel), 'utf8'); }
function existe(rel) { return rel && fs.existsSync(path.join(RAIZ, rel)); }

/* Lee ancho/alto de un JPEG sin dependencias */
function medidasJpeg(rel) {
  var b = fs.readFileSync(path.join(RAIZ, rel));
  var i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xFF) { i++; continue; }
    var m = b[i + 1];
    if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
    if (m === 0xFF) { i++; continue; }
    var len = b.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    }
    i += 2 + len;
  }
  return null;
}

var db = JSON.parse(leer('db.json'));
var obras = db.obras;
var activas = obras.filter(function (o) { return !o.archivada; });

/* ---------- Datos ---------- */
check('db.json tiene obras y series', obras.length > 0 && Array.isArray(db.series) && db.series.length > 0);

var sinPortada = obras.filter(function (o) { return !o.imagen; });
check('todas las obras tienen thumb de portada', sinPortada.length === 0);

var sinHD = obras.filter(function (o) { return !o.imagenHD; });
check('todas las obras tienen imagenHD', sinHD.length === 0);

var portadasRotas = obras.filter(function (o) { return o.imagen && !existe(o.imagen); });
check('todos los thumbs de portada existen en disco', portadasRotas.length === 0);

var hdRotas = obras.filter(function (o) { return o.imagenHD && !existe(o.imagenHD); });
check('todas las imagenHD existen en disco', hdRotas.length === 0);

var mediumRotas = obras.filter(function (o) { return o.imagenMedium && !existe(o.imagenMedium); });
check('todos los imagenMedium declarados existen en disco', mediumRotas.length === 0);

var recortes = obras.filter(function (o) { return o.imagenHD && /_det[_-]/.test(o.imagenHD); });
check('ningún imagenHD apunta a un recorte de detalle', recortes.length === 0);

var detalles = obras.reduce(function (a, o) { return a.concat(o.detalles || []); }, []);
check('todos los detalles tienen thumb y hd', detalles.every(function (d) { return d.thumb && d.hd; }));
check('ningún detalle conserva "full" ni "medium"', detalles.every(function (d) { return !d.full && !d.medium; }));
check('los thumbs y hd de los detalles existen en disco', detalles.every(function (d) { return existe(d.thumb) && existe(d.hd); }));

var duplicados = obras.filter(function (o) {
  return (o.detalles || []).some(function (d) { return d.thumb === o.imagen; });
});
check('ningún detalle duplica la portada', duplicados.length === 0);

var preciosMalos = obras.filter(function (o) {
  var s = db.series.filter(function (x) { return x.id === o.serieId; })[0];
  if (!s || typeof o.precio !== 'number') return false;
  return o.precio !== (o.ancho + o.alto) * s.factorPrecio;
});
check('precio == (ancho + alto) * factorPrecio en todas las obras', preciosMalos.length === 0);

/* Tamaños reales de los thumbs en disco */
var portadas = Object.keys(obras.reduce(function (m, o) { if (o.imagen) m[o.imagen] = 1; return m; }, {}));
var thumbsDetalle = Object.keys(detalles.reduce(function (m, d) { if (d.thumb) m[d.thumb] = 1; return m; }, {}));
function ladoMayor(rel) { var d = medidasJpeg(rel); return d ? Math.max(d.w, d.h) : 0; }
var portadasGrandes = portadas.filter(function (f) { return ladoMayor(f) > 400; });
check('los ' + portadas.length + ' thumbs de portada miden 400 px como máximo', portadasGrandes.length === 0);
var detallesGrandes = thumbsDetalle.filter(function (f) { return ladoMayor(f) > 400; });
check('los ' + thumbsDetalle.length + ' thumbs de detalle miden 400 px como máximo', detallesGrandes.length === 0);

/* HD: 1920 de lado mayor y, si es vertical, 1080 de ancho */
var hd = Object.keys(obras.reduce(function (m, o) {
  if (o.imagenHD) m[o.imagenHD] = 1;
  (o.detalles || []).forEach(function (d) { if (d.hd) m[d.hd] = 1; });
  return m;
}, {}));
var hdFuera = hd.filter(function (f) {
  var d = medidasJpeg(f);
  if (!d) return true;
  if (Math.max(d.w, d.h) > 1920) return true;
  return d.h > d.w && d.w > 1080;
});
check('los ' + hd.length + ' archivos HD respetan 1920 horizontal / 1080 vertical', hdFuera.length === 0);

/* Todas las obras deben tener medium (el modal lo usa siempre) */
var sinMedium = obras.filter(function (o) { return !o.imagenMedium; });
check('todas las obras tienen imagenMedium (modal)', sinMedium.length === 0);
var mediumDef = Object.keys(obras.reduce(function (m, o) { if (o.imagenMedium) m[o.imagenMedium] = 1; return m; }, {}));
var mediumGrandes = mediumDef.filter(function (f) { return ladoMayor(f) > 1200; });
check('los ' + mediumDef.length + ' medium miden 1200 px como máximo', mediumGrandes.length === 0);
check('el modal usa imagenMedium (nunca el HD)', /o\.imagenMedium\|\|o\.imagen/.test(leer('js/gallery.js')) && !/imagenHD/.test(leer('js/gallery.js')));

/* ---------- Código ---------- */
var imagenes = leer('js/imagenes.js');
check('thumb de portada = 400 px', /thumb:\s*400/.test(imagenes));
check('medium = 1200 px', /medium:\s*1200/.test(imagenes));
check('HD horizontal = 1920 px', /ANCHO_HD_HORIZONTAL\s*=\s*1920/.test(imagenes));
check('HD vertical = 1080 px', /ANCHO_HD_VERTICAL\s*=\s*1080/.test(imagenes));
check('existe generarDosTamanos para los detalles', /function generarDosTamanos/.test(imagenes));

var pintura = leer('js/pintura.js');
check('la ficha usa fotos[0].view (medium)', /imgGrande\.src = fotos\[0\]\.view/.test(pintura));
check('el zoom usa el medium, nunca el HD', /zoomImg\.src = \(actual && actual\.view\)/.test(pintura));
check('los detalles entran al carrusel con su medium', /versionMedium\(d\.hd\)/.test(pintura));

var galeria = leer('js/gallery.js');
check('el modal usa imagenMedium con respaldo', /o\.imagenMedium\|\|o\.imagen/.test(galeria));

var servidor = leer('server.js');
check('la subida acepta thumb, medium y hd', /\['thumb', 'medium', 'hd'\]/.test(servidor));
check('las escrituras exigen sesión de admin', /app\.post\('\/api\/obras', requiereAdmin/.test(servidor));
check('las escrituras de series exigen sesión', /app\.post\('\/api\/series', requiereAdmin/.test(servidor));

check('admin.html tiene los dos botones', /id="btn-editar"/.test(leer('html/admin.html')) && /href="subir.html"/.test(leer('html/admin.html')));
check('existe el retrato de la home (3 tamaños)',
  existe('img/retrato_andres_thumb.jpg') && existe('img/retrato_andres_medium.jpg') && existe('img/retrato_andres_hd.jpg'));
check('el hero deja solo el nombre y el statement; la trayectoria pasa al pie',
  /class="home-perfil"/.test(leer('html/index.html')) &&
  /<h2>Sobre mi obra\.<\/h2>/.test(leer('html/index.html')) &&
  /pie-trayectoria[\s\S]{0,400}Trayectoria, 2020 al presente\./.test(leer('html/index.html')) &&
  /perfil-bloque p \{[\s\S]{0,120}max-width: 22rem/.test(leer('css/styles.css')));
check('la home incluye la barra lateral de obra',
  /id="obra-lateral"/.test(leer('html/index.html')) && /js\/obra-lateral\.js/.test(leer('html/index.html')));
check('la barra lateral muestra solo las obras nuevas',
  /imagenMedium/.test(leer('js/obra-lateral.js')) &&
  /var subida = fechaMilisegundos\(o\.fechaRegistro\)/.test(leer('js/obra-lateral.js')) &&
  !/fechaModificacion/.test(leer('js/obra-lateral.js')) &&
  !/etiquetaLateral/.test(leer('js/obra-lateral.js')));
check('no queda marca de «Actualizado» en las tarjetas',
  /var selloActualizado = ''/.test(leer('js/gallery.js')) &&
  !/sello-actualizado">Actualizado/.test(leer('js/gallery.js')));
check('en móvil los filtros se abren con un botón «Filtrar»',
  /id="filtros-toggle"/.test(leer('html/index.html')) && /id="filtros-panel"/.test(leer('html/serie.html')) &&
  /\.filtros-selects\.abierto/.test(leer('css/styles.css')) &&
  /filtros-toggle/.test(leer('js/gallery.js')));
check('el precio no sale en la respuesta pública',
  /delete copia\.precio/.test(leer('server.js')) &&
  /autenticado\(req\) \? obras : obras\.map\(obraPublica\)/.test(leer('server.js')));
check('la ficha abre la ventana de solicitud de precio con asunto prellenado',
  /id="solicitud-overlay"/.test(leer('html/pintura.html')) &&
  /Solicito el precio de la obra: /.test(leer('js/pintura.js')) &&
  /solicitud-nombre/.test(leer('html/pintura.html')) && /solicitud-galeria/.test(leer('html/pintura.html')) &&
  /mailto:buscongo@gmail\.com/.test(leer('js/pintura.js')));
check('las tarjetas usan el degradado y todo el fondo es gris sin hue',
  /\.tarjeta-obra \{[\s\S]{0,400}?linear-gradient\(180deg, #707070 0%, #707070 25%, #333333 100%\)/.test(leer('css/styles.css')) &&
  /\.tarjeta-obra:hover \.tarjeta-info/.test(leer('css/styles.css')) &&
  /--bg-primary: #343434/.test(leer('css/styles.css')) && /--bg-card: #1c1c1c/.test(leer('css/styles.css')) &&
  /--accent: #1d1d1d/.test(leer('css/styles.css')) &&
  /\.disponibilidad-indicator\.Rojo \{\s*background: #4f4f4f/.test(leer('css/styles.css')));
check('el pie de página lleva los datos de contacto en las tres páginas públicas',
  /buscongo@gmail\.com/.test(leer('html/index.html')) && /buscongo_fineart/.test(leer('html/index.html')) &&
  /\(506\) 8348 7471/.test(leer('html/index.html')) && /\.pie-pagina \{/.test(leer('css/styles.css')) &&
  /pie-pagina/.test(leer('html/serie.html')) && /pie-pagina/.test(leer('html/pintura.html')));
check('en móvil la barra lateral es la sección Nueva Obra con una sola obra',
  /max-width: 899px\)[\s\S]{0,200}\.obra-lateral \{\s*position: static/.test(leer('css/styles.css')) &&
  /matchMedia\('\(max-width: 899px\)'\)/.test(leer('js/obra-lateral.js')) &&
  /lista = lista\.slice\(0, 1\)/.test(leer('js/obra-lateral.js')));

check('los filtros llevan título y la disponibilidad ofrece Disponible, Vendido y Ambos',
  /class="filtro-etiqueta">Disponibilidad</.test(leer('html/index.html')) &&
  /class="filtro-etiqueta">Disponibilidad</.test(leer('html/serie.html')) &&
  /t\('ambos'\)/.test(leer('js/home.js')) && /t\('vendido'\)/.test(leer('js/home.js')) &&
  /ambos:'Ambos'/.test(leer('js/data.js')) && /vendido:'Vendido'/.test(leer('js/data.js')));
check('en móvil el modal usa la miniatura y las tarjetas se revelan al pasar el mouse',
  /function imagenParaVista/.test(leer('js/data.js')) && /imagenParaVista\(o\)/.test(leer('js/gallery.js')) &&
  /esPantallaMovil\(\)/.test(leer('js/data.js')) &&
  /\.tarjeta-obra:hover \.tarjeta-info/.test(leer('css/styles.css')));

check('el filtro de disponibilidad vuelve a «Todos»', /'<option value="">' \+ t\('ambos'\)/.test(leer('js/home.js')) &&  /sD\.value === 'true' \|\| sD\.value === 'false'/.test(leer('js/home.js')) &&
  /'<option value="">' \+ t\('todosAños'\)/.test(leer('js/home.js')));
check('la ficha de obra protege las imágenes', /js\/proteger-imagenes\.js/.test(leer('html/pintura.html')) &&
  /contextmenu/.test(leer('js/proteger-imagenes.js')) &&
  /@media print[\s\S]{0,120}#imagen-grande/.test(leer('css/styles.css')));
check('las tarjetas ya no llevan el sello Nuevo',
  !/sello-nuevo/.test(leer('js/gallery.js')) && !/\.sello-nuevo \{/.test(leer('css/styles.css')));
check('todas las páginas comparten el fondo ciruela plano',
  /background-color: var\(--bg-primary\)/.test(leer('css/styles.css')) &&
  /background-image: none/.test(leer('css/styles.css')) &&
  /--bg-primary: #343434/.test(leer('css/styles.css')));
check('la página de exportación tiene la casilla de precios',
  /id="chk-precios"/.test(leer('html/exportar.html')));
check('el documento genera hojas de serie e índice',
  /function hojaSerie/.test(leer('js/exportar.js')) && /function hojaIndice/.test(leer('js/exportar.js')) &&
  /OBRAS_POR_INDICE = 8/.test(leer('js/exportar.js')));
check('la barra lateral va dentro de la columna central, bajo los filtros',
  /class="home-cuerpo"/.test(leer('html/index.html')) &&
  /\.home-cuerpo \{/.test(leer('css/styles.css')) &&
  /position: sticky/.test(leer('css/styles.css')) &&
  /home-cuerpo[\s\S]{0,200}obra-lateral/.test(leer('html/index.html').replace(/\r/g, '')));
check('la barra lateral acumula las obras del último mes',
  /function obrasRecientes/.test(leer('js/obra-lateral.js')) &&
  /obra-lateral-lista/.test(leer('html/index.html')) &&
  /lateral-item/.test(leer('js/obra-lateral.js')));
check('el PDF trae una hoja de perfil antes del índice',
  /function hojaPerfil/.test(leer('js/exportar.js')) &&
  /\{ tipo: 'portada' \}, \{ tipo: 'perfil' \}/.test(leer('js/exportar.js')) &&
  /perfil-foto-pdf/.test(leer('js/exportar.js')));
check('las series se ordenan con Nubes primero y luego por cantidad',
  /function seriesOrdenadas/.test(leer('js/data.js')) &&
  /Nubes/.test(leer('html/index.html')) &&
  leer('html/index.html').indexOf('serie_nubes') < leer('html/index.html').indexOf('serie_vestigio') &&
  /seriesOrdenadas\(cacheSeries/.test(leer('js/home.js')) &&
  /seriesOrdenadas\(cacheSeries/.test(leer('js/admin.js')) &&
  /seriesOrdenadas\(cacheSeries/.test(leer('js/exportar.js')));
check('la columna central incluye el bloque de perfil',
  /\.home-perfil \{[\s\S]{0,400}max-width: calc\(72rem/.test(leer('css/styles.css').replace(/\r/g, '')));
check('el servidor sella fechaModificacion al guardar',
  /obra\.fechaModificacion = ahora\.toISOString\(\)/.test(servidor) && /fechaModificacion: new Date\(\)\.toISOString\(\)/.test(servidor));
check('el admin tiene el tercer botón de exportar',
  /href="exportar\.html"/.test(leer('html/admin.html')) && /Exportar PDF/.test(leer('html/admin.html')));
check('la página de exportación existe y carga sus scripts',
  /id="obras-por-serie"/.test(leer('html/exportar.html')) && /js\/exportar\.js/.test(leer('html/exportar.html')));
check('exportar genera hojas de 1920×1080 con botón de PDF',
  /size: 1920px 1080px/.test(leer('js/exportar.js')) && /window\.print\(\)/.test(leer('js/exportar.js')));
check('/exportar tiene alias propio', /'\/exportar': '\/exportar\.html'/.test(servidor));
check('subir.html carga el formulario', /js\/obra-form\.js/.test(leer('html/subir.html')));
check('editar.html carga el formulario', /js\/obra-form\.js/.test(leer('html/editar.html')));

var css = leer('css/styles.css');
check('CSS balanceado', (css.match(/{/g) || []).length === (css.match(/}/g) || []).length);

['data.js', 'gallery.js', 'home.js', 'pintura.js', 'serie.js', 'admin.js', 'admin-gate.js',
 'obra-form.js', 'imagenes.js', 'subir.js', 'editar.js', 'obra-lateral.js', 'exportar.js',
 'galeria-util.js'].forEach(function (f) {
  check('existe js/' + f, existe('js/' + f));
});

/* ---------- HD privado, medium público ---------- */
var detallesSinMedium = [];
obras.forEach(function (o) {
  (o.detalles || []).forEach(function (d) {
    if (!d || !d.hd) return;
    var media = d.hd.replace(/_hd\.(jpe?g|png|webp)$/i, '_medium.$1');
    if (!existe(media)) detallesSinMedium.push(media);
  });
});
check('cada detalle tiene su versión medium en disco', detallesSinMedium.length === 0);
check('la ficha nunca pide el HD', !/imagenHD/.test(leer('js/pintura.js')) && /versionMedium/.test(leer('js/pintura.js')));
check('el servidor no publica el HD', /function obraPublica/.test(leer('server.js')) &&
  /_hd/.test(leer('server.js')) && /req\.path/.test(leer('server.js')) && /autenticado\(req\)/.test(leer('server.js')) &&
  /obras\.map\(obraPublica\)/.test(leer('server.js')));
check('la exportación a PDF usa el medium', !/imagenHD/.test(leer('js/exportar.js')));
check('el precio se revela con un botón', /id="btn-ver-precio"/.test(leer('html/pintura.html')) &&
  /btnPrecio\.onclick/.test(leer('js/pintura.js')) && /\.btn-ver-precio \{/.test(leer('css/styles.css')));
check('el admin regenera los medium que faltan', /js\/mantener-mediums\.js/.test(leer('html/admin.html')) &&
  /obtenerObras/.test(leer('js/mantener-mediums.js')) && /archivo: p\.media/.test(leer('js/mantener-mediums.js')));
check('la ficha no repite los datos bajo el título',
  !/pintura-meta-texto|pintura-descripcion/.test(leer('html/pintura.html')) &&
  /\.ficha-item \{ display: contents/.test(leer('css/styles.css')) &&
  /\.ficha-tecnica \{[\s\S]{0,120}grid-template-columns: 1fr 2fr/.test(leer('css/styles.css')));

/* ---------- Salida ---------- */
var fallos = 0;
ok.forEach(function (par) {
  console.log((par[1] ? '✅ ' : '❌ ') + par[0]);
  if (!par[1]) fallos++;
});
console.log('\n' + (ok.length - fallos) + '/' + ok.length + ' comprobaciones OK — ' +
  activas.length + ' obras activas de ' + obras.length + ', ' + detalles.length + ' detalles.');
process.exit(fallos ? 1 : 0);

