/* obra-lateral.js — barra lateral fija con la obra más reciente de la home.

   Regla:
     · Si hay alguna obra registrada en los últimos 30 días → la más nueva, con el
       título "Nueva Obra".
     · Si no, la obra editada más recientemente (fechaModificacion, o fechaRegistro
       en las obras viejas que aún no la tienen) → "Obra actualizada".

   Debajo de la imagen: nombre, tamaño y disponibilidad. */

var DIAS_MES = 30;

function fechaMilisegundos(valor) {
  if (!valor) return NaN;
  var t = Date.parse(valor);
  if (!isNaN(t)) return t;
  return NaN;
}

/* Devuelve [{ obra, tipo, fecha }] con las obras subidas o actualizadas en el
   último mes, la más reciente primero. Al cumplir el mes salen de la barra. */
function obrasRecientes(obras, ahora) {
  var hoy = ahora ? new Date(ahora) : new Date();
  var limite = hoy.getTime() - DIAS_MES * 24 * 60 * 60 * 1000;
  var lista = [];

  (obras || []).forEach(function (o) {
    if (!o || o.archivado) return;
    var subida = fechaMilisegundos(o.fechaRegistro);
    var editada = fechaMilisegundos(o.fechaModificacion);
    var ultima = Math.max(isNaN(subida) ? -Infinity : subida, isNaN(editada) ? -Infinity : editada);
    if (!isFinite(ultima) || ultima < limite) return;
    lista.push({
      obra: o,
      tipo: (!isNaN(subida) && subida >= limite) ? 'nueva' : 'actualizada',
      fecha: ultima
    });
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

/* Etiqueta «Nueva Obra» retirada: estar en la barra ya significa que es reciente.
   Solo se distingue la obra editada. */
function etiquetaLateral(tipo) {
  return tipo === 'actualizada' ? 'Obra actualizada' : '';
}

function pintarLateral(lista) {
  var caja = document.getElementById('obra-lateral');
  var cont = document.getElementById('obra-lateral-lista');
  if (!caja || !cont) return;

  if (!lista || !lista.length) {
    cont.innerHTML = '';
    caja.hidden = true;
    return;
  }

  cont.innerHTML = lista.map(function (item) {
    var o = item.obra;
    var enlace = 'pintura.html?id=' + encodeURIComponent(o.id);
    var img = o.imagenMedium || o.imagen || '';
    var partes = [textoTamano(o), textoDisponibilidad(o)].filter(Boolean).join(' · ');
    var etiqueta = etiquetaLateral(item.tipo);

    return '<a class="lateral-item" href="' + enlace + '">' +
      (etiqueta ? '<span class="lateral-tag">' + etiqueta + '</span>' : '') +
      (img ? '<img class="lateral-img" src="' + escaparHTML(img) + '" alt="' +
        escaparHTML(o.titulo || 'Obra') + '" loading="lazy" decoding="async">' : '') +
      '<span class="lateral-nombre">' + escaparHTML(o.titulo || 'Sin título') + '</span>' +
      (partes ? '<span class="lateral-datos">' + escaparHTML(partes) + '</span>' : '') +
    '</a>';
  }).join('');

  caja.hidden = false;
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
