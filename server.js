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
var SESIONES = new Map();                       // token -> última actividad (ms)
var SESION_TTL = (Number(process.env.SESION_TTL_MIN) || 5) * 60 * 1000;   // 5 min sin actividad

/* Límite de intentos de contraseña: 8 fallos por IP cada 15 minutos */
var INTENTOS = new Map();                       // ip -> { fallos, hasta }
var MAX_INTENTOS = 8;
var VENTANA_INTENTOS = 15 * 60 * 1000;

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
  var token = c.admin;
  if (!token || !SESIONES.has(token)) return false;
  if (Date.now() - SESIONES.get(token) > SESION_TTL) {
    SESIONES.delete(token);
    return false;
  }
  SESIONES.set(token, Date.now());   // cada petición renueva los 5 minutos
  return true;
}

function requiereAdmin(req, res, next) {
  if (autenticado(req)) return next();
  res.status(401).json({ error: 'No autorizado' });
}

/* ---- Base de datos: archivo JSON ----
   DATA_DIR permite guardar fuera del código desplegado (en Render el sistema de
   archivos se reinicia en cada deploy). Por defecto sigue en la carpeta del proyecto. */
var DATA_DIR = process.env.DATA_DIR || __dirname;
var IMG_DIR = path.join(DATA_DIR, 'img');
var DB_PATH = path.join(DATA_DIR, 'db.json');

/* Primer arranque con DATA_DIR: copia la base y las imágenes que vienen en el repo */
function sembrarDatos() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

    if (!fs.existsSync(DB_PATH)) {
      var origen = path.join(__dirname, 'db.json');
      if (fs.existsSync(origen)) {
        fs.copyFileSync(origen, DB_PATH);
        console.log('db.json copiada a ' + DB_PATH);
      } else {
        guardarDB({ series: [], obras: [], config: {} });
      }
    }

    var origenImg = path.join(__dirname, 'img');
    if (DATA_DIR !== __dirname && fs.existsSync(origenImg)) {
      var copiadas = 0;
      fs.readdirSync(origenImg).forEach(function (f) {
        var destino = path.join(IMG_DIR, f);
        if (!fs.existsSync(destino)) {
          fs.copyFileSync(path.join(origenImg, f), destino);
          copiadas++;
        }
      });
      if (copiadas) console.log('Imágenes copiadas a DATA_DIR: ' + copiadas);
    }
  } catch (e) {
    console.error('No se pudo preparar DATA_DIR:', e.message);
  }
}

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

/* Una imagen puede estar en DATA_DIR (subida desde el admin) o en el repo */
function existeImagen(rel) {
  return fs.existsSync(path.join(DATA_DIR, rel)) || fs.existsSync(path.join(__dirname, rel));
}

/* ---- Middleware ---- */
app.use(express.json({ limit: '200mb' }));

// Archivos estáticos: html/, css/, js/
app.use(express.static('html'));
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/img', express.static(IMG_DIR));
app.use('/img', express.static(path.join(__dirname, 'img')));

/* ==== API: SESIÓN DE ADMIN ==== */

