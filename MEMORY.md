# MEMORY.md — Diario de Estudio

## Estado actual

- **v2.3 UI/UX actualizada**: header hero fijo al **15%** de altura (PC y móvil); franja de pestañas de series encima del header (home/serie/pintura) → hamburguesa móvil; cards sin zoom ni `border-radius` (`border-radius:0`, indicador disponible conserva `50%`/círculo); franja de filtro compacta (40px, full-width alineada al hero), font header fino/pequeño (`500`/`1.3rem`); modal centrado vertical+horizontal; página `pintura.html` reúne layout hero 15% + efecto frost; `fechaRegistro` retirado de info visible (modal); i18n key `disponibilidad` = "Disponibilidad"/"Availability"; nueva página `serie.html` + `js/serie.js`.
- **v2.2 Home rediseñada**: hero header con fondo 2K obra más reciente + "Andrés Ramírez Ortíz", sidebar obra reciente, sección "año actual" (por serie), galería por serie con carousel horizontal, filtro años/disponibilidad, sin "Galería de Arte" ni búsqueda por título, paleta grises claros.
- **v2.1 Backend/DB completada**: migrado de localStorage a Express + JSON (db.json). data.js usa fetch() async; server.js sirve archivos estáticos + API REST.
- **Detalle de obra** (`html/pintura.html?id=...`): imagen principal 2k + carousel "Detalles" (portada + fotos extra; thumbnail → 2k al click).
- **Admin** (`html/admin.html`): formulario con tabs (Obra/Serie), secciones expandibles, galería filtrable, editar y archivar obras.
- **i18n**: toggle ES/EN persiste en backend (`/api/config/idioma`).
- **Precio**: `(ancho+alto) × factorPrecioSerie`, entero, oculto en toda la UI (Home y Admin); se revela solo vía email de consulta (mailto).
- **Imagen**: upload con preview (FileReader), validación MIME, base64 en JSON. Obras importadas con `imagen` (thumb), `imagen2k` (2k) y `detalles` (array `{thumb, full}`).
- **7 JS**: `data.js` (API+i18n+utils), `gallery.js` (render/filtros/modal), `form.js` (forms), `home.js` (init Home), `admin.js` (init Admin), `pintura.js` (detalle obra), `serie.js` (página serie).

## Aprendizajes y errores a evitar

- `path.dirname(__dirname)` en Node → usar `__dirname` directamente.
- MSYS no traduce paths para herramientas nativas. Usar `E:/...` forward slashes o `workdir`.
- `better-sqlite3` no compila en Windows sin VS Build Tools → Express + JSON es suficiente.
- Orden de scripts: `data.js` → `gallery.js` → `form.js` → `admin.js` (Admin). `data.js` → `gallery.js` → `home.js` (Home). `data.js` → `gallery.js` → `serie.js` (Serie). `data.js` → `pintura.js` (Detalle).
- fetch() en Node requiere URL absoluta; en browser, relative URL `/api` funciona via Express static.
- db.json se borra para resetear datos; server lo recrea automáticamente.
- Las fotos extra de cada obra viven en `CUADROS/<serie>/<obra>/processed/` (nombres `-detalle-N` o `_2`); solo se usan `_thumb` y `_2k` (sin medium).

## Decisiones (y por qué)

- **Backend/DB sobre IndexedDB**: usuario prefirió backend (Express + JSON) para persistencia más robusta. localStorage = fácil pero se borra; db.json = persistente.
- **Home + Admin separadas**: visitante ve galería; admin gestiona desde Admin.
- **Página de detalle con 2k + carousel**: click en imagen del modal → página de la obra con la 2k principal y carousel "Detalles" (portada + fotos extra). Extra = solo thumb + 2k (sin medium).
- **Precio oculto en UI**: nunca visible sin click explícito; se revela solo vía mailto.
- **Async/await**: localStorage era síncrono; fetch es async → toda la cadena es async (DOMContentLoaded, render, filtros, guardado).
- **Paleta grises claros**: fondo `radial-gradient(circle at 30% 30%, #ffffff 0%, #ececee 100%)`, cards blancas, acentos grises (#6a6a70, #7c7c82, #7a7a80).

## RF implementadas (v2.2)

- RF-01: Serie inline vía link "Crear nueva serie" → cambia a pestaña Serie.
- RF-04: Consulta de precios por email (mailto) con obras seleccionadas + precios.
- RF-06: Archivar obras/series (soft delete) + toggle "Ver archivadas".
- RF-08: Editar obra (sección expandible "Editar obra" + PUT /api/obras/:id).
- RF-10: Página de detalle de obra (pintura.html) con imagen 2k + carousel "Detalles".
- RF-11: Hero header con fondo 2K de obra más reciente + nombre personal.
- RF-12: Sidebar con obra más reciente.
- RF-13: Galería por serie con carousel horizontal (no por año).
- RF-14: Filtro años solo muestra años con obras vivas.

## Próximos pasos

- [ ] Deploy: subir server.js + html/css/js a Railway o Render.