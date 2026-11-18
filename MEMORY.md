# MEMORY.md — Diario de Estudio

## Estado actual (v2.4)

- **v2.3 UI/UX**: header hero fijo al 15% de altura; franja de pestañas de series arriba del header; cards sin zoom ni `border-radius`; franja de filtro compacta (40px); modal centrado; `pintura.html` con layout hero 15% + frost; `serie.html` nueva; i18n toggle ES/EN.
- **v2.4 Despliegue**: Layout 2 implementado en `pintura.html` (imagen arriba, info debajo); botón Volver `history.back()`; botón VER TODO con animación; secciones colapsables expandibles; deploy a GitHub `buscongo/Paginaweb-Galeria` completo.
- **v2.5 Home sin duplicación** (`d46f95f`): una sola vista en `#contenido-obras` controlada por `body.ver-todo-activo` → carruseles por serie (default) o secciones colapsables (VER TODO). Eliminadas `franja-nuevas`, `galeria-series` y `series-container` duplicados. Verificado con DOM stub: 52 tarjetas / 5 series en ambos modos.
- **v2.6 Menú mobile-first**: `.series-tabs` es hamburguesa + panel vertical hasta 700px (tabs ocultas, `display:block` al abrir); desde 700px se muestran las pestañas en fila. Lógica en `inicializarNav()` dentro de `home.js`, `serie.js` y `pintura.js` (no en `data.js`, que no toca el DOM). Cierra con ESC, click fuera y resize a desktop.
- **v2.7 Filtros + carruseles**: VER TODO vive dentro de `.filtros-barra` (ya no flota ni depende del scroll); en mobile los selects van en `.filtros-selects` (fila desplazable sin barra visible) y VER TODO + Limpiar en `.filtros-acciones`, siempre visibles. `.fila-carousel` usa arrastre táctil con barra de scroll oculta.
- **v2.8 Detalle de obra**: el precio se muestra en `pintura.html` **solo si `obra.disponible`** y va al final de la información (después de la ficha técnica, antes del botón Volver). Regla reflejada en `constitution.md` #4, `spec.md` RF-12 y `AGENTS.md`. Moneda USD: `formatoMoneda()` devuelve `$1,600` (aplica también al email de consulta). En Home/Admin el precio sigue saliendo solo por email.
- **v2.9 Identidad visual**: tipografía **GFS Didot** (Google Fonts) en todo el sitio; paleta en grises (fondo `#808080` = gris 50%, acento `#3a3a3a`, texto `#0d0d0d`); hero de la Home ocupa **33.33vh en mobile** (`≤699px`, clase `home-hero`) y sigue en 15vh en desktop; controles de filtro más pequeños y sutiles, solo sombra neutra (`rgba(0,0,0,.10)`).
- **v3.0 Tema gris con texto blanco**: fondo `#808080` (50%), tarjetas y paneles `#737373` (45%, variable `--bg-card-art`), inputs `#6e6e6e`, barra de series `#545454`; **todo el texto en blanco** (`--text-primary:#fff`, `--text-secondary:#f5f5f5`), acento de relleno `#2b2b2b`. Ojo: blanco sobre el fondo `#808080` da 3.95:1 (bajo AA para texto pequeño); sobre tarjetas/paneles 4.74:1. En `pintura.html` el carrusel de detalles va **debajo de la foto principal** (antes de `.detail-info`). Las `img` de tarjeta usan `padding:4px` (no `margin`) porque `margin` + `width:100%` las corría a la derecha.
- **v3.1 Home y detalle**: las filas de serie van envueltas en `.fila-wrap` con dos botones `.fila-nav` (‹ ›) que se muestran **solo en hover y solo en PC** (`@media (min-width:700px) and (hover:hover)`; `display:none` en mobile) y desplazan `0.8 × ancho`; se ocultan en los extremos (`.oculta`). Eliminado el título "Todas las obras" de la home. En la ficha, `.detail-image-container` ya no tiene `min-height:400px` y la `img` usa `height:auto`, así el recuadro mide exactamente la imagen.
- **v3.2 Datos de imágenes**: `imagen2k` de *Calido encanto* apuntaba a `img_8407_2k.jpg` (macro del tejido) y el de *Un cielo encendido* a `un_cielo_encendido_det_5_2k.jpg` (recorte): la ficha y el hero mostraban la obra cortada. Corregidos a `img_8398_2k.jpg` y `un_cielo_encendido_1_2k.jpg`. Regla: `imagen2k` siempre es la **foto completa** y coincide con el nombre base del thumb; los recortes van solo en `detalles[]`. `img_8407_2k.jpg` quedó sin uso (no tiene thumb para el carrusel).
- **v3.3 Barra de filtros (home)**: sin borde; la separación con el header y con la primera serie es igual a la altura de la propia barra. `home.js → ajustarEspaciadoFiltros()` mide `offsetHeight` y escribe `--filtros-espacio` (se recalcula en resize y con `ResizeObserver`); `.franja-todas` no aporta padding arriba y `.serie-titulo` ya no tiene margen superior (lo traía del `h3` por defecto).
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