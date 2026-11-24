/* admin-gate.js — Puerta de contraseña, navegación común y cierre por inactividad.
   La sesión la valida el servidor (/api/sesion) con una cookie HttpOnly:
   expira a los 5 minutos sin actividad, igual que el vigilante del navegador. */

var MINUTOS_INACTIVIDAD = 5;
var temporizadorCierre = null;
var ultimaActividad = Date.now();

function inicializarNavAdmin() {
  var nav = document.querySelector('.series-tabs');
  var tgl = document.querySelector('.series-toggle');
  if (!nav || !tgl) return;

  function estado(abierto) {
    nav.classList.toggle('open', abierto);
    tgl.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    tgl.textContent = abierto ? '×' : '☰';
  }

  tgl.addEventListener('click', function (e) {
    e.stopPropagation();
    estado(!nav.classList.contains('open'));
  });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target)) estado(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') estado(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 700) estado(false);
  });
  estado(false);
}

function mostrarPuerta(alEntrar, mensaje) {
  var ov = document.createElement('div');
  ov.className = 'gate-overlay';
  ov.innerHTML = [
    '<form class="gate-caja" novalidate>',
    '  <h2>Admin</h2>',
    '  <p class="gate-ayuda">' + (mensaje || 'Ingresá la contraseña para administrar las obras.') + '</p>',
    '  <input type="password" name="password" autocomplete="current-password" placeholder="Contraseña" required>',
    '  <button type="submit" class="btn btn-primario">Entrar</button>',
    '  <p class="gate-error" role="alert"></p>',
    '</form>'
  ].join('');
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';

  var form = ov.querySelector('form');
  var input = ov.querySelector('input');
  var error = ov.querySelector('.gate-error');
  input.focus();

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    error.textContent = '';
    var res = await loginAPI(input.value);
    if (!res.ok) {
      error.textContent = res.error || 'Contraseña incorrecta.';
      input.select();
      return;
    }
    ov.remove();
    document.body.style.overflow = '';
    alEntrar();
  });
}

/* Vigilante: cierra la sesión tras 5 minutos sin actividad del usuario.
   Mientras haya actividad, avisa al servidor cada minuto para renovar la cookie. */
function iniciarVigilanciaSesion(alExpirar) {
  function tocarAlServidor() {
    if (Date.now() - ultimaActividad > 10000) return;   // sin actividad: no renovar
    fetch(API_URL + '/sesion').catch(function () {});
  }

  function programar() {
    clearTimeout(temporizadorCierre);
    temporizadorCierre = setTimeout(async function () {
      try { await logoutAPI(); } catch (e) {}
      alExpirar();
    }, MINUTOS_INACTIVIDAD * 60 * 1000);
  }

  function actividad() {
    ultimaActividad = Date.now();
    programar();
  }

  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'input'].forEach(function (ev) {
    document.addEventListener(ev, actividad, { passive: true });
  });

  setInterval(tocarAlServidor, 60 * 1000);
  programar();
}

async function protegerAdmin(alEntrar) {
  inicializarNavAdmin();

  var iniciado = false;

  function entrar() {
    if (!iniciado) { iniciado = true; alEntrar(); }
    iniciarVigilanciaSesion(function () {
      mostrarPuerta(entrar, 'La sesión se cerró por inactividad. Ingresá la contraseña otra vez.');
    });
  }

  if (await sesionAPI()) { entrar(); return; }
  mostrarPuerta(entrar);
}

async function cerrarSesionAdmin() {
  await logoutAPI();
  window.location.href = 'admin.html';
}
