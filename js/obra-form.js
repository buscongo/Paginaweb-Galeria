/* obra-form.js — Formulario compartido por subir.html (nueva obra) y editar.html.
   Genera el markup, gestiona la portada y las fotos de detalle, y guarda la obra.
   Cada foto se sube en 3 tamaños (thumb 400 / medium 1200 / 2k 2048). */

var FormObra = (function () {
  var estado = {
    modo: 'nuevo',
    obra: null,
    portada: null,     // {tipo:'existente', thumb, medium, dosK} | {tipo:'archivo', file}
    detalles: [],      // [{tipo:'existente', thumb, medium, full} | {tipo:'archivo', file}]
    guardando: false
  };

  var HTML = [
    '<form id="form-obra" class="form-obra" novalidate>',
    '  <div class="form-col">',
    '    <label class="campo">Título',
    '      <input type="text" name="titulo" required>',
    '    </label>',
    '    <label class="campo">Año de realización',
    '      <input type="number" name="anio" min="1900" max="2100" required>',
    '    </label>',
    '    <div class="campo-fila">',
    '      <label class="campo">Ancho (cm) <input type="number" name="ancho" min="1" step="0.1" required></label>',
    '      <label class="campo">Alto (cm) <input type="number" name="alto" min="1" step="0.1" required></label>',
    '    </div>',
    '    <div class="campo">',
    '      <label for="campo-serie">Serie</label>',
    '      <select name="serieId" id="campo-serie" required></select>',
    '      <button type="button" class="link-boton" id="btn-nueva-serie">¿No tenés la serie? Creala acá</button>',
    '      <div class="mini-serie" id="mini-serie" hidden>',
    '        <input type="text" name="serieTema" placeholder="Tema de la serie">',
    '        <input type="number" name="serieFactor" placeholder="Factor de precio" min="0" step="1">',
    '        <textarea name="serieProceso" rows="2" placeholder="Proceso"></textarea>',
    '        <textarea name="serieReflexiones" rows="2" placeholder="Reflexiones"></textarea>',
    '        <button type="button" class="btn btn-primario" id="btn-guardar-serie">Crear serie</button>',
    '      </div>',
    '    </div>',
    '    <label class="campo">Materiales y técnica',
    '      <textarea name="materiales" rows="2" required></textarea>',
    '    </label>',
    '    <label class="campo-check"><input type="checkbox" name="disponible"> Disponible</label>',
    '    <p class="precio-calc" id="precio-calc"></p>',
    '  </div>',
    '  <div class="form-col">',
    '    <h3 class="form-subtitulo">Foto principal</h3>',
    '    <p class="form-ayuda">Se guarda en 3 tamaños: 400 px (tarjeta), 1200 px (ficha y modal) y 2048 px (zoom).</p>',
    '    <input type="file" accept="image/*" id="input-portada">',
    '    <div id="preview-portada" class="preview"></div>',
    '    <h3 class="form-subtitulo">Fotos de detalle</h3>',
    '    <input type="file" accept="image/*" id="input-detalles" multiple>',
    '    <div id="lista-detalles" class="detalles-lista"></div>',
    '  </div>',
    '  <div class="form-acciones">',
    '    <button type="submit" class="btn btn-primario" id="btn-guardar">Guardar obra</button>',
    '    <a href="admin.html" class="btn btn-cancelar">Cancelar</a>',
    '    <span class="form-estado" id="form-estado"></span>',
    '  </div>',
    '</form>'
  ].join('\n');

  function $(sel) { return document.querySelector(sel); }
  function campo(nombre) { return document.querySelector('#form-obra [name="' + nombre + '"]'); }

  function setEstado(txt) {
    var el = document.getElementById('form-estado');
    if (el) el.textContent = txt || '';
  }

  /* ---------- Render ---------- */
  async function montar(contenedor, opciones) {
    estado.modo = opciones.modo;
    estado.obra = opciones.obra || null;
    estado.portada = null;
    estado.detalles = [];
    contenedor.innerHTML = HTML;

    await obtenerSeries(true);
    var select = campo('serieId');
    select.innerHTML = cacheSeries.map(function (s) {
      return '<option value="' + s.id + '">' + escaparHTML(s.tema) + '</option>';
    }).join('');

    if (estado.obra) {
      var o = estado.obra;
      campo('titulo').value = o.titulo || '';
      campo('anio').value = o.anio || '';
      campo('ancho').value = o.ancho || '';
      campo('alto').value = o.alto || '';
      campo('materiales').value = o.materiales || '';
      campo('disponible').checked = !!o.disponible;
      select.value = o.serieId;

      if (o.imagen) {
        estado.portada = { tipo: 'existente', thumb: o.imagen, medium: o.imagenMedium || o.imagen2k || o.imagen, dosK: o.imagen2k || o.imagen };
      }
      estado.detalles = (o.detalles || []).map(function (d) {
        return { tipo: 'existente', thumb: d.thumb, medium: d.medium || d.full || d.thumb, full: d.full || d.thumb };
      });
    } else {
      campo('anio').value = añoActual();
      campo('disponible').checked = true;
    }

    pintarPortada();
    pintarDetalles();
    actualizarPrecio();

    document.getElementById('input-portada').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      estado.portada = { tipo: 'archivo', file: file };
      pintarPortada();
    });

    document.getElementById('input-detalles').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      files.forEach(function (f) { estado.detalles.push({ tipo: 'archivo', file: f }); });
      e.target.value = '';
      pintarDetalles();
    });

    ['ancho', 'alto'].forEach(function (n) {
      campo(n).addEventListener('input', actualizarPrecio);
    });
    select.addEventListener('change', actualizarPrecio);

    // Crear una serie sin salir del formulario
    var btnNueva = document.getElementById('btn-nueva-serie');
    var mini = document.getElementById('mini-serie');
    btnNueva.addEventListener('click', function () { mini.hidden = !mini.hidden; });
    document.getElementById('btn-guardar-serie').addEventListener('click', function () {
      crearSerie(select);
    });

    var form = document.getElementById('form-obra');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      guardar();
    });

    if (estado.modo === 'editar') {
      var btn = document.getElementById('btn-guardar');
      btn.textContent = 'Guardar cambios';
      var archivar = document.createElement('button');
      archivar.type = 'button';
      archivar.className = 'btn btn-archivar';
      archivar.textContent = 'Archivar obra';
      archivar.addEventListener('click', archivarObra);
      document.querySelector('.form-acciones').insertBefore(archivar, document.getElementById('form-estado'));
    }
  }

  function actualizarPrecio() {
    var ancho = parseFloat(campo('ancho').value);
    var alto = parseFloat(campo('alto').value);
    var serie = buscarSerie(campo('serieId').value);
    var el = document.getElementById('precio-calc');
    if (!el) return;
    if (!serie || isNaN(ancho) || isNaN(alto) || ancho <= 0 || alto <= 0) { el.textContent = ''; return; }
    el.textContent = 'Precio calculado: ' + formatoMoneda(calcularPrecio(ancho, alto, serie.factorPrecio));
  }

  function pintarPortada() {
    var cont = document.getElementById('preview-portada');
    if (!estado.portada) {
      cont.innerHTML = '<p class="form-ayuda">Sin foto principal.</p>';
      return;
    }
    var p = estado.portada;
    var src = p.tipo === 'existente' ? p.medium : '';
    var nodo = '<div class="preview-item">';
    nodo += '<img id="preview-portada-img" alt="Portada" src="' + escaparHTML(src) + '">';
    nodo += '<button type="button" class="btn-mini" data-quitar-portada>Quitar</button>';
    nodo += '</div>';
    cont.innerHTML = nodo;
    cont.querySelector('[data-quitar-portada]').addEventListener('click', function () {
      estado.portada = null;
      pintarPortada();
    });
    if (p.tipo === 'archivo') {
      var img = document.getElementById('preview-portada-img');
      img.src = URL.createObjectURL(p.file);
    }
  }

  function pintarDetalles() {
    var cont = document.getElementById('lista-detalles');
    if (!estado.detalles.length) {
      cont.innerHTML = '<p class="form-ayuda">Sin fotos de detalle.</p>';
      return;
    }
    cont.innerHTML = estado.detalles.map(function (d, i) {
      var src = d.tipo === 'existente' ? d.thumb : '';
      return '<div class="detalle-item"><img alt="Detalle ' + (i + 1) + '" src="' + escaparHTML(src) + '">' +
        '<button type="button" class="btn-mini" data-quitar="' + i + '">Quitar</button></div>';
    }).join('');
    cont.querySelectorAll('[data-quitar]').forEach(function (b) {
      b.addEventListener('click', function () {
        estado.detalles.splice(parseInt(b.getAttribute('data-quitar'), 10), 1);
        pintarDetalles();
      });
    });
    estado.detalles.forEach(function (d, i) {
      if (d.tipo !== 'archivo') return;
      var img = cont.querySelectorAll('.detalle-item img')[i];
      if (img) img.src = URL.createObjectURL(d.file);
    });
  }

  function validar(datos) {
    if (!datos.titulo) return 'Ingresá el título.';
    if (isNaN(datos.ancho) || datos.ancho <= 0) return 'Ingresá un ancho válido.';
    if (isNaN(datos.alto) || datos.alto <= 0) return 'Ingresá un alto válido.';
    if (!datos.materiales) return 'Ingresá materiales y técnica.';
    if (isNaN(datos.anio) || datos.anio < 1900) return 'Ingresá un año válido.';
    if (!datos.serieId) return 'Seleccioná una serie.';
    if (!estado.portada) return 'Falta la foto principal.';
    return null;
  }

  async function guardar() {
    if (estado.guardando) return;

    var datos = {
      titulo: campo('titulo').value.trim(),
      anio: parseInt(campo('anio').value, 10),
      ancho: parseFloat(campo('ancho').value),
      alto: parseFloat(campo('alto').value),
      materiales: campo('materiales').value.trim(),
      serieId: campo('serieId').value,
      disponible: campo('disponible').checked
    };

    var problema = validar(datos);
    if (problema) { alert(problema); return; }

    var serie = buscarSerie(datos.serieId);
    if (!serie) { alert('Serie no encontrada.'); return; }

    estado.guardando = true;
    var btn = document.getElementById('btn-guardar');
    btn.disabled = true;

    try {
      var id = estado.obra ? estado.obra.id : generarId();
      var base = slugArchivo(datos.titulo) + '-' + id.slice(-5);
      var obra = {
        id: id,
        titulo: datos.titulo,
        ancho: datos.ancho,
        alto: datos.alto,
        precio: calcularPrecio(datos.ancho, datos.alto, serie.factorPrecio),
        materiales: datos.materiales,
        tecnica: datos.materiales,
        anio: datos.anio,
        serieId: datos.serieId,
        disponible: datos.disponible
      };

      // --- Portada ---
      if (estado.portada.tipo === 'archivo') {
        setEstado('Subiendo foto principal (3 tamaños)…');
        var subida = await subirFotoAPI(base, '', await generarTresTamanos(estado.portada.file));
        if (subida.error) throw new Error('Foto principal: ' + subida.error);
        obra.imagen = subida.thumb;
        obra.imagenMedium = subida.medium;
        obra.imagen2k = subida['2k'];
      } else {
        obra.imagen = estado.portada.thumb;
        obra.imagenMedium = estado.portada.medium;
        obra.imagen2k = estado.portada.dosK;
      }

      // --- Detalles ---
      var detalles = [];
      var nuevas = 0;
      for (var i = 0; i < estado.detalles.length; i++) {
        var d = estado.detalles[i];
        if (d.tipo === 'existente') {
          detalles.push({ thumb: d.thumb, medium: d.medium, full: d.full });
          continue;
        }
        nuevas++;
        setEstado('Subiendo detalle ' + nuevas + ' de 3 tamaños…');
        var r = await subirFotoAPI(base, 'det' + (i + 1), await generarTresTamanos(d.file));
        if (r.error) throw new Error('Detalle ' + (i + 1) + ': ' + r.error);
        detalles.push({ thumb: r.thumb, medium: r.medium, full: r['2k'] });
      }
      obra.detalles = detalles;

      if (estado.obra) {
        obra.fechaRegistro = estado.obra.fechaRegistro || fechaHoyStr();
        setEstado('Guardando cambios…');
        var ok = await actualizarObraAPI(obra);
        if (!ok) throw new Error('No se pudo guardar en el servidor.');
      } else {
        obra.fechaRegistro = fechaHoyStr();
        setEstado('Guardando obra…');
        var ok2 = await guardarObraAPI(obra);
        if (!ok2) throw new Error('No se pudo guardar en el servidor.');
      }

      invalidarCache();
      setEstado('Listo.');
      window.location.href = 'admin.html?ok=1';
    } catch (e) {
      console.error(e);
      setEstado('');
      alert(e.message || 'Ocurrió un error al guardar.');
      estado.guardando = false;
      btn.disabled = false;
    }
  }

  async function crearSerie(select) {
    var tema = document.querySelector('#mini-serie [name="serieTema"]').value.trim();
    var factor = parseInt(document.querySelector('#mini-serie [name="serieFactor"]').value, 10);
    var proceso = document.querySelector('#mini-serie [name="serieProceso"]').value.trim();
    var refl = document.querySelector('#mini-serie [name="serieReflexiones"]').value.trim();

    if (!tema) { alert('Ingresá el tema de la serie.'); return; }
    if (isNaN(factor) || factor < 0) { alert('Ingresá un factor de precio válido.'); return; }

    var serie = {
      id: generarIdSerie(),
      tema: tema,
      proceso: proceso,
      reflecciones: refl,
      factorPrecio: factor
    };

    var ok = await guardarSerieAPI(serie);
    if (!ok) return;

    invalidarCache();
    await obtenerSeries(true);
    select.innerHTML = cacheSeries.map(function (s) {
      return '<option value="' + s.id + '">' + escaparHTML(s.tema) + '</option>';
    }).join('');
    select.value = serie.id;
    document.getElementById('mini-serie').hidden = true;
    actualizarPrecio();
    alert('Serie creada.');
  }

  async function archivarObra() {
    if (!estado.obra) return;
    var ok = await archivarObraAPI(estado.obra.id);
    if (!ok) return;
    invalidarCache();
    window.location.href = 'admin.html';
  }

  return { montar: montar };
})();
