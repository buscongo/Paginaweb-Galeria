# AGENTS.md — Galería de Arte Web

Sitio web para registrar, organizar y compartir pinturas. Frontend sin frameworks (HTML/CSS/JS vanilla) + backend Node.js/Express con archivo JSON (`db.json`) como base de datos. Dos páginas: Home (galería pública) y Admin (registro y gestión de obras/series).

## Stack y estructura

- **html/index.html** — Home: galería con header + sidebar, filtros, consulta de precios por email. No muestra formulario.
- **html/admin.html** — Admin: formulario de registro de obras y series (tabs), secciones expandibles, editar y archivar obras.
- **css/styles.css** — Estilos compartidos (Apple-inspired, mobile-first, sistema de diseño con CSS variables).
- **js/data.js** — API REST (`fetch` async) + i18n + utilidades (IDs, fechas locales, cálculo de precio). Sin dependencias del DOM.
- **js/gallery.js** — Renderizado de tarjetas, filtrado, modal de detalles, modal de consulta de precios.
- **js/form.js** — Manejo del formulario Admin (tabs obra/serie, validación, preview de imagen, editar obra).
- **js/home.js** — Inicialización de la página Home.
- **js/obra-lateral.js** — Barra lateral de la home con las obras de los últimos 30 días (`obrasRecientes()`, `pintarLateral()`), la más nueva primero; solo etiqueta «Obra actualizada».
- **js/admin.js** — Inicialización de la página Admin.
- **js/proteger-imagenes.js** — Disuasión de copia en la ficha de obra: clic derecho, arrastre, `Ctrl+S/P/U` y `@media print`.
- **server.js** — Backend Express: sirve estáticos (html/css/js/img) + API REST.
- **db.json** — Base de datos (obras, series, config). Se crea automáticamente si no existe.
- **package.json** — Dependencia: express.

## Comandos

```
# Sintaxis JS (verificar que todo compila)
node --check js/*.js

# Servidor (desde la raíz del proyecto)
npm start          # inicia server.js en puerto 3000

# Abrir en navegador
http://localhost:3000/            (Home)
http://localhost:3000/admin.html  (Admin)
```

No hay build, no hay linter, no hay test runner. La verificación es manual + consulta a la API.

## API REST (server.js)

- `GET /api/obras` (query `?archivadas=true`) — obras ordenadas por `fechaRegistro` descendente.
- `GET/POST /api/obras`, `GET/PUT/DELETE /api/obras/:id` — `DELETE` es soft-delete (`archivado: true`).
- `GET/POST /api/series`, `GET/PUT/DELETE /api/series/:id` — `DELETE` es soft-delete.
- `GET/POST /api/config/:clave` — config persistente (ej: `idioma`).

## Convenciones

- **Nombres de funciones**: `camelCase` en español (`guardarObra`, `renderizarGaleria`, `calcularPrecio`).
- **Clases CSS**: `kebab-case` (`.tarjeta-obra`, `.campo-grupo`, `.modal-overlay`).
- **IDs HTML**: `kebab-case` (`obra-titulo`, `form-serie`, `filtro-busqueda`).
- **Comentarios**: en español, explicando el *por qué*, no el *qué*.
- **Variables de estado**: globales con `var`, declaradas al inicio de cada archivo JS.
- **Scripts**: siempre al final del `<body>`, en orden de dependencias (data.js → gallery.js → form.js → home.js/admin.js).

## Comandos - Tests: `node --test`  

## Reglas - Lee `docs/constitution.md` y la spec activa (`specs/NNN-*/`) antes de tocar código. 

## Reglas de dominio / trampas conocidas

