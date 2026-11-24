/* galeria-util.js — utilidades de galería compartidas por páginas que no cargan gallery.js
   (por ejemplo la página de exportación). data.js ya aporta t(), formatoMoneda(),
   escaparHTML(), buscarSerie() y las cachés. */

/* Tamaño por suma de lados: pequeño ≤75, mediano ≤178, grande el resto */
function tamanoObra(o) {
  var a = o.ancho, b = o.alto;
  if (!a || !b) return '';
  var p = Number(a) + Number(b);
  if (p <= 75) return 'pequeño';
  if (p <= 178) return 'mediano';
  return 'grande';
}

function capitalizar(txt) {
  return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt;
}

function textoTamanoObra(o) {
  var a = Number(o.ancho) || 0;
  var b = Number(o.alto) || 0;
  if (!a || !b) return '';
  return a + ' × ' + b + ' cm';
}

function poblarSelectTamano(s) {
  if (!s) return;
  s.innerHTML = '<option value="">Todos los tamaños</option>' +
    '<option value="pequeño">Pequeño</option>' +
    '<option value="mediano">Mediano</option>' +
    '<option value="grande">Grande</option>';
}

function normalizarTexto(txt) {
  return String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
