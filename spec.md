# spec.md — Galería de Arte Web v2

## Resumen
Web estática (HTML/CSS/JS vanilla) con cuatro páginas: **Home** (hero header, franja de pestañas de series arriba del header, sección "año actual", galería por serie), **Admin**, **Detalle de obra**, **Login/Admin**. Los precios se calculan automáticamente `(ancho+alto) × factorPrecioSerie`. Header hero = fondo 2K de la obra más reciente con nombre "Andrés Ramírez Ortíz" encima: 15% de altura en desktop y **33.33vh en mobile** (solo `serie.html` y `pintura.html`, clase `hero-header`). **En Home ese header se reemplazó por una sección de perfil** de **dos tercios de la pantalla** (`min-height: calc(66.667vh - 44px)`): retrato a la izquierda (46%) y, a la derecha (54%), el **statement** y el **curriculum/trayectoria** en 2–3 columnas; fondo gris más oscuro (`#4a4a4a`) y en móvil una sola columna (foto 50vh arriba). Se elimina "Galería de Arte" y búsqueda por título. Paleta en grises (`--bg-primary:#808080` gris 50%, `--bg-secondary:#f2f2f2`, `--text-primary:#0d0d0d`, `--accent:#3a3a3a`); tipografía GFS Didot. Franja de pestañas de series encima del header → hamburguesa móvil; layout idéntico (hero 15% + frost) en home, `serie.html` y `pintura.html`. Cards sin zoom ni `border-radius` (`border-radius:0`, indicador disponible conserva `50%`); `fechaRegistro` no visible en UI pública; i18n `disponibilidad` = "Disponibilidad".

## Alcance

### In scope
- **Home** (`html/index.html`): galería filtrable, sidebar con navegación a Admin, toggle ES/EN, consulta de precios.
- **Admin** (`html/admin.html`): formulario de obras y series (tabs), galería con filtros, secciones expandibles, toggle de obras archivadas, edición de obras.
- **Detalle de obra** (`html/pintura.html?id=...`): imagen principal 2k + carousel "Detalles" (portada + fotos extra; thumbnail → 2k al click).
- **i18n**: toggle discreto, textos estáticos vía `data-i18n`, dinámicos vía `t()`. Persistencia en backend.
- **Precio**: `(ancho+alto) × factorPrecioSerie`. Entero. Visible SOLO en `pintura.html` y SOLO si la obra está disponible (al final de la información). NUNCA visible en Home ni Admin; ahí se revela solo via email de consulta. Moneda: USD.
- **Persistencia**: Backend (Express + JSON). `data.js` usa `fetch()` (async) en lugar de localStorage.
- **Imágenes**: preview con FileReader, validación de tipo MIME, almacenadas como base64 en JSON.
- **Backend**: `server.js` (Express), `package.json`, `db.json` (auto-creado). Sirve archivos estáticos + API REST.

### Out of scope
- Autenticación o usuarios.
- Subida de imágenes a servidor (se guardan como base64 en JSON).
- Notificaciones push.
- Edición masiva por lotes.
- Deploy en producción (solo localhost por ahora).

## RF (EARS)

### RF-01: Sub-formulario de serie inline ✅
**WHEN** el usuario abre el formulario de obra Y no hay series registradas  
**OR** el usuario hace clic en el enlace "Crear nueva serie"  
**THEN** el sistema SHALL mostrar un sub-formulario inline (tema, proceso, reflexiones, factorPrecio) sin cambiar de pestaña.  
**WHY**: evita fricción navegando a otra pestaña y volviendo a buscar la serie.  
**IMPL**: Implementado via tabs — el enlace "Crear nueva serie" cambia al tab Serie en la misma pantalla.

### RF-02: Persistencia de idioma
**WHEN** el usuario hace clic en el toggle de idioma  
**THEN** el sistema SHALL cambiar todos los textos entre ES y EN  
**AND** guardar la preferencia en el backend (`/api/config/idioma`).  
**WHY**: el visitante no debe volver a cambiar de idioma en cada visita.

### RF-03: Factor de precio entero
**WHEN** el usuario ingresa el factor de precio en el formulario de serie  
**THEN** el sistema SHALL aceptar solo números enteros (step=1, min=0).  
**WHY**: los precios en colones no requieren decimales en el factor.

### RF-04: Consulta de precios por email ✅
**WHEN** el visitante/Admin hace clic en "Consultar precio" sobre una obra (Home o Admin)  
**THEN** el sistema SHALL abrir un modal de consulta con la obra clickeada pre-seleccionada  
**AND** mostrar las otras obras de la misma serie como checkboxes  
**AND** al enviar, abrir `mailto:` con los detalles + precios de las obras seleccionadas.  
**WHY**: el precio no se muestra en Home ni Admin; ahí se revela solo dentro del email de consulta. El visitante no navega a Admin para solicitar; el Admin gestiona y también consulta por email. (Excepción: `pintura.html` muestra el precio cuando la obra está disponible — ver RF-12.)

### RF-05: Backend/DB
**WHEN** la aplicación carga  
**THEN** el sistema SHALL servir los datos desde `server.js` + `db.json` vía API REST (`/api/obras`, `/api/series`, `/api/config/:clave`)  
**AND** el frontend SHALL usar `fetch()` (async) en lugar de localStorage.  
**WHY**: localStorage se borra al limpiar datos del navegador; el backend persiste en `db.json`.

### RF-06: Archivar obra (Admin only) ✅
**WHEN** el Admin hace clic en "Archivar" sobre una obra  
**THEN** el sistema SHALL marcarla como archivada (`archivado: true`)  
**AND** ocultarla de la galería principal.  
**WHY**: eliminar permanentemente es arriesgado; archivar permite futura recuperación.  
**IMPL**: Botón "Archivar" en modal de obra (Admin). Toggle "Ver archivadas" en filtros muestra/oculta obras archivadas. API: `DELETE /api/obras/:id` (soft-delete).

### RF-07: Estado vacío en Home
**WHEN** la galería tiene cero obras  
**THEN** el sistema SHALL mostrar "Aún no hay obras registradas" con un link a Admin.  
**WHY**: guía al visitante a la acción correcta cuando no hay contenido.

### RF-08: Editar obra ✅
**WHEN** el Admin hace clic en "Editar" desde el modal de detalles  
**THEN** el sistema SHALL cargar los datos de la obra en el formulario de Admin (sección expandible "Editar obra")  
**AND** permitir modificar y guardar los cambios vía `PUT /api/obras/:id`.  
**WHY**: la edición es una acción distinta a la creación y necesita su propio flujo.  
**IMPL**: Botón "Editar" en modal (Admin only). Formulario con campos: título, año, ancho, alto, serie, materiales, disponible. Precio se recalcula automáticamente con `(ancho+alto) × factorPrecioSerie`.

### RF-09: Validación de imagen
**WHEN** el usuario selecciona un archivo en el input de imagen  
**THEN** el sistema SHALL verificar que el tipo MIME comienza con "image/"  
**UNLESS** el archivo no es una imagen, **THEN** mostrar alert "Solo se permiten imágenes" y rechazarlo.  
**WHY**: prevenir errores al intentar previsualizar archivos no imágenes.

### RF-10: Página de detalle de obra ✅
**WHEN** el visitante hace clic en la imagen del modal de una obra  
**THEN** el sistema SHALL navegar a `pintura.html?id=<obraId>`  
**AND** mostrar la imagen principal en su versión 2k  
**AND** mostrar un carousel "Detalles" con la portada y las fotos extra de la obra (thumbnails)  
**AND** al hacer clic en un thumbnail, cambiar la imagen grande a la versión 2k de esa foto.  
**WHY**: apreciar la obra a máxima resolución y sus detalles sin recargar la galería.

### RF-12: Precio en detalle solo si está disponible ✅
**WHEN** el visitante abre la página de detalle `pintura.html?id=<obraId>`  
**AND** la obra tiene `disponible: true`  
**THEN** el sistema SHALL mostrar el precio al final de la información, después de la ficha técnica  
**UNLESS** la obra no está disponible (`disponible: false`), **THEN** el sistema SHALL ocultar el precio por completo (sin texto ni espacio reservado).  
**WHY**: el precio solo es relevante cuando la obra se puede adquirir; mostrarlo en obras vendidas no aporta.  
**IMPL**: `js/pintura.js` → `renderizarDetalle()` usa `o.disponible && o.precio`; el `<p id="pintura-precio">` queda con atributo `hidden`. Formato con `formatoMoneda()` (USD).

### RF-13: Tamaños de imagen al subir ✅
**WHEN** el admin sube la **foto principal** de una obra  
**THEN** el navegador SHALL generar tres versiones: **thumb 400 px** (lado mayor, tarjetas), **medium 1200 px** (lado mayor, modal y ficha) y **HD**  
**AND** el HD SHALL ser de **1920 px de ancho** si la imagen es horizontal y de **1080 px de ancho** si es vertical  
**WHEN** el admin sube una **foto de detalle**  
**THEN** el navegador SHALL generar solo dos versiones: **thumb 400 px** (tira de miniaturas de la ficha) y **HD** (misma regla) para verla ampliada.  
**AND** el servidor SHALL guardarlas en `img/` como `<base>_thumb.jpg`, `<base>_medium.jpg`, `<base>_hd.jpg`  
**AND** la obra SHALL guardar `imagen`, `imagenMedium`, `imagenHD` y, por cada detalle, `{thumb, hd}`.  
**UNLESS** la foto original sea menor que el tamaño objetivo, **THEN** SHALL guardarse sin ampliar.  
**WHY**: la tarjeta necesita poco peso, la ficha una imagen nítida y el zoom la máxima calidad útil — y las miniaturas de detalle no necesitan versión intermedia.  
**IMPL**: `js/imagenes.js` (`generarTresTamanos` / `generarDosTamanos` con canvas) + `POST /api/imagenes` (`server.js`). Sin dependencias nuevas.

### RF-14: Admin con dos acciones ✅
**WHEN** el usuario entra a `admin.html` (con la contraseña correcta)  
**THEN** ve dos botones: **Editar** y **Subir obra**  
**AND** *Editar* despliega las obras agrupadas por serie, con el mismo carrusel de la Home; al pulsar una obra abre `editar.html?id=<obraId>`  
**AND** *Subir obra* abre `subir.html` con el formulario de alta (datos + portada + detalles).  
**WHY**: separar la entrada en dos acciones evita el formulario largo con todas las secciones apiladas.  
**IMPL**: `admin.html` + `js/admin.js`; formulario compartido en `js/obra-form.js`; sesión con cookie HttpOnly (`POST /api/login`).

### RF-15: Buscar obras por nombre ✅
**WHEN** el visitante escribe en el campo de búsqueda de la barra de filtros (a la derecha de «Todos los tamaños»)  
**THEN** el listado SHALL mostrar solo las obras cuyo título contenga ese texto  
**AND** la comparación SHALL ignorar mayúsculas y tildes («atardecer» encuentra «Atardecer Amarillo»)  
**AND** la búsqueda SHALL combinarse con los demás filtros y con la vista VER TODO.  
**WHY**: con 50+ obras, encontrar una por nombre a mano es lento.  
**IMPL**: `js/home.js` → `filtrosHome.texto`, `normalizarBusqueda()` y `aplicarFiltros()`; entrada con retardo de 180 ms y Escape para limpiar.

### RF-16: Seguridad del admin ✅
**WHEN** el administrador entra con la contraseña correcta  
**THEN** el servidor SHALL emitir una cookie `HttpOnly`, `SameSite=Lax`, sin fecha de expiración propia  
**AND** la sesión SHALL cerrarse tras **5 minutos sin actividad**, tanto en el servidor (`SESION_TTL`) como en el navegador (vigilante de `admin-gate.js`)  
**AND** tras **8 intentos fallidos** desde una misma IP, el acceso SHALL bloquearse 15 minutos (HTTP 429).  
**WHY**: el admin permite modificar y borrar obras; una sesión eterna en un equipo ajeno es un riesgo.  
**IMPL**: `server.js` (`SESIONES` Map con última actividad, `INTENTOS` Map por IP) + `js/admin-gate.js`. Ajustable con `SESION_TTL_MIN`.

### RF-17: Barra lateral con la obra reciente ✅
**WHEN** el visitante abre la home en una pantalla de 900 px o más de ancho  \
**THEN** SHALL verse una barra fija a la **izquierda** (250 px, `#3f3f3f`), pegada al borde superior, con la obra más reciente  \
**AND** si alguna obra tiene `fechaRegistro` en los últimos 30 días, SHALL mostrar la más nueva con el título **«Nueva Obra»**  \
**AND** si no, SHALL mostrar la obra con `fechaModificacion` más reciente con el título **«Obra actualizada»** (si no hay `fechaModificacion`, se usa `fechaRegistro`)  \
**AND** debajo de la imagen SHALL mostrar nombre, tamaño (`ancho × alto cm`, se omite si es 0) y disponibilidad  \
**AND** la imagen SHALL ser la versión `imagenMedium` y enlazar a la ficha de la obra.  \
**WHY**: destacar lo último sin que el visitante tenga que buscarlo.  \
**IMPL**: `js/obra-lateral.js` (`elegirObraLateral()`), markup `#obra-lateral` en `html/index.html`, estilos `.obra-lateral`; el servidor sella `fechaModificacion` en cada `POST`/`PUT` de obras. La barra superior se esconde al bajar (clase `nav-oculta` en el `body`) y la lateral se estira hasta el borde. Se oculta en móvil (<900 px) y el botón × la cierra durante la sesión.

### RF-18: Exportar la galería a PDF ✅
**WHEN** el administrador entra a `admin.html` y pulsa **Exportar PDF**  \
**THEN** SHALL ver la galería agrupada por serie (como en Editar) con una casilla por obra y por serie, los mismos filtros de la galería (serie, año, disponibilidad, tamaño, nombre) y un botón **Seleccionar todo** que abarca solo las obras filtradas  \
**AND** al pulsar **Exportar** SHALL pedir un nombre (modal, con la casilla «Mostrar precios») y abrir un HTML nuevo con una portada 1920 × 1080 («Andrés Ramírez Ortiz» / «Obra \<nombre\>»), seguida de las **hojas de índice** (8 obras por hoja en dos columnas, miniatura de 100 × 100 px, nombre y número de página), una **hoja de serie** («Serie: \<nombre\>» y cuántas obras de esa serie se seleccionaron) antes de las obras de cada serie distinta, y **una hoja de 1920 × 1080 por obra**: la imagen ocupando los dos tercios izquierdos y la ficha completa en el tercio derecho  \
**AND** la fila de precio SHALL aparecer solo si se marcó «Mostrar precios» (valor `$1,600` si está disponible, «Consultar» si no)  \
**AND** ese documento SHALL tener un botón fijo «Exportar a PDF» que abre el diálogo de impresión con páginas de 1920 × 1080 px (1440 × 810 pt), una hoja por página.  \
**WHY**: el artista necesita llevar selecciones de obra a PDF sin depender de herramientas externas.  \
**IMPL**: `html/exportar.html` + `js/exportar.js` (`planificarSecciones()` numera las hojas, `construirDocumento()`, `hojaSerie()`, `hojaIndice()`, `prepararImagenes()` con las imágenes embebidas en base64 —grande para la hoja, thumb para el índice—), estilos de impresión con `@page { size: 1920px 1080px }`; alias `/exportar` en `server.js`.

## Cómo iniciar
```bash
cd <ruta-del-proyecto>
npm start          # inicia server.js en puerto 3000
# Abrir: http://localhost:3000/       (Home)
# Abrir: http://localhost:3000/admin.html  (Admin)
```

## Cómo verificar
- `node --check js/*.js` — sintaxis JS sin errores.
- API: `curl http://localhost:3000/api/obras` devuelve JSON.
- Home: galería renderizada con toggle ES/EN funcional.
- Admin: formulario crea obras/series, precio calculado, persiste en `db.json`.
- Serie: `curl http://localhost:3000/serie.html?serie=serie_nubes` → 200, grid de cards de la serie + hero 2K.
- Detalle: `curl "http://localhost:3000/pintura.html?id=obra_nubes_atardecer_amarillo"` → 200, hero 15% + nombre + zoom.
- UI: `grep -c 'max-height: 15vh' css/styles.css` ≥1; `grep -c 'scale(1.25)' css/styles.css` = 0; `grep -c 'border-radius: Npx'` = 0 (solo `50%` indicador).

## 📋 Specs activos
- `specs/galeria-v3-rediseño.md` — Rediseño gráfico completo v3 (mobile-first, parámetros configurables)
