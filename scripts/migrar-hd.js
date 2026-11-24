/* scripts/migrar-hd.js — Pasa el esquema antiguo (_2k por todas partes) al nuevo:
     obra.imagen2k        → obra.imagenHD
     detalles[].full      → detalles[].hd
     detalles[].medium    → se elimina (los detalles ya solo tienen thumb + hd)
     img/*_2k.jpg         → img/*_hd.jpg
   Uso: node scripts/migrar-hd.js                                          */

var fs = require('fs');
var path = require('path');

var RAIZ = path.join(__dirname, '..');
var IMG = path.join(RAIZ, 'img');
var DB_PATH = path.join(RAIZ, 'db.json');

/* 1. Renombrar archivos */
var renombrados = 0, yaExistian = 0;
fs.readdirSync(IMG).forEach(function (nombre) {
  if (!/_2k\.[a-z]+$/i.test(nombre)) return;
  var nuevo = nombre.replace(/_2k(\.[a-z]+)$/i, '_hd$1');
  var desde = path.join(IMG, nombre);
  var hasta = path.join(IMG, nuevo);
  if (fs.existsSync(hasta)) { yaExistian++; return; }
  fs.renameSync(desde, hasta);
  renombrados++;
});

/* 2. Ajustar db.json */
var db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
var aHd = function (rel) { return rel ? rel.replace(/_2k(\.[a-z]+)$/i, '_hd$1') : rel; };
var obras = 0, detalles = 0;

db.obras.forEach(function (o) {
  if (o.imagen2k) {
    o.imagenHD = aHd(o.imagen2k);
    delete o.imagen2k;
    obras++;
  }
  (o.detalles || []).forEach(function (d) {
    var base = d.hd || d.full;
    if (base) {
      d.hd = aHd(base);
      delete d.full;
      delete d.medium;
      detalles++;
    }
  });
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log('Archivos *_2k → *_hd renombrados: ' + renombrados + ' (ya existían: ' + yaExistian + ')');
console.log('Obras con imagenHD: ' + obras + ' / ' + db.obras.length);
console.log('Detalles con hd: ' + detalles);
