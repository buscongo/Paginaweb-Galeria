/* scripts/migrar-medium.js — Completa obra.imagenMedium y detalles[].medium
   a partir de los archivos _medium.jpg que ya existen en img/.
   Uso: node scripts/migrar-medium.js                                          */

var fs = require('fs');
var path = require('path');

var RAIZ = path.join(__dirname, '..');
var DB_PATH = path.join(RAIZ, 'db.json');

var db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
var existe = function (rel) { return rel && fs.existsSync(path.join(RAIZ, rel)); };

function mediumDe(rel) {
  if (!rel) return null;
  var candidato = rel.replace(/_2k(\.[a-z]+)$/i, '_medium$1');
  if (candidato === rel) return null;          // no venía de un 2k: no hay medium derivable
  return existe(candidato) ? candidato : null;
}

var obras = 0, detalles = 0;

db.obras.forEach(function (o) {
  // Recalcula desde cero: evita valores puestos a mano o incorrectos
  delete o.imagenMedium;
  var m = mediumDe(o.imagen2k);
  if (m) { o.imagenMedium = m; obras++; }

  (o.detalles || []).forEach(function (d) {
    delete d.medium;
    var md = mediumDe(d.full);
    if (md) { d.medium = md; detalles++; }
  });
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log('Obras con imagenMedium asignada: ' + obras);
console.log('Detalles con medium asignado: ' + detalles);
console.log('Total obras: ' + db.obras.length);
