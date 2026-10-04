# Spec: Domain Model — Galería de Arte Web

## Contexto y objetivo

### Contexto
La Galería de Arte Web gestiona pinturas organizadas en series. Cada obra tiene metadatos (título, técnica, dimensiones, año, disponibilidad) y se relaciona con una serie que define su factor de precio. La configuración del sistema persiste preferencias como el idioma (es/EN). El modelo de datos vive en `db.json` y se sirve vía API REST.

### Objetivo
Definir el modelo de datos para las entidades **Obra**, **Serie** y **Config**, incluyendo campos, tipos, validaciones, relaciones y comportamiento ante eliminaciones o modificaciones de series.

---

## Usuarios

- **Visitante**: ve la galería pública (Home). No interactúa con el modelo directamente; solo consume los datos ya procesados.
- **Admin**: gestiona obras y series desde la página Admin. Crea, edita, archiva obras. Crea y modifica series.

---

## Historias de usuario

1. Como Admin, quiero crear una obra seleccionando una serie existente para que el precio se calcule automáticamente con `(ancho + alto) × factorPrecioSerie`.
2. Como Admin, quiero que el sistema rechaze obras con datos inválidos (ancho ≤ 0, año futuro, serieId que no existe) mostrando un error específico, para mantener la integridad de los datos.
3. Como Admin, quiero que al eliminar una serie, las obras asociadas se archiven automáticamente (no se borren) para conservar el historial.
4. Como Visitante, quiero ver obras ordenadas por `fechaRegistro` (más recientes primero) en la galería.
5. Como Admin, quiero que al cambiar `factorPrecioSerie` de una serie, el precio de todas las obras asociadas se actualice automáticamente.
6. Como Admin, quiero que el idioma de la interfaz se persista entre sesiones para que no tenga que cambiarlo cada vez.

---

## Requisitos funcionales

### RF-01: Crear obra con campos requeridos y validación
**WHEN** el Admin crea o edita una obra **THEN** el sistema SHALL validar que todos los campos están presentes y son válidos:
  - `titulo`: string no vacío
  - `tecnica`: string no vacío
  - `ancho`: número entero > 0
  - `alto`: número entero > 0
  - `anio`: entero, ≤ año actual
  - `serieId`: string que referencia una serie existente
  - `disponible`: boolean
  - `image`: string no vacío (file path válido)
  - `imagen2k`: string (path a la versión 2k de la portada)
  - `detalles`: array de objetos `{thumb, full}` (fotos extra: thumbnail + 2k)
  - `fechaRegistro`: string fecha válida

**AND IF** algún campo es inválido, **THEN** SHALL rechazar la operación y mostrar error específico (ej: "ancho debe ser mayor a 0").

**AND IF** todos los campos son válidos, **THEN** SHALL calcular el precio con RF-02 y guardar la obra.

### RF-02: Calcular y guardar precio
**WHEN** una obra se crea o edita **THEN** el sistema SHALL calcular el precio como `(ancho + alto) × factorPrecioSerie` de la serie asociada **AND** SHALL guardar el resultado como número entero ≥ 0 en el campo `precio`.

### RF-03: Relación obra → serie (foreign key)
**WHEN** una obra se crea o edita **THEN** el sistema SHALL requerir que `serieId` referencie una serie existente **AND** SHALL rechazar la operación si la serie no existe en la base de datos.

### RF-04: Archivo por cascade al eliminar serie
**WHEN** una serie se elimina **THEN** el sistema SHALL:
  - Archivar todas las obras que referencian esa serie (establecer `archivado: true`)
  - Mantener las obras en la base de datos (no borrar físicamente)
  - Ocultar las obras archivadas de la galería principal (Home y Admin)

**WHY**: preservar datos históricos; evitar obras huérfanas sin serie.

### RF-05: Recálculo de precios al cambiar factorPrecioSerie
**WHEN** el `factorPrecioSerie` de una serie cambia **THEN** el sistema SHALL recalcular y actualizar el `precio` de todas las obras asociadas a esa serie usando la fórmula `(ancho + alto) × factorPrecioSerieNuevo`.

### RF-06: Ordenar obras por fechaRegistro descendente
**WHEN** las obras se listan (Home, Admin, API) **THEN** el sistema SHALL ordenarlas por `fechaRegistro` de más reciente a más antigua.

### RF-07: Configuración de idioma
**WHEN** la aplicación carga **THEN** el sistema SHALL servir la configuración persistida (`idioma`: "es" o "en") desde el backend **AND** SHALL permitir actualizarla vía API (`PUT /api/config/idioma`).

### RF-08: Serie datos maestros
**WHEN** una serie se crea o edita **THEN** el sistema SHALL validar que:
  - `nombre` (tema): string no vacío
  - `factorPrecio`: entero ≥ 0
  - `price_crc`: string (código de referencia de precio)
  - `proceso` y `reflexiones`: string (puede ser vacío)

