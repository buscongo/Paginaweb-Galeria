/* obra-lateral.js — barra lateral de la home con las obras nuevas.

   Regla:
     · Solo entran las obras SUBIDAS en los últimos 30 días (fechaRegistro),
       de la más nueva a la más vieja.
     · Las obras editadas NO aparecen acá: se marcan con la esquina
       «Actualizado» en su tarjeta (ver `esObraActualizada()` en data.js).
     · Al cumplirse el mes, la obra sale sola de la barra.

   Debajo de la imagen: nombre, tamaño y disponibilidad. */

var DIAS_MES = 30;

function fechaMilisegundos(valor) {
  if (!valor) return NaN;
  var t = Date.parse(valor);
  if (!isNaN(t)) return t;
  return NaN;
}

/* Devuelve [{ obra, fecha }] con las obras SUBIDAS en el último mes, la más
   reciente primero. Las obras actualizadas no entran en la barra: se marcan
   con la esquina «Actualizado» en su tarjeta. Al cumplir el mes salen solas. */
function obrasRecientes(obras, ahora) {
  var hoy = ahora ? new Date(ahora) : new Date();
  var limite = hoy.getTime() - DIAS_MES * 24 * 60 * 60 * 1000;
  var lista = [];

  (obras || []).forEach(function (o) {
    if (!o || o.archivado) return;
    var subida = fechaMilisegundos(o.fechaRegistro);
    if (isNaN(subida) || subida < limite) return;
    lista.push({ obra: o, fecha: subida });
  });

  lista.sort(function (a, b) { return b.fecha - a.fecha; });
  return lista;
}

/* Compatibilidad: la primera de la lista */
function elegirObraLateral(obras, ahora) {
  var lista = obrasRecientes(obras, ahora);
  return lista.length ? lista[0] : null;
}

function textoDisponibilidad(obra) {
  return obra.disponible ? 'Disponible' : 'No disponible';
}

function textoTamano(obra) {
  var ancho = Number(obra.ancho) || 0;
  var alto = Number(obra.alto) || 0;
  if (!ancho || !alto) return '';
  return ancho + ' × ' + alto + ' cm';
}

function pintarLateral(lista) {
  /* En móvil la barra se convierte en la primera sección y muestra solo lo último subido */
  var esMovil = window.matchMedia('(max-width: 899px)').matches;
  if (esMovil && lista && lista.length > 1) lista = lista.slice(0, 1);

  var caja = document.getElementById('obra-lateral');
  var cont = document.getElementById('obra-lateral-lista');
  if (!caja || !cont) return;

  /* Sin obras nuevas la barra desaparece y la columna central puede ocupar todo el ancho */
  var cuerpo = caja.closest('.home-cuerpo');
  function marcarSinLateral(sin) {
    if (cuerpo) cuerpo.classList.toggle('sin-lateral', sin);
  }

  if (!lista || !lista.length) {
    cont.innerHTML = '';
    caja.hidden = true;
    marcarSinLateral(true);
    return;
  }

  cont.innerHTML = lista.map(function (item) {
    var o = item.obra;
    var enlace = 'pintura.html?id=' + encodeURIComponent(o.id);
    var img = o.imagenMedium || o.imagen || '';
    var partes = [textoTamano(o), textoDisponibilidad(o)].filter(Boolean).join(' · ');

    return '<a class="lateral-item" href="' + enlace + '">' +
      (img ? '<img class="lateral-img" src="' + escaparHTML(img) + '" alt="' +
        escaparHTML(o.titulo || 'Obra') + '" loading="lazy" decoding="async">' : '') +
      '<span class="lateral-nombre">' + escaparHTML(o.titulo || 'Sin título') + '</span>' +
      (partes ? '<span class="lateral-datos">' + escaparHTML(partes) + '</span>' : '') +
    '</a>';
  }).join('');

  caja.hidden = false;
  marcarSinLateral(false);
}

/* Compatibilidad con llamadas antiguas */
function pintarObraLateral(seleccion) {
  pintarLateral(seleccion ? [seleccion] : []);
}

/* La barra de navegación se oculta al bajar y reaparece al subir */
function vigilarScrollNav() {
  var ultimo = window.scrollY || window.pageYOffset;

  function revisar() {
    var y = window.scrollY || window.pageYOffset;
    var delta = y - ultimo;
    if (y < 60) {
      document.body.classList.remove('nav-oculta');
    } else if (delta > 4) {
      document.body.classList.add('nav-oculta');
    } else if (delta < -4) {
      document.body.classList.remove('nav-oculta');
    }
    ultimo = y;
  }

  window.addEventListener('scroll', revisar, { passive: true });
  window.addEventListener('wheel', function () { setTimeout(revisar, 0); }, { passive: true });
  window.addEventListener('touchmove', function () { setTimeout(revisar, 0); }, { passive: true });
}

async function iniciarObraLateral() {
  var obras = await obtenerObras();
  pintarLateral(obrasRecientes(obras));
  vigilarScrollNav();
}

document.addEventListener('DOMContentLoaded', iniciarObraLateral);
