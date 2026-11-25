/* mantener-mediums.js — Genera el tamaño medium (1200 px) de las fotos de detalle
   que todavía no lo tienen, para que la web pública nunca sirva el HD.

   Corre solo al abrir el admin (hace falta la sesión) y es idempotente:
   si ya existen los archivos, no hace nada. */
(function () {
  var LADO = 1200;
  var CALIDAD = 0.85;

  function cargar(src) {
    return new Promise(function (ok, mal) {
      var i = new Image();
      i.onload = function () { ok(i); };
      i.onerror = function () { mal(new Error('no carga')); };
      i.src = src;
    });
  }

  function recortar(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    var f = Math.min(1, LADO / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * f));
    c.height = Math.max(1, Math.round(h * f));
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', CALIDAD);
  }

  function barra(texto) {
    var b = document.getElementById('aviso-mediums');
    if (!b) {
      b = document.createElement('div');
      b.id = 'aviso-mediums';
      b.className = 'aviso-proteccion visible';
      document.body.appendChild(b);
    }
    b.textContent = texto;
    clearTimeout(b._t);
    b._t = setTimeout(function () { b.classList.remove('visible'); }, 5000);
  }

  /* ¿El archivo existe? El servidor devuelve una página HTML cuando falta,
     así que la imagen no carga y dispara onerror. */
  async function existe(url) {
    try { await cargar(url); return true; } catch (e) { return false; }
  }

  async function iniciar() {
    var obras;
    try { obras = await obtenerObras(); } catch (e) { return; }

    var faltan = [];
    obras.forEach(function (o) {
      (o.detalles || []).forEach(function (d) {
        if (!d || !d.hd) return;
        faltan.push({ hd: d.hd, media: d.hd.replace(/_hd\.(jpe?g|png|webp)$/i, '_medium.$1') });
      });
    });
    if (!faltan.length) return;

    var pendientes = [];
    for (var i = 0; i < faltan.length; i++) {
      if (!(await existe(faltan[i].media))) pendientes.push(faltan[i]);
    }
    if (!pendientes.length) return;

    barra('Generando ' + pendientes.length + ' versión(es) medium de los detalles…');
    var hechos = 0;
    for (var j = 0; j < pendientes.length; j++) {
      var p = pendientes[j];
      try {
        var img = await cargar(p.hd);
        var r = await fetch('/api/imagenes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archivo: p.media, urls: { medium: recortar(img) } })
        });
        if (resp_ok(r)) hechos++;
      } catch (e) { /* se reintenta la próxima vez que se abra el admin */ }
    }
    barra(hechos === pendientes.length
      ? 'Listo: ' + hechos + ' detalle(s) con su versión medium.'
      : 'Se generaron ' + hechos + ' de ' + pendientes.length + '; se reintenta al volver a abrir el admin.');
  }

  function resp_ok(r) { return r && r.ok; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
