# Revisión del flujo del colaborador

Los cambios se hicieron sobre `recuperar-frontend`, conservando las modificaciones locales que ya existían en Home y Nueva visita. No se hicieron commits, push ni modificaciones fuera de `frontend/`.

## Páginas

| Archivo bajo `src/pages/` | Cambios |
| --- | --- |
| `Login/LoginPage.tsx` | Marca y color unificados, campos con autocompletado, errores accesibles, control de contraseña etiquetado. La sesión demo ya no guarda la contraseña. |
| `Home/HomePage.tsx` | Conserva la composición desktop del usuario. Historial y resumen derivados de las visitas, fecha actual, continuidad según el paso pendiente y sincronización diferenciada de conectividad. |
| `NewVisit/NewVisitPage.tsx` | Conserva buscador, selección, área opcional, resumen desktop y acciones móviles. Identificadores de visita, errores de almacenamiento y protección frente a sobrescribir una visita abierta. |
| `Capture/CapturePage.tsx` | Panel de contexto desktop, texto compartido Chat/Voz, transcripción editable, borrador persistente, foto con vista previa y almacenamiento local (máximo 2 MB), eliminación de foto y errores recuperables. |
| `Review/ReviewPage.tsx` | Tarjetas editables en grid desktop, borradores persistentes, añadir/eliminar equipos con IDs únicos, estados vacíos y etiquetas accesibles. No crea equipos ficticios cuando no reconoce el texto. |
| `Match/MatchPage.tsx` | Comparación lado a lado en desktop y apilada en móvil. Decisiones independientes, persistencia al recargar y confirmación bloqueada hasta resolver todos los candidatos. |
| `Success/SuccessPage.tsx` | Distingue observación guardada de visita finalizada. Conserva todas las observaciones al añadir otra y publica la visita finalizada en el historial local. Elimina los `any` anteriores. |
| `Visits/VisitsPage.tsx` | Misma fuente de datos que el detalle, conteos calculados, búsqueda, filtros, estados vacíos y opción para ocultar los ejemplos. |
| `VisitDetail/VisitDetailPage.tsx` | Datos locales y demo consistentes, títulos descriptivos, modo de captura, hora cuando existe, texto original, foto y equipos nuevos/vinculados. Estado de sincronización legible en móvil. |

## Componentes y archivos compartidos

- Nuevo `src/components/AppLayout.tsx`: encabezado compartido, navegación horizontal desktop, navegación inferior móvil, conexión reactiva, salida de sesión, protección de rutas y pantalla de error recuperable.
- Nuevo `src/components/VisitContext.tsx`: hospital, área, progreso y ayuda contextual en desktop.
- Nuevo `src/data/visitStore.ts`: tipos de visita/observación/equipo, lectura compatible de las claves anteriores, guardado sin duplicados, finalización y continuación del flujo.
- Nuevo `src/data/visits.ts`: ejemplos existentes extraídos del detalle y fuente común del historial.
- Nuevo `src/data/demoExtraction.ts`: extracción demo conservadora; no distribuye atributos ambiguos entre varios equipos ni inventa un equipo de respaldo.
- Modificado `src/index.css`: sistema visual, gradiente principal, composiciones responsive, foco visible, navegación, estados y reducción de movimiento.
- Modificado `src/routes/router.tsx`: conserva todas las rutas solicitadas e incorpora protección demo y requisitos de los pasos.
- Nuevos `tests/visit-flow.test.mjs` y `tests/browser-flow.mjs`: pruebas de almacenamiento, extracción y recorrido del navegador.
- Nuevo `FRONTEND_REVIEW.md`: este reporte.

No se añadieron dependencias al proyecto ni se cambiaron `package.json` o el lockfile. Se mantienen React, TypeScript, Vite, Tailwind y lucide-react.

## Funcionalidad conservada y mejorada

Se conservan login demo, hospital y área opcional, sugerencias, voz demo, fotografía opcional, múltiples equipos, edición manual, coincidencias, otra observación, finalización, búsqueda y detalle. Ahora finalizar almacena el conjunto de observaciones de la visita; antes se limpiaba la observación previa y el historial utilizaba únicamente ejemplos desconectados.

Las claves anteriores siguen siendo legibles. Las observaciones antiguas sin `title` obtienen un título descriptivo al mostrarse; si falta la hora se indica “Hora no informada”. No se inventa información ausente. Los datos JSON inválidos no se eliminan automáticamente.

## Datos todavía simulados y límites

- Usuarios y hospitales de demostración; autenticación local, sin servidor.
- Voz: detener agrega una transcripción de ejemplo. No se graba audio real.
- Extracción, confianza y candidatos de coincidencia son demo. La extracción reconoce resonadores, tomógrafos, ultrasonidos y rayos X; otros equipos pueden añadirse manualmente. En frases ambiguas los atributos quedan desconocidos.
- Las tres visitas históricas son ejemplos, identificados como tales; pueden ocultarse en Mis visitas.
- Las visitas nuevas quedan **pendientes** aunque haya conexión. No existe envío ni sincronización real con el backend.
- Los borradores y fotos viven en el almacenamiento de este navegador. El estado offline permite continuar una sesión ya cargada; no se implementó una PWA para arrancar la aplicación sin red.

## Validación

Desde `frontend/`, usando `npm.cmd` porque PowerShell bloquea `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run lint
node --test tests/visit-flow.test.mjs
```

- Instalación y build correctos.
- Lint correcto, sin errores ni advertencias.
- Cuatro pruebas de datos aprobadas con Node 24: extracción conservadora, varias observaciones sin duplicados, bloqueo de decisiones incompletas y compatibilidad con valores antiguos.
- Recorrido en Chromium, contexto aislado: login y protección, nueva visita, cambio Chat/Voz, edición y recuperación tras recargar, tres equipos con decisiones independientes, segunda observación, finalización, búsqueda y detalle con cuatro equipos, extracción vacía y estado offline.
- Capturas de las nueve páginas en 1366 × 900 y 390 × 844; comprobación de desbordamiento horizontal y revisión visual de composiciones representativas. Sin errores JavaScript en el recorrido.
- `git diff --check` correcto; sin cambios fuera de `frontend/`.

El navegador integrado no pudo inicializar su dependencia de confianza. La comprobación se realizó con Playwright temporal, sin añadirlo a las dependencias, usando un Chromium local y un perfil aislado. El script opcional acepta las rutas locales de Playwright y Chromium:

```powershell
node tests/browser-flow.mjs "RUTA_A_PLAYWRIGHT/index.mjs" "RUTA_A_CHROMIUM/chrome.exe"
```

Requiere el servidor de desarrollo en `http://127.0.0.1:5173`; genera capturas ignoradas por Git dentro de `dist/qa/`.

## Siguiente etapa

Conectar extracción y voz reales, definir contratos de visitas/observaciones/equipos con el backend y migrar fotos y cola de sincronización a IndexedDB. Añadir autenticación real y confirmación del servidor antes de marcar un registro como sincronizado. Para uso offline completo, incorporar caché de aplicación y una estrategia explícita de reintentos y conflictos.