app.post('/api/login', function (req, res) {
  var ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  var ahora = Date.now();
  var reg = INTENTOS.get(ip);

  if (reg && reg.hasta > ahora && reg.fallos >= MAX_INTENTOS) {
    var faltan = Math.ceil((reg.hasta - ahora) / 60000);
    return res.status(429).json({ error: 'Demasiados intentos. Probá en ' + faltan + ' minuto(s).' });
  }
  if (reg && reg.hasta <= ahora) INTENTOS.delete(ip);

  var pass = String((req.body && req.body.password) || '');
  if (pass !== ADMIN_PASSWORD) {
    var r = INTENTOS.get(ip) || { fallos: 0, hasta: ahora + VENTANA_INTENTOS };
    r.fallos++;
    r.hasta = ahora + VENTANA_INTENTOS;
    INTENTOS.set(ip, r);
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  INTENTOS.delete(ip);
  var token = crypto.randomBytes(24).toString('hex');
  SESIONES.set(token, ahora);
  res.setHeader('Set-Cookie', 'admin=' + token + '; Path=/; HttpOnly; SameSite=Lax');
  res.json({ ok: true, minutos: SESION_TTL / 60000 });
});

app.post('/api/logout', function (req, res) {
  var c = leerCookies(req);
  if (c.admin) SESIONES.delete(c.admin);
  res.setHeader('Set-Cookie', 'admin=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/sesion', function (req, res) {
  var ok = autenticado(req);
  res.json({ ok: ok, minutos: SESION_TTL / 60000 });
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

  /* Reescritura de un archivo ya existente (para regenerar tamaños antiguos).
     Solo permite sobreescribir img/*_thumb.jpg o img/*_hd.jpg que ya existan,
     y solo con el tamaño que corresponde a ese sufijo. */
  var archivoExacto = null;
  var claveExacta = null;
  if (body.archivo) {
    var rel = String(body.archivo).replace(/\\/g, '/').replace(/^\/+/, '');
    if (/^img\/[A-Za-z0-9._\- ]+_thumb\.jpg$/.test(rel)) claveExacta = 'thumb';
    else if (/^img\/[A-Za-z0-9._\- ]+_medium\.jpg$/.test(rel)) claveExacta = 'medium';
    else if (/^img\/[A-Za-z0-9._\- ]+_hd\.jpg$/.test(rel)) claveExacta = 'hd';
    else return res.status(400).json({ error: 'Ruta no permitida: ' + rel });
    if (!existeImagen(rel) && claveExacta !== 'medium') {
      return res.status(400).json({ error: 'El archivo no existe: ' + rel });
    }
    archivoExacto = path.basename(rel);
  }

  ['thumb', 'medium', 'hd'].forEach(function (k) {
    if (error || !urls[k]) return;
    var m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(urls[k]));
    if (!m) { error = 'Formato de imagen inválido en ' + k; return; }
    var tipo = m[1].toLowerCase();
    var ext = tipo === 'png' ? '.png' : (tipo === 'webp' ? '.webp' : '.jpg');
    var buf = Buffer.from(m[2], 'base64');
    if (buf.length > 12 * 1024 * 1024) { error = 'La imagen ' + k + ' supera 12 MB'; return; }
    var nombre = (archivoExacto && k === claveExacta) ? archivoExacto
      : base + (variante ? '_' + variante : '') + '_' + k + ext;
    try {
      fs.writeFileSync(path.join(IMG_DIR, nombre), buf);
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
  var ahora = new Date();
  if (!obra.fechaRegistro) obra.fechaRegistro = ahora.toISOString().slice(0, 10);
  obra.fechaModificacion = ahora.toISOString();   /* la barra lateral se apoya en esto */
  db.obras.push(obra);
  guardarDB(db);
  res.json({ id: obra.id });
});

app.put('/api/obras/:id', requiereAdmin, function (req, res) {
  var db = cargarDB();
  var idx = db.obras.findIndex(function (o) { return o.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Obra no encontrada' });
  db.obras[idx] = Object.assign({}, db.obras[idx], req.body, {
    id: req.params.id,
    fechaModificacion: new Date().toISOString()
  });
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

/* ==== Alias sin extensión (/admin → /admin.html) ==== */
var ALIAS = { '/admin': '/admin.html', '/subir': '/subir.html', '/editar': '/editar.html', '/exportar': '/exportar.html' };
app.get(['/admin', '/subir', '/editar', '/exportar'], function (req, res) {
  var destino = ALIAS[req.path] || '/';
  var qs = req.originalUrl.split('?')[1];
  res.redirect(301, destino + (qs ? '?' + qs : ''));
});

/* ==== Servir SPA en rutas desconocidas ==== */
app.use(function (req, res) {
  res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

/* ---- Iniciar ---- */
app.listen(PORT, function () {
  sembrarDatos();
  console.log('Servidor corriendo en http://localhost:' + PORT);
  console.log('Datos en: ' + DATA_DIR);
  console.log('API: http://localhost:' + PORT + '/api/obras');
  if (!fs.existsSync(DB_PATH)) {
    guardarDB({ series: [], obras: [], config: {} });
    console.log('Base de datos creada: db.json');
  }
});
