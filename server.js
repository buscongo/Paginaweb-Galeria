/* ========================================
   server.js — Backend API + servidor estático
   Express + archivo JSON (db.json) como DB
   ======================================== */

var express = require('express');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var app = express();
var PORT = process.env.PORT || 3000;

/* ---- Sesión de administración (cookie) ---- */
var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'andres2026';
var SESIONES = new Set();

function leerCookies(req) {
  var out = {};
  String(req.headers.cookie || '').split(';').forEach(function (p) {
    var i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function autenticado(req) {
  var c = leerCookies(req);
  return !!(c.admin && SESIONES.has(c.admin));
}

function requiereAdmin(req, res, next) {
  if (autenticado(req)) return next();
  res.status(401).json({ error: 'No autorizado' });
}

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
app.use(express.json({ limit: '200mb' }));

// Archivos estáticos: html/, css/, js/
app.use(express.static('html'));
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/img', express.static('img'));

/* ==== API: SESIÓN DE ADMIN ==== */

app.post('/api/login', function (req, res) {
  var pass = String((req.body && req.body.password) || '');
  if (pass !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Contraseña incorrecta' });
  var token = crypto.randomBytes(24).toString('hex');
  SESIONES.add(token);
  res.setHeader('Set-Cookie', 'admin=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400');
  res.json({ ok: true });
});

app.post('/api/logout', function (req, res) {
  var c = leerCookies(req);
  if (c.admin) SESIONES.delete(c.admin);
  res.setHeader('Set-Cookie', 'admin=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/sesion', function (req, res) {
  res.json({ ok: autenticado(req) });
});

/* ==== API: IMÁGENES (el navegador manda los 3 tamaños ya redimensionados) ==== */

app.post('/api/imagenes', requiereAdmin, function (req, res) {
  var body = req.body || {};
  var base = String(body.base || 'obra').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'obra';
  var variante = String(body.variante || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
  var urls = body.urls || {};
  var escritos = {};
  var error = null;

  ['thumb', 'medium', '2k'].forEach(function (k) {
    if (error || !urls[k]) return;
    var m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(urls[k]));
    if (!m) { error = 'Formato de imagen inválido en ' + k; return; }
    var tipo = m[1].toLowerCase();
    var ext = tipo === 'png' ? '.png' : (tipo === 'webp' ? '.webp' : '.jpg');
    var buf = Buffer.from(m[2], 'base64');
    if (buf.length > 12 * 1024 * 1024) { error = 'La imagen ' + k + ' supera 12 MB'; return; }
    var nombre = base + (variante ? '_' + variante : '') + '_' + k + ext;
    try {
      fs.writeFileSync(path.join(__dirname, 'img', nombre), buf);
    } catch (e) {
      error = 'No se pudo escribir ' + nombre + ': ' + e.message;
      return;
    }
    escritos[k] = 'img/' + nombre;
  });

  if (error) return res.status(400).json({ error: error });
  if (!Object.keys(escritos).length) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  res.json(escritos);
});

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

app.post('/api/obras', requiereAdmin, function (req, res) {
  var db = cargarDB();
  var obra = req.body;
  db.obras.push(obra);
  guardarDB(db);
  res.json({ id: obra.id });
});

app.put('/api/obras/:id', requiereAdmin, function (req, res) {
  var db = cargarDB();
  var idx = db.obras.findIndex(function (o) { return o.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Obra no encontrada' });
  db.obras[idx] = Object.assign({}, db.obras[idx], req.body, { id: req.params.id });
  guardarDB(db);
  res.json({ id: req.params.id });
});

app.delete('/api/obras/:id', requiereAdmin, function (req, res) {
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

app.post('/api/series', requiereAdmin, function (req, res) {
  var db = cargarDB();
  var serie = req.body;
  db.series.push(serie);
  guardarDB(db);
  res.json({ id: serie.id });
});

app.put('/api/series/:id', requiereAdmin, function (req, res) {
  var db = cargarDB();
  var idx = db.series.findIndex(function (s) { return s.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Serie no encontrada' });
  db.series[idx] = Object.assign({}, db.series[idx], req.body, { id: req.params.id });
  guardarDB(db);
  res.json({ id: req.params.id });
});

app.delete('/api/series/:id', requiereAdmin, function (req, res) {
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
