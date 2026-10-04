/* ========================================
   form.js — Manejo del formulario (pestaña ADMIN)
   Registro y edición de obras y series
   ======================================== */

// Inicializa todos los eventos del formulario
async function inicializarFormulario() {
  await actualizarDropdownSeries();

  // Pestañas: alternar entre "Obra" y "Serie"
  var tabObra = document.getElementById('tab-obra');
  var tabSerie = document.getElementById('tab-serie');
  var panelObra = document.getElementById('form-obra');
  var panelSerie = document.getElementById('form-serie');

  if (tabObra && tabSerie) {
    tabObra.addEventListener('click', function () {
      tabObra.classList.add('tab-activo');
      tabSerie.classList.remove('tab-activo');
      panelObra.classList.add('tab-activo');
      panelSerie.classList.remove('tab-activo');
    });
    tabSerie.addEventListener('click', function () {
      tabSerie.classList.add('tab-activo');
      tabObra.classList.remove('tab-activo');
      panelSerie.classList.add('tab-activo');
      panelObra.classList.remove('tab-activo');
    });
  }

  // Enlace: cambia a pestaña Serie desde el formulario de obra
  var btnCrearSerie = document.getElementById('btn-crear-serie-link');
  if (btnCrearSerie) {
    btnCrearSerie.addEventListener('click', function () {
      tabSerie.classList.add('tab-activo');
      tabObra.classList.remove('tab-activo');
      panelSerie.classList.add('tab-activo');
      panelObra.classList.remove('tab-activo');
    });
  }

  // Envío del formulario de obra
  if (panelObra) {
    panelObra.addEventListener('submit', function (e) {
      e.preventDefault();
      guardarObra();
    });
  }

  // Envío del formulario de serie
  if (panelSerie) {
    panelSerie.addEventListener('submit', function (e) {
      e.preventDefault();
      guardarSerie();
    });
  }

  // Vista previa de imagen
  var inputImagen = document.getElementById('obra-imagen');
  if (inputImagen) {
    inputImagen.addEventListener('change', async function (e) {
      var archivo = e.target.files[0];
      if (!archivo) return;
      if (!archivo.type.startsWith('image')) {
        alert(t('alertImagenInvalida'));
        inputImagen.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function (event) {
        mostrarVistaPreviaImagen(event.target.result);
      };
      reader.readAsDataURL(archivo);
    });
  }

  // Expandir/contraer secciones (solo en ADMIN)
  inicializarSeccionesExpansible();
}

// Alterna secciones expandibles
function inicializarSeccionesExpansible() {
  var headers = document.querySelectorAll('.seccion-header');
  headers.forEach(function (header) {
    header.addEventListener('click', function () {
      var content = header.nextElementSibling;
      var toggle = header.querySelector('.toggle-btn');
      var icono = toggle.querySelector('.toggle-icon');

      content.classList.toggle('expandida');
      var expandida = content.classList.contains('expandida');
      toggle.setAttribute('aria-expanded', expandida);
      icono.textContent = expandida ? '−' : '▼';
    });
  });
}

// Muestra la vista previa de la imagen seleccionada
function mostrarVistaPreviaImagen(dataUrl) {
  var contenedor = document.getElementById('imagen-preview-container');
  if (!contenedor) return;
  contenedor.innerHTML = '<img src="' + dataUrl + '" alt="Vista previa" class="imagen-preview">';
}

// Limpia la vista previa de la imagen
function limpiarVistaPreviaImagen() {
  var contenedor = document.getElementById('imagen-preview-container');
  if (contenedor) contenedor.innerHTML = '';
}

// Obtiene la imagen de la vista previa
function obtenerImagenPreview() {
  var preview = document.querySelector('#imagen-preview-container .imagen-preview');
  if (preview) return preview.src;
  return '';
}

// Llena el dropdown de series en el formulario de obra
async function actualizarDropdownSeries() {
  var select = document.getElementById('obra-serie');
  if (!select) return;

  var series = await obtenerSeries();

  if (series.length === 0) {
    select.innerHTML = '<option value="">' + t('selectorCrearSerie') + '</option>';
    return;
  }

  var html = '<option value="">' + t('selectorCrearSerie') + '</option>';
  series.forEach(function (serie) {
    html += '<option value="' + serie.id + '">' + escaparHTML(serie.tema) + '</option>';
  });
  select.innerHTML = html;
}

// ---- Guardar obra ----
async function guardarObra() {
  var titulo = document.getElementById('obra-titulo').value.trim();
  var ancho = parseFloat(document.getElementById('obra-ancho').value);
  var alto = parseFloat(document.getElementById('obra-alto').value);
  var materiales = document.getElementById('obra-materiales').value.trim();
  var anio = parseInt(document.getElementById('obra-anio').value);
  var serieId = document.getElementById('obra-serie').value;
  var disponible = document.getElementById('obra-disponible').checked;
  var imagen = obtenerImagenPreview();

  // Validaciones
  if (!titulo) { alert(t('alertTitulo')); return; }
  if (isNaN(ancho) || ancho <= 0) { alert(t('alertAncho')); return; }
  if (isNaN(alto) || alto <= 0) { alert(t('alertAlto')); return; }
  if (!materiales) { alert(t('alertMateriales')); return; }
  if (isNaN(anio) || anio < 1900) { alert(t('alertAño')); return; }
  if (!serieId) { alert(t('alertSerie')); return; }

  // Busca la serie y calcula el precio = (ancho + alto) x factorPrecio
  var serie = buscarSerie(serieId);
  var precio = calcularPrecio(ancho, alto, serie.factorPrecio);

  // Crea el objeto obra
  // El precio se guarda pero NO se muestra en la UI
  var obra = {
    id: generarId(),
    titulo: titulo,
    ancho: ancho,
    alto: alto,
    precio: precio,
    materiales: materiales,
    tecnica: materiales,  // Materiales y técnica van en un campo
    anio: anio,
    serieId: serieId,
    disponible: disponible,
    imagen: imagen,
    fechaRegistro: fechaHoyStr()
  };

  var ok = await guardarObraAPI(obra);
  if (!ok) return;

  invalidarCache();

  // Limpia el formulario y la vista previa
  document.getElementById('form-obra').reset();
  limpiarVistaPreviaImagen();

  // Refresca las vistas
  await actualizarDropdownSeries();
  await actualizarFiltroAno();
  await cargarObrasActuales();
  await renderizarGaleria();

  alert(t('alertObraGuardada'));
}

// ---- Guardar serie ----
async function guardarSerie() {
  var tema = document.getElementById('serie-tema').value.trim();
  var proceso = document.getElementById('serie-proceso').value.trim();
  var reflecciones = document.getElementById('serie-reflecciones').value.trim();
  var factorPrecio = parseInt(document.getElementById('serie-factor-precio').value);

  // Validaciones
  if (!tema) { alert(t('alertTema')); return; }
  if (!proceso) { alert(t('alertProceso')); return; }
  if (!reflecciones) { alert(t('alertReflecciones')); return; }
  if (isNaN(factorPrecio) || factorPrecio < 0) { alert(t('alertFactor')); return; }

  // Crea el objeto serie
  var serie = {
    id: generarId(),
    tema: tema,
    proceso: proceso,
    reflecciones: reflecciones,
    factorPrecio: factorPrecio
  };

  var ok = await guardarSerieAPI(serie);
  if (!ok) return;

  invalidarCache();

  // Limpia el formulario
  document.getElementById('form-serie').reset();

  // Refresca las vistas
  await actualizarDropdownSeries();
  await actualizarFiltrosSerie();
  await actualizarFiltroAno();
  await renderizarGaleria();

  alert(t('alertSerieGuardada'));
}

function toggleEditar(v){var s=document.getElementById('seccion-editar');var c=document.getElementById('seccion-editar-content');if(!s||!c)return;if(typeof v==='boolean'){if(v){c.classList.add('expandida');}else{c.classList.remove('expandida');}}else{c.classList.toggle('expandida');}}
async function cargarEditarObra(o){toggleEditar(true);var c=document.getElementById('seccion-editar-content');if(!document.getElementById('form-editar-obra')){c.innerHTML='<form id="form-editar-obra" novalidate><input type="hidden" id="editar-id"><div class="grid-2"><div class="campo-grupo"><label for="editar-titulo" data-i18n="tituloObra">Título</label><input type="text" id="editar-titulo" name="titulo" required></div><div class="campo-grupo"><label for="editar-anio" data-i18n="anio">Año</label><input type="number" id="editar-anio" name="anio" min="1900" max="2100" required></div></div><div class="grid-2"><div class="campo-grupo"><label for="editar-ancho" data-i18n="ancho">Ancho</label><input type="number" id="editar-ancho" name="ancho" min="1" step="0.1" required></div><div class="campo-grupo"><label for="editar-alto" data-i18n="alto">Alto</label><input type="number" id="editar-alto" name="alto" min="1" step="0.1" required></div></div><div class="campo-grupo"><label for="editar-serie" data-i18n="serie">Serie</label><select id="editar-serie" name="serieId" required></select></div><div class="campo-grupo"><label for="editar-materiales" data-i18n="materialesTecnica">Materiales</label><textarea id="editar-materiales" name="materiales" rows="2" required></textarea></div><div class="campo-grupo"><label class="checkbox-label"><input type="checkbox" id="editar-disponible" name="disponible" checked><span class="checkmark"></span><span data-i18n="disponibleCheck">Disponible</span></label></div><div class="modal-botones"><button type="submit" class="btn btn-primario" data-i18n="guardarObra">Guardar</button><button type="button" class="btn btn-cancelar" onclick="toggleEditar(false)" data-i18n="cancelarEdicion">Cancelar</button></div></form>';var f=document.getElementById('form-editar-obra');if(f){f.addEventListener('submit',function(e){e.preventDefault();guardarEditarObra();});}}await actualizarDropdownSeriesEditar();document.getElementById('editar-id').value=o.id;document.getElementById('editar-titulo').value=o.titulo;document.getElementById('editar-anio').value=o.anio;document.getElementById('editar-ancho').value=o.ancho;document.getElementById('editar-alto').value=o.alto;document.getElementById('editar-materiales').value=o.materiales;document.getElementById('editar-disponible').checked=o.disponible;document.getElementById('editar-serie').value=o.serieId||'';}
async function guardarEditarObra(){var id=document.getElementById('editar-id').value;var titulo=document.getElementById('editar-titulo').value.trim();var ancho=parseFloat(document.getElementById('editar-ancho').value);var alto=parseFloat(document.getElementById('editar-alto').value);var materiales=document.getElementById('editar-materiales').value.trim();var anio=parseInt(document.getElementById('editar-anio').value);var serieId=document.getElementById('editar-serie').value;var disponible=document.getElementById('editar-disponible').checked;if(!titulo){alert(t('alertTitulo'));return;}if(isNaN(ancho)||ancho<=0){alert(t('alertAncho'));return;}if(isNaN(alto)||alto<=0){alert(t('alertAlto'));return;}if(!materiales){alert(t('alertMateriales'));return;}if(isNaN(anio)||anio<1900){alert(t('alertAño'));return;}if(!serieId){alert(t('alertSerie'));return;}var serie=buscarSerie(serieId);var obra={id:id,titulo:titulo,ancho:ancho,alto:alto,precio:calcularPrecio(ancho,alto,serie.factorPrecio),materiales:materiales,tecnica:materiales,anio:anio,serieId:serieId,disponible:disponible};var ex=cacheObras.find(function(x){return x.id===id;});if(ex){obra.imagen=ex.imagen;obra.fechaRegistro=ex.fechaRegistro;}var ok=await actualizarObraAPI(obra);if(!ok)return;invalidarCache();await actualizarDropdownSeries();await actualizarDropdownSeriesEditar();await actualizarFiltroAno();await cargarObrasActuales();await renderizarGaleria();toggleEditar(false);alert(t('obraEditada'));}
async function actualizarDropdownSeriesEditar(){var s=document.getElementById('editar-serie');if(!s)return;var series=await obtenerSeries();if(series.length===0){s.innerHTML='<option value="">'+t('selectorCrearSerie')+'</option>';return;}var html='<option value="">'+t('selectorCrearSerie')+'</option>';series.forEach(function(x){html+='<option value="'+x.id+'">'+escaparHTML(x.tema)+'</option>';});s.innerHTML=html;}