/* admin-gate.js — Puerta de contraseña + navegación común de las páginas de admin.
   La sesión la valida el servidor (/api/sesion) con una cookie HttpOnly. */

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

function mostrarPuerta(alEntrar) {
  var ov = document.createElement('div');
  ov.className = 'gate-overlay';
  ov.innerHTML = [
    '<form class="gate-caja" novalidate>',
    '  <h2>Admin</h2>',
    '  <p class="gate-ayuda">Ingresá la contraseña para administrar las obras.</p>',
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
    var ok = await loginAPI(input.value);
    if (!ok) {
      error.textContent = 'Contraseña incorrecta.';
      input.select();
      return;
    }
    ov.remove();
    document.body.style.overflow = '';
    alEntrar();
  });
}

async function protegerAdmin(alEntrar) {
  inicializarNavAdmin();
  if (await sesionAPI()) { alEntrar(); return; }
  mostrarPuerta(alEntrar);
}

async function cerrarSesionAdmin() {
  await logoutAPI();
  window.location.href = 'admin.html';
}
