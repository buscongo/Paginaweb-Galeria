# MEMORY.md — Diario de Estudio

## Estado actual (v2.4)

- **v2.3 UI/UX**: header hero fijo al 15% de altura; franja de pestañas de series arriba del header; cards sin zoom ni `border-radius`; franja de filtro compacta (40px); modal centrado; `pintura.html` con layout hero 15% + frost; `serie.html` nueva; i18n toggle ES/EN.
- **v2.4 Despliegue**: Layout 2 implementado en `pintura.html` (imagen arriba, info debajo); botón Volver `history.back()`; botón VER TODO con animación; secciones colapsables expandibles; deploy a GitHub `buscongo/Paginaweb-Galeria` completo.
- **v2.5 Home sin duplicación** (`d46f95f`): una sola vista en `#contenido-obras` controlada por `body.ver-todo-activo` → carruseles por serie (default) o secciones colapsables (VER TODO). Eliminadas `franja-nuevas`, `galeria-series` y `series-container` duplicados. Verificado con DOM stub: 52 tarjetas / 5 series en ambos modos.
- **7 JS**: `data.js`, `gallery.js`, `form.js`, `home.js`, `admin.js`, `pintura.js`, `serie.js`.

## Aprendizajes y errores a evitar

- `node --check` solo valida sintaxis: NO detecta funciones llamadas pero indefinidas (`ReferenceError` en runtime). Tras un refactor, verificar que toda función invocada siga definida.
- Refactor de home.js (v2.5): se borraron `cachearNuevas()` y `crearFilaSerie()` estando aún en uso → la home quedó vacía mientras `serie.html` seguía bien.
- Un error en `DOMContentLoaded` aborta TODO el render de la página: si una vista queda vacía y otra no, buscar primero un ReferenceError, no el CSS ni la API.
- El navegador cachea `js/*.js` con fuerza: tras desplegar, probar con Ctrl+Shift+R o incógnito antes de diagnosticar.
- `path.dirname(__dirname)` → usar `__dirname` directamente.
- MSYS no traduce paths nativos → usar `E:/...` o `workdir`.
- Orden de scripts: siempre `data.js` primero (define funciones globales).
- `fetch()` en Node requiere URL absoluta; en browser, relative `/api` funciona via Express static.

## Decisiones

- **Mobile-first**: Prioridad en diseño responsivo desde 0.
- **Paleta**: variables CSS `--bg-primary`, `--text-primary`, `--accent` para tema.
- **Precio oculto**: nunca visible en UI; revelado solo vía mailto.

## RF implementadas

- RF-01: Serie inline vía link "Crear nueva serie".
- RF-04: Consulta de precios por email (mailto).
- RF-06: Archivar obras/series (soft delete).
- RF-08: Editar obra (sección expandible).
- RF-10: Página detalle obra (Layout 2 implementado).
- RF-11: Hero header 2K obra más reciente + nombre personal.

## Próximos pasos

- [ ] **v3.0 Rediseño gráfico**: ver `specs/galeria-v3-rediseño.md`
- [ ] Confirmar parámetros móviles/desktop con usuario
- [ ] Implementar Fase 0: Documentación crítica

## 🔗 Enlaces útiles

- Spec v3: `specs/galeria-v3-rediseño.md`
- Repo GitHub: https://github.com/buscongo/Paginaweb-Galeria