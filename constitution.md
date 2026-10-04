# Constitución — Galería de Arte Web

1. **Stack**: HTML5, CSS3, JavaScript vanilla (frontend) + Node.js/Express (backend).
2. **Estructura**: tres carpetas para el frontend web (`html/`, `css/`, `js/`) + backend en la raíz (`server.js`, `package.json`, `db.json`). Otras carpetas del proyecto (docs, herramientas) son permitidas fuera de estas, pero no pertenecen a la web.
3. **Persistencia**: backend Express + archivo JSON (`db.json`), servido vía API REST.
4. **Precio**: `(ancho+alto) * factorPrecioSerie`. Se guarda en `obra.precio`; NUNCA visible en la UI (ni Home ni Admin); se revela solo vía email de consulta (`mailto:`).
5. **Texto**: interfaz en español. Toggle discreto para cambiar a inglés (persiste en backend).
6. **Código**: legible para principiante — nombres claros, funciones cortas, comentarios explicativos.
7. **Estilo**: claridad y composición de Apple como base (no definitivo, puede evolucionar).
8. **Validación**: `alert()` para errores de formulario. No usar `confirm()` ni `prompt()`.
9. **Verificación**: `node --check js/*.js` + `npm start` + prueba manual en navegador.
10. **Responsividad**: mobile-first. Sin scroll lateral.
11. **Orden**: obras más recientes primero (fechaRegistro descendente).
12. **UI**: Home muestra galería + header + sidebar (no formulario). Formulario en página Admin aparte. Consulta de precios vía mailto (modal → email).
13. **Imágenes**: FileReader para preview, data URL (base64) en JSON.
14. **Separación**: lógica de datos (data.js) no manipula el DOM directamente.
15. **Alcance**: no añadir funcionalidades fuera del mensaje original del usuario.
