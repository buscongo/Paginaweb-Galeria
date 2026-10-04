/* ========================================
   server.js — Backend API + servidor estático
   Express + archivo JSON (db.json) como DB
   ======================================== */

var express = require('express');
var fs = require('fs');
var path = require('path');
var app = express();
var PORT = process.env.PORT || 3000;

/* ---- Base de datos: archivo JSON ---- */
var DB_PATH = path.join(__dirname, 'db.json');

function cargarDB() {
  if (!fs.existsSync(DB_PATH)) {
    return { series: [], obras: [], config: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('Error leyendo db.json:', e.message);
    return { series: [], obras: [], config: {} };
  }
}

function guardarDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

/* ---- Middleware ---- */
app.use(express.json({ limit: '50mb' }));

// Archivos estáticos: html/, css/, js/
app.use(express.static('html'));
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/img', express.static('img'));

/* ==== API: OBRAS ==== */

app.get('/api/obras', function (req, res) {
  var db = cargarDB();
  var archivadas = req.query.archivadas === 'true';
  var obras = db.obras.filter(function (o) { return !!o.archivado === archivadas; });
  obras.sort(function (a, b) { return b.fechaRegistro.localeCompare(a.fechaRegistro); });
  res.json(obras);
});

app.get('/api/obras/:id', function (req, res) {
  var db = cargarDB();
  var obra = db.obras.find(function (o) { return o.id === req.params.id; });
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' });
  res.json(obra);
});

app.post('/api/obras', function (req, res) {
  var db = cargarDB();
  var obra = req.body;
  db.obras.push(obra);
  guardarDB(db);
  res.json({ id: obra.id });
});

app.put('/api/obras/:id', function (req, res) {
  var db = cargarDB();
  var idx = db.obras.findIndex(function (o) { return o.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Obra no encontrada' });
  db.obras[idx] = Object.assign({}, db.obras[idx], req.body, { id: req.params.id });
  guardarDB(db);
  res.json({ id: req.params.id });
});

app.delete('/api/obras/:id', function (req, res) {
  var db = cargarDB();
  var idx = db.obras.findIndex(function (o) { return o.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Obra no encontrada' });
  db.obras[idx].archivado = true;
  guardarDB(db);
  res.json({ id: req.params.id });
});

/* ==== API: SERIES ==== */

app.get('/api/series', function (req, res) {
  var db = cargarDB();
  var series = db.series.filter(function (s) { return !s.archivado; });
  series.sort(function (a, b) { return a.tema.localeCompare(b.tema); });
  res.json(series);
});

app.get('/api/series/:id', function (req, res) {
  var db = cargarDB();
  var serie = db.series.find(function (s) { return s.id === req.params.id; });
  if (!serie) return res.status(404).json({ error: 'Serie no encontrada' });
  res.json(serie);
});

app.post('/api/series', function (req, res) {
  var db = cargarDB();
  var serie = req.body;
  db.series.push(serie);
  guardarDB(db);
  res.json({ id: serie.id });
});

app.put('/api/series/:id', function (req, res) {
  var db = cargarDB();
  var idx = db.series.findIndex(function (s) { return s.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Serie no encontrada' });
  db.series[idx] = Object.assign({}, db.series[idx], req.body, { id: req.params.id });
  guardarDB(db);
  res.json({ id: req.params.id });
});

app.delete('/api/series/:id', function (req, res) {
  var db = cargarDB();
  var idx = db.series.findIndex(function (s) { return s.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Serie no encontrada' });
  db.series[idx].archivado = true;
  guardarDB(db);
  res.json({ id: req.params.id });
});

/* ==== API: CONFIG ==== */

app.get('/api/config/:clave', function (req, res) {
  var db = cargarDB();
  res.json({ valor: db.config[req.params.clave] || null });
});

app.post('/api/config/:clave', function (req, res) {
  var db = cargarDB();
  db.config[req.params.clave] = req.body.valor;
  guardarDB(db);
  res.json({ clave: req.params.clave, valor: req.body.valor });
});

/* ==== Servir SPA en rutas desconocidas ==== */
app.use(function (req, res) {
  res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

/* ---- Iniciar ---- */
app.listen(PORT, function () {
  console.log('Servidor corriendo en http://localhost:' + PORT);
  console.log('API: http://localhost:' + PORT + '/api/obras');
  if (!fs.existsSync(DB_PATH)) {
    guardarDB({ series: [], obras: [], config: {} });
    console.log('Base de datos creada: db.json');
  }
});
