/* imagenes.js — Redimensiona en el navegador y genera los 3 tamaños de cada foto.
   thumb  400 px  → tarjetas
   medium 1200 px → modal y página de detalle
   2k     2048 px → imagen ampliada (zoom)                                     */

var TAMANOS_IMAGEN = { thumb: 400, medium: 1200, '2k': 2048 };

function cargarImagenArchivo(file) {
  return new Promise(function (resolver, rechazar) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { URL.revokeObjectURL(url); resolver(img); };
    img.onerror = function () { URL.revokeObjectURL(url); rechazar(new Error('No se pudo leer ' + file.name)); };
    img.src = url;
  });
}

function redimensionarImagen(img, maxLado, calidad) {
  var w = img.naturalWidth;
  var h = img.naturalHeight;
  var escala = Math.min(1, maxLado / Math.max(w, h));
  var cw = Math.max(1, Math.round(w * escala));
  var ch = Math.max(1, Math.round(h * escala));
  var canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, cw, ch);
  return canvas.toDataURL('image/jpeg', calidad);
}

/* Devuelve { thumb, medium, '2k' } en data URLs JPEG */
async function generarTresTamanos(file) {
  var img = await cargarImagenArchivo(file);
  return {
    thumb: redimensionarImagen(img, TAMANOS_IMAGEN.thumb, 0.80),
    medium: redimensionarImagen(img, TAMANOS_IMAGEN.medium, 0.85),
    '2k': redimensionarImagen(img, TAMANOS_IMAGEN['2k'], 0.88)
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
