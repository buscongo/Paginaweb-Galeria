/* obra-lateral.js — barra lateral fija con la obra más reciente de la home.

   Regla:
     · Si hay alguna obra registrada en los últimos 30 días → la más nueva, con el
       título "Nueva Obra".
     · Si no, la obra editada más recientemente (fechaModificacion, o fechaRegistro
       en las obras viejas que aún no la tienen) → "Obra actualizada".

   Debajo de la imagen: nombre, tamaño y disponibilidad. */

var DIAS_MES = 30;
var CLAVE_CERRADA = 'obraLateralCerrada';

function fechaMilisegundos(valor) {
  if (!valor) return NaN;
  var t = Date.parse(valor);
  if (!isNaN(t)) return t;
  return NaN;
}

/* Devuelve { obra, tipo: 'nueva' | 'actualizada' } o null */
function elegirObraLateral(obras, ahora) {
  var hoy = ahora ? new Date(ahora) : new Date();
  var limite = new Date(hoy.getTime() - DIAS_MES * 24 * 60 * 60 * 1000);
  var limiteDia = limite.toISOString().slice(0, 10);   /* comparación por día, no por hora */
  var activas = (obras || []).filter(function (o) { return o && !o.archivado; });

  var nuevas = activas.filter(function (o) {
    var dia = String(o.fechaRegistro || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(dia) && dia >= limiteDia;
  });

  if (nuevas.length) {
    return { obra: masReciente(nuevas, function (o) { return fechaMilisegundos(o.fechaRegistro); }), tipo: 'nueva' };
  }

  var editadas = activas.filter(function (o) {
    return !isNaN(fechaMilisegundos(o.fechaModificacion || o.fechaRegistro));
  });
  if (!editadas.length) return null;

  return {
    obra: masReciente(editadas, function (o) {
      return fechaMilisegundos(o.fechaModificacion || o.fechaRegistro);
    }),
    tipo: 'actualizada'
  };
}

function masReciente(lista, obtenerFecha) {
  var mejor = lista[0];
  var mejorT = obtenerFecha(mejor);
  for (var i = 1; i < lista.length; i++) {
    var t = obtenerFecha(lista[i]);
    if (t > mejorT) { mejor = lista[i]; mejorT = t; }
  }
  return mejor;
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

function pintarObraLateral(seleccion) {
  var caja = document.getElementById('obra-lateral');
  if (!caja || !seleccion || !seleccion.obra) return;

  var obra = seleccion.obra;
  var etiqueta = document.getElementById('obra-lateral-etiqueta');
  var foto = document.getElementById('obra-lateral-foto');
  var img = document.getElementById('obra-lateral-img');
  var nombre = document.getElementById('obra-lateral-nombre');
  var datos = document.getElementById('obra-lateral-datos');
  var enlace = 'pintura.html?id=' + encodeURIComponent(obra.id);

  etiqueta.textContent = seleccion.tipo === 'nueva' ? 'Nueva Obra' : 'Obra actualizada';

  img.src = obra.imagenMedium || obra.imagenHD || obra.imagen || '';
  img.alt = obra.titulo || 'Obra';
  foto.href = enlace;
  nombre.textContent = obra.titulo || 'Sin título';
  nombre.href = enlace;

  var partes = [textoTamano(obra), textoDisponibilidad(obra)].filter(Boolean);
  datos.textContent = partes.join(' · ');

  caja.hidden = false;
  document.body.classList.add('con-obra-lateral');
}

function cerrarObraLateral() {
  var caja = document.getElementById('obra-lateral');
  if (caja) caja.hidden = true;
  document.body.classList.remove('con-obra-lateral');
  try { sessionStorage.setItem(CLAVE_CERRADA, '1'); } catch (e) { /* modo privado */ }
}

/* La barra de navegación se oculta al bajar y reaparece al subir; la lateral
   queda fija y se estira hasta el borde superior mientras la otra no se ve. */
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
  try {
    if (sessionStorage.getItem(CLAVE_CERRADA) === '1') return;
  } catch (e) { /* sin sessionStorage: se muestra igual */ }

  var cerrar = document.getElementById('obra-lateral-cerrar');
  if (cerrar) cerrar.addEventListener('click', cerrarObraLateral);

  var obras = await obtenerObras();
  pintarObraLateral(elegirObraLateral(obras));
  vigilarScrollNav();
}

document.addEventListener('DOMContentLoaded', iniciarObraLateral);
