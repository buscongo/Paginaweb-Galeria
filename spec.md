# spec.md — Galería de Arte Web v2

## Resumen
Web estática (HTML/CSS/JS vanilla) con cuatro páginas: **Home** (hero header, franja de pestañas de series arriba del header, sección "año actual", galería por serie), **Admin**, **Detalle de obra**, **Login/Admin**. Los precios se calculan automáticamente `(ancho+alto) × factorPrecioSerie`. Header hero = fondo 2K de la obra más reciente con nombre "Andrés Ramírez Ortíz" encima, al 15% de altura (PC y móvil). Se elimina "Galería de Arte" y búsqueda por título. Paleta Kube Hotel (`--bg-primary:#fff`, `--bg-secondary:#f5f5f5`, `--text-primary:#1a1a1a`, `--accent:#0a2463`). Franja de pestañas de series encima del header → hamburguesa móvil; layout idéntico (hero 15% + frost) en home, `serie.html` y `pintura.html`. Cards sin zoom ni `border-radius` (`border-radius:0`, indicador disponible conserva `50%`); `fechaRegistro` no visible en UI pública; i18n `disponibilidad` = "Disponibilidad".

## Alcance

### In scope
- **Home** (`html/index.html`): galería filtrable, sidebar con navegación a Admin, toggle ES/EN, consulta de precios.
- **Admin** (`html/admin.html`): formulario de obras y series (tabs), galería con filtros, secciones expandibles, toggle de obras archivadas, edición de obras.
- **Detalle de obra** (`html/pintura.html?id=...`): imagen principal 2k + carousel "Detalles" (portada + fotos extra; thumbnail → 2k al click).
- **i18n**: toggle discreto, textos estáticos vía `data-i18n`, dinámicos vía `t()`. Persistencia en backend.
- **Precio**: `(ancho+alto) × factorPrecioSerie`. Entero. NUNCA visible en UI pública ni Admin; revelado solo via email de consulta.
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
**WHY**: el precio NUNCA es visible en UI; se revela solo dentro del email de consulta. El visitante no navega a Admin para solicitar; el Admin gestiona y también consulta por email.

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
