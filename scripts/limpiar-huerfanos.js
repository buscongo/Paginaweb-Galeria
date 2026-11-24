/* scripts/limpiar-huerfanos.js — Lista (y opcionalmente borra) imágenes de img/
   que no referencia ninguna obra ni aparece citada en el código.
   Uso:  node scripts/limpiar-huerfanos.js          → solo informa
         node scripts/limpiar-huerfanos.js --borrar → las elimina            */

var fs = require('fs');
var path = require('path');

var RAIZ = path.join(__dirname, '..');
var IMG = path.join(RAIZ, 'img');
var borrar = process.argv.indexOf('--borrar') !== -1;

var db = JSON.parse(fs.readFileSync(path.join(RAIZ, 'db.json'), 'utf8'));

var referenciados = new Set();
db.obras.forEach(function (o) {
  [o.imagen, o.imagenMedium, o.imagenHD].forEach(function (x) {
    if (x) referenciados.add(path.basename(x));
  });
  (o.detalles || []).forEach(function (d) {
    [d.thumb, d.hd].forEach(function (x) {
      if (x) referenciados.add(path.basename(x));
    });
  });
});

/* Texto de todo el código/markup por si algún archivo se cita a mano */
var fuentes = [];
['js', 'html', 'css', 'scripts', 'tests'].forEach(function (dir) {
  var d = path.join(RAIZ, dir);
  if (!fs.existsSync(d)) return;
  fs.readdirSync(d).forEach(function (f) {
    if (/\.(js|html|css)$/.test(f)) fuentes.push(path.join(d, f));
  });
});
['db.json', 'spec.md', 'AGENTS.md'].forEach(function (f) {
  var p = path.join(RAIZ, f);
  if (fs.existsSync(p)) fuentes.push(p);
});
var texto = fuentes.map(function (p) { return fs.readFileSync(p, 'utf8'); }).join('\n');

var huerfanos = fs.readdirSync(IMG).filter(function (f) {
  return !referenciados.has(f);
});

var citados = huerfanos.filter(function (f) { return texto.indexOf(f) !== -1; });
var peso = huerfanos.reduce(function (a, f) { return a + fs.statSync(path.join(IMG, f)).size; }, 0);

console.log('Archivos en img/: ' + fs.readdirSync(IMG).length);
console.log('Sin usar: ' + huerfanos.length + ' (' + (peso / 1048576).toFixed(1) + ' MB)');
if (citados.length) console.log('Citados en el código (NO se tocan): ' + citados.join(', '));

var aBorrar = huerfanos.filter(function (f) { return citados.indexOf(f) === -1; });

if (!borrar) {
  console.log(aBorrar.slice(0, 20).join('\n'));
  console.log('... (usa --borrar para eliminarlos)');
  process.exit(0);
}

var n = 0, mb = 0;
aBorrar.forEach(function (f) {
  var p = path.join(IMG, f);
  mb += fs.statSync(p).size;
  fs.unlinkSync(p);
  n++;
});
console.log('Eliminados: ' + n + ' archivos (' + (mb / 1048576).toFixed(1) + ' MB)');
console.log('Quedan en img/: ' + fs.readdirSync(IMG).length);
