/* proteger-imagenes.js — dificulta copiar la obra desde la ficha.
   No impide una captura real (el navegador necesita los píxeles para mostrarlos):
   solo frena el clic derecho, el arrastre, «guardar imagen» y los atajos de
   guardar/imprimir/ver código. */
(function () {
  var AVISO = 'La imagen es propiedad del artista. Para usarla, escribí a través del formulario de contacto.';

  function esImagen(el) {
    if (!el) return false;
    if (el.tagName === 'IMG') return true;
    return !!(el.closest && el.closest('#imagen-grande, #zoom-imagen, .zoom-overlay, .ficha-imagen, .detalle-thumbs'));
  }

  // clic derecho, arrastre y selección sobre las imágenes
  ['contextmenu', 'dragstart', 'selectstart'].forEach(function (evento) {
    document.addEventListener(evento, function (e) {
      if (!esImagen(e.target)) return;
      e.preventDefault();
      return false;
    }, true);
  });

  function avisar() {
    var caja = document.getElementById('aviso-proteccion');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'aviso-proteccion';
      caja.className = 'aviso-proteccion';
      document.body.appendChild(caja);
    }
    caja.textContent = AVISO;
    caja.classList.add('visible');
    clearTimeout(caja._t);
    caja._t = setTimeout(function () { caja.classList.remove('visible'); }, 3200);
  }

  // atajos que sirven para quedarse con el archivo o la pantalla
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    var conCtrl = e.ctrlKey || e.metaKey;

    if (conCtrl && (k === 's' || k === 'p' || k === 'u')) {
      e.preventDefault();
      e.stopPropagation();
      if (k !== 'u') avisar();
      return false;
    }
    if (conCtrl && e.shiftKey && k === 's') {
      e.preventDefault();
      return false;
    }

    // PrintScreen: no se puede cancelar, pero se intenta vaciar el portapapeles
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('').catch(function () {});
      }
    }
  }, true);

  // en móvil, sin menú de «guardar imagen» al mantener pulsado
  document.addEventListener('touchstart', function () {
    document.body.classList.add('sin-guardar-imagen');
  }, { once: true, passive: true });
})();