### RF-09: Fotos extra (detalles) de una obra
**WHEN** una obra tiene fotos adicionales además de la portada  
**THEN** el sistema SHALL almacenarlas en el campo `detalles` como array de `{thumb, full}`  
**AND** servir solo dos resoluciones por foto: `thumb` (carousel) y `2k` (al hacer click).  
**WHY**: la página de detalle muestra la obra a máxima resolución y sus detalles sin cargar todas las resoluciones.

---

## Requisitos no funcionales

| # | Requisito | Base |
|---|-----------|------|
| RNF-01 | `precio` siempre es entero ≥ 0 | Constitución regla 4 |
| RNF-02 | El precio NUNCA es visible en UI pública (Home) | Constitución regla 4 |
| RNF-03 | Idioma default: español; toggle discreto a inglés | Constitución regla 5 |
| RNF-04 | Obras ordenadas por `fechaRegistro` descendente | Constitución regla 11 |
| RNF-05 | Errores de validación son específicos, no genéricos | Constitución regla 8 (alert) |
| RNF-06 | `factorPrecioSerie` acepta solo enteros (step=1, min=0) | spec.md RF-03 |
| RNF-07 | Mobile-first, sin scroll lateral | Constitución regla 10 |

---

## Casos límite

| Caso | Comportamiento |
|------|----------------|
| Serie con `factorPrecio = 0` | ✅ Válido — precio de obras = 0. [NECESITA ACLARACIÓN: ¿se muestra 0 en Admin?] |
| Una sola obra en la galería | ✅ Debe listarse correctamente (no romper ordenamiento) |
| Múltiples obras con misma `fechaRegistro` | ✅ Ordenamiento estable — mantiene orden relativo |
| Serie eliminada con obras archivadas | ✅ Obras permanecen con `archivado: true`; visibles via toggle |
| Obra con `imagen` file path pero archivo no existe en /img/ | ⚠️ La obra se guarda (path válido), pero el browser muestra imagen rota. [NECESITA ACLARACIÓN: ¿validar existencia del archivo?] |
| Serie creada inline desde formulario de obra | ✅ La serie se persiste inmediatamente; la obra usa el `serieId` recién creado |
| Admin cambia `ancho` de una obra existente | ✅ Precio se recalcula automáticamente con el nuevo ancho |
| Obra sin fotos extra (`detalles` vacío) | ✅ La página de detalle muestra solo la portada 2k, sin carousel "Detalles" |

---

## Fuera de alcance (v1)

- ✅ Gestión de archivos de imágenes (subida, processing, multi-resolution) — spec separado
- ✅ Autenticación o roles de usuario — no hay backend de auth
- ✅ Exportación de datos (CSV, JSON download)
- ✅ Deploy en producción — solo localhost (regla 15)
- ✅ Historial de cambios / audit trail
- ✅ Migración de datos entre formatos
- ✅ Notificaciones o emails transaccionales

---

## Criterios de finalización

- [ ] Todos los campos de Obra definidos con tipo y validación
- [ ] Relación obra→serie (foreign key) especificada con restricción
- [ ] Comportamiento cascade (serie eliminada → obras archivadas) definido
- [ ] Recálculo de precios al cambiar `factorPrecioSerie` especificado
- [ ] Config entidad (idioma) modelada
- [ ] Serie entidad (nombre, factorPrecio, price_crc, proceso, reflexiones) definida
- [ ] Todos los campos listados en casos límite o marcados como [NECESITA ACLARACIÓN]
- [ ] Especificación aprobada por el usuario

---

## Dudas abiertas [NECESITA ACLARACIÓN]

1. **[NECESITA ACLARACIÓN]** ¿Es válido `factorPrecio = 0`? Si es así, el precio de las obras sería 0. ¿Se muestra "0" en Admin o se oculta?
2. **[NECESITA ACLARACIÓN]** ¿Debe el sistema validar que el archivo de imagen referenciado por `imagen` existe físicamente en `/img/` al crear/editar una obra? (actualmente 1 archivo falta: `Vuelta_a_la_hoja_thumb.jpg`)
3. **[NECESITA ACLARACIÓN]** ¿Puede el Admin archivar una obra manualmente (sin eliminar la serie)? El spec.md RF-06 menciona archivar via obra individual.
4. **[NECESITA ACLARACIÓN]** ¿La configuración `idioma` es la única key en Config, o se esperen más keys en el futuro? (ej: `theme`, `itemsPerPage`)
5. **[NECESITA ACLARACIÓN]** ¿Qué formato exacto usa `fechaRegistro`? ISO 8601 (`YYYY-MM-DD`) o incluye timestamp (`YYYY-MM-DDTHH:MM:SS`)?