- **Precio**: `precio = (ancho + alto) * factorPrecioSerie`. Se calcula al crear/editar y se guarda en `obra.precio`. Se muestra SOLO en `pintura.html` y SOLO si `obra.disponible` es `true`, después de la ficha técnica. NUNCA se muestra en Home ni Admin; ahí se revela solo vía email de consulta (`mailto:` en gallery.js). Moneda: USD (`$`, separador de miles con coma).
- **Imágenes**: `obra.imagen` = thumb 400, `obra.imagenMedium` = 1200 y `obra.imagenHD` = HD (1920 de ancho si es horizontal, 1080 si es vertical); las tres deben ser la misma foto (mismo nombre base). Los recortes/macros van SOLO en `obra.detalles[]` (`{thumb, hd}`). Si `imagenHD` apunta a un `_det_` o a otra foto, la ficha y el hero muestran la obra cortada. **Todas las obras deben tener `imagenMedium`**: el modal lo usa siempre.
- **Subida de imágenes**: la generación ocurre en el **navegador** con canvas (`js/imagenes.js`): portada en 3 tamaños (`_thumb` 400, `_medium` 1200, `_hd`) y cada detalle en 2 (`_thumb` 400, `_hd`). `POST /api/imagenes` solo escribe los data URLs que recibe. No hay `sharp` ni `multer`: si se agrega procesamiento en servidor, actualizar esta nota y `package.json`.
- **Sesión de admin**: cookie `HttpOnly` sin expiración propia + TTL de **5 min de inactividad** en el servidor (`SESIONES` Map; cada petición renueva) y vigilante equivalente en el navegador (`admin-gate.js`). Tras 8 contraseñas fallidas por IP se bloquea 15 min (429). `SESION_TTL_MIN` permite acortarlo para pruebas.
- **Sufijos de archivo**: `_thumb`, `_medium`, `_hd`. El antiguo `_2k` quedó renombrado a `_hd` (`scripts/migrar-hd.js`); no reintroducirlo.
- **Admin**: protegido por contraseña. `POST /api/login` valida contra `process.env.ADMIN_PASSWORD` (por defecto `andres2026`) y setea una cookie HttpOnly; las escrituras (`POST/PUT/DELETE` de obras, series e imágenes) exigen sesión. Si se cambia la contraseña, reiniciar el servidor con la variable de entorno.
- **Fechas**: usar `new Date()` directamente (zona horaria local). NUNCA `toISOString()` ni `.toUTC*` para fechas mostradas al usuario.
- **Persistencia**: `db.json` (backend). Borrarlo resetea los datos; `server.js` lo recrea vacío.
- **Orden de scripts**: `data.js` debe cargar primero (define funciones usadas por todos). Si se reordena, rompe todo.
- **escaparHTML()**: en gallery.js previene XSS en contenido dinámico. Siempre usarlo para texto de usuario.
- **Expandir/contraer**: `header.nextElementSibling` asume que el `.seccion-content` es el hermano inmediato del `.seccion-header`. No cambiar el orden de los elementos en el HTML.
- **fetch() async**: `data.js` usa `fetch()`. Toda la cadena es async (DOMContentLoaded, render, filtros, guardado). No mezclar con flujo síncrono.
- **Referencias tras refactor**: `node --check` no detecta funciones llamadas pero no definidas. Tras mover/borrar código, verificar que todo lo invocado exista (grep del nombre con `function`) y renderizar la página: un `ReferenceError` en `DOMContentLoaded` deja la vista completamente vacía aunque la API responda bien.
- **Cache del navegador**: los `.js` se cachean agresivamente. Antes de diagnosticar una página vacía en producción, probar Ctrl+Shift+R o incógnito.
- **Vista Home**: `home.js` renderiza en un único contenedor `#contenido-obras`; `body.ver-todo-activo` decide entre carruseles (`crearFilaSerie`) y secciones colapsables. Ambas rutas deben recibir las obras filtradas.

## Límites datos

- `db.json`: obras, series, imágenes (base64), config. Crece con el contenido.
- Imágenes base64 en JSON (~33% más grandes que el binario). Express body limit: 50mb.
- No hay autenticación ni usuarios. Datos viven en el servidor local.

## Forma de trabajar

- **Planificar** antes de reestructurar: leer MEMORY.md → decidir cambios → ejecutar.
- **Tamaño de cambios**: uno por funcionalidad (ej: "añadir filtro por técnica" ≠ "refactorizar todo el CSS").
- **Al terminar**: `node --check js/*.js`, `npm start`, abrir en navegador, verificar interacciones, actualizar MEMORY.md.

- ✅ Siempre: usar `alert()` para validación, nombrar en español, código legible.
- ⚠ Preguntar antes: cambiar la estructura de archivos, añadir nuevas carpetas CSS/JS, modificar el formato de datos en `db.json` o el modelo de datos.
- 🚫 Nunca: mostrar precios en UI, usar UTC para fechas, usar `confirm()`/`prompt()`, tocar archivos fuera del proyecto.
- Nunca avanzar si no ha recibido un OK o una aprobacion explicita del usuario. Siempre preguntar y detenerse.

## Entrevistas al usuario (procedimientos)

- **Opciones clickeables**: al entrevistar al usuario, presentar siempre las respuestas como opciones (a, b, c, d…) y hacerlas clickeables.
- **Preview gráfico**: cuando una pregunta trate un tema gráfico (diseño, colores, layout, tipografía, etc.), preparar un preview con las opciones de respuesta ejemplificadas — cada opción con su propio ejemplo visual.
- **Explicar detalles técnicos**: cualquier aspecto o decisión que involucre un detalle técnico no de principiante se explica en la pregunta y en cada opción de respuesta. Cada explicación: máximo 3 oraciones.

## Verificación

1. `npm test` (`tests/verificar.js`) — datos, imágenes en disco, precios, tamaños y coherencia del código. Debe dar todo ✅.
2. `node --check js/*.js` — sin errores de sintaxis.
3. `npm start` → abrir `http://localhost:3000/` y `http://localhost:3000/admin.html` en navegador.
4. `curl http://localhost:3000/api/obras` → devuelve JSON.
5. Registrar una serie → registrar una obra → verificar en galería.
6. Filtrar obras → verificar resultados.
7. Consultar precio en Home → verificar que abre `mailto:` (el precio no está visible por defecto).
8. Reiniciar el servidor → verificar que los datos persisten en `db.json`.

## Memoria

- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): suma o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md`.
- No guardes nunca datos sensibles (claves, tokens, datos personales).
