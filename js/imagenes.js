/* imagenes.js — Redimensiona en el navegador (canvas) las versiones que se guardan.

   IMAGEN PRINCIPAL → 3 tamaños
     thumb   400 px de lado mayor  → tarjetas
     medium 1200 px de lado mayor  → modal y página de detalle
     hd        horizontal: 1920 px de ancho
               vertical:   1080 px de ancho  → al hacer zoom

   FOTOS DE DETALLE → 2 tamaños
     thumb  400 px de lado mayor → tira de miniaturas en la ficha
     hd     misma regla que la principal → al elegirla para ver

   Nunca se amplía una imagen: si el original es menor, se guarda tal cual. */

var TAMANOS_IMAGEN = { thumb: 400, medium: 1200, detalleThumb: 400 };
var ANCHO_HD_HORIZONTAL = 1920;
var ANCHO_HD_VERTICAL = 1080;

function cargarImagenArchivo(file) {
  return new Promise(function (resolver, rechazar) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { URL.revokeObjectURL(url); resolver(img); };
    img.onerror = function () { URL.revokeObjectURL(url); rechazar(new Error('No se pudo leer ' + file.name)); };
    img.src = url;
  });
}

/* Dibuja la imagen con un ancho/alto dados y devuelve un data URL JPEG */
function dibujarRedimensionada(img, cw, ch, calidad) {
  var canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, cw, ch);
  return canvas.toDataURL('image/jpeg', calidad);
}

/* Escala por lado mayor (sin ampliar) */
function redimensionarLado(img, maxLado, calidad) {
  var w = img.naturalWidth, h = img.naturalHeight;
  var escala = Math.min(1, maxLado / Math.max(w, h));
  return dibujarRedimensionada(img, Math.max(1, Math.round(w * escala)), Math.max(1, Math.round(h * escala)), calidad);
}

/* HD: horizontal conserva 1920 de ancho; vertical se limita a 1080 de ancho.
   En ambos casos se respeta la orientación y nunca se amplía. */
function redimensionarHD(img, calidad) {
  var w = img.naturalWidth, h = img.naturalHeight;
  var objetivo = (w >= h) ? ANCHO_HD_HORIZONTAL : ANCHO_HD_VERTICAL;
  var escala = Math.min(1, objetivo / w, 1920 / h);
  return dibujarRedimensionada(img, Math.max(1, Math.round(w * escala)), Math.max(1, Math.round(h * escala)), calidad);
}

/* Imagen principal: { thumb, medium, hd } */
async function generarTresTamanos(file) {
  var img = await cargarImagenArchivo(file);
  return {
    thumb: redimensionarLado(img, TAMANOS_IMAGEN.thumb, 0.80),
    medium: redimensionarLado(img, TAMANOS_IMAGEN.medium, 0.85),
    hd: redimensionarHD(img, 0.88)
  };
}

/* Foto de detalle: { thumb, hd } */
async function generarDosTamanos(file) {
  var img = await cargarImagenArchivo(file);
  return {
    thumb: redimensionarLado(img, TAMANOS_IMAGEN.detalleThumb, 0.80),
    hd: redimensionarHD(img, 0.88)
  };
}

/* Nombre de archivo seguro a partir del título */
function slugArchivo(texto) {
  var s = String(texto || 'obra').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'obra';
}
