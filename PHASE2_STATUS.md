# Estado de integración — listo para pruebas locales

> Actualización de integración: consulta [INTEGRATION_REPORT.md](INTEGRATION_REPORT.md)
> para el estado vigente. Las secciones siguientes conservan el checkpoint anterior;
> voz y navegación Customer 360 ya fueron integradas en el colaborador, sin supervisor.

**Cambio posterior de alcance:** supervisor retirado de la navegación y del login demo. La pantalla principal muestra Observaciones generales de todos los colaboradores, con filtros por país/hospital y búsqueda, y acceso a visitas completas. Las referencias al supervisor abajo describen la implementación anterior, no el flujo vigente. Datos y endpoints conservados; sin borrados.

El flujo principal está preparado para QA manual. Esto NO declara terminada toda la Fase 2 ni lista una aplicación de producción.
Interfaz comprobada por HTTP: http://localhost:5173. API y QVAC activos; estado local ready.
Guía: [TESTING.md](TESTING.md).

## A. Core regression

| Flujo | Resultado y evidencia |
| --- | --- |
| Registro/login | PASS: tres cuentas temporales, contraseñas hasheadas y login por API |
| MedPsy real | PASS: 2 MRI Siemens con edad null y 1 CT Philips de 7 años |
| Review/Match | PASS de lógica/API: revisión, decisión humana, reintentos; QA visual pendiente |
| SQLite/My Visits | PASS: visitas, nota exacta y equipos recuperados desde SQLite |
| Corroboración/conflicto | PASS: mismo activo, más evidencias, score sube; conflicto no sobrescribe y baja score |
| Analytics real | PASS: filtro MRI >7 y resultado SQLite esperado |

El smoke real usa una base temporal y no simula inferencia.
Reporte reproducible: `benchmarks/results/system-smoke.json`; última ejecución correcta: 56.02 segundos.

## B. Features

| Feature | Estado |
| --- | --- |
| Evidence | PASS funcional: estados por atributo y score persistidos; estimaciones conservadoras |
| Reliability | PASS: fórmula determinista, desglose, frescura, corroboración y penalización |
| Follow-up | PARTIAL: máximo 2, por equipo, desconocidos y valores breves; cantidad/grupos complejos se corrigen manualmente |
| Canonical equipment | PASS: activos separados de evidencia, conteos sin duplicar |
| Duplicate suggestion/resolution | PASS funcional: hospital/modalidad, ranking marca/modelo/configuración, decisión humana y envío a revisión |
| Corroboration/conflict | PASS funcional; conflicto de marca/modelo o diferencia de edad >=5; separación auditada |
| Supervisor API/Customer 360 | PASS funcional: inventario, historial, cola, hospitales desde API; visualizaciones avanzadas pendientes |
| Quick Capture | PASS de lógica/API: hospital obligatorio, resolución exacta tolerante a acentos/espacios, nota persistida |
| Proposed hospitals | PASS: propuesta Reported y confirmación persistida con auditoría |
| Freshness/opportunities | PASS: edad >7 señal comercial; no recomendación clínica |
| UI ES/EN/PT | PARTIAL: settings traducido; interfaz principal sigue en español |
| Detected language | PASS en 3 casos reales; detector local conservador, other si ambiguo |
| Natural analytics | PASS en smoke real; filtros seguros, una modalidad por consulta, revisar interpretación visible |
| Dark/settings | PARTIAL: preferencia persistente y estilos básicos; contraste completo pendiente de QA visual |
| Metrics | PASS: métricas reales del SDK; sin notas de usuario en logs operativos |
| Benchmark | PASS herramienta de 15 casos; solo 3/15 ejecutados en la verificación final, los tres pasaron |
| Seed | PASS: dos ejecuciones en SQLite temporal; 3 hospitales, 5 activos y 7 evidencias |
| Offline readiness | PASS inspección de dependencias; desconexión física pendiente de QA manual |

Aceptar valores de una evidencia no elimina las evidencias históricas contrarias; el conflicto permanece visible. Separarlas resuelve la contradicción cuando eran activos diferentes.
El supervisor es un acceso demo local, no autorización robusta de producción. No exponer la API en Internet.
Voz/STT, OCR, visión y sincronización cloud están fuera de alcance y no se simulan.

## C. SQLite

Tablas nuevas: `installed_equipment` y `audit_events`.
Columnas aditivas mediante PRAGMA table_info:
- equipment: evidence_status, reliability_score, reliability_level, reviewed, reliability_factors.
- observations: detected_language, analysis_json.
- hospitals: country, verification_status.
- visits: collaborator_id cuando falta en una base anterior.

Índices: visits_hospital, visits_collaborator, installed_equipment_hospital.
`equipment.matched_equipment_id` vincula evidencia con activo canónico; sin vínculo queda en revisión.
Las migraciones son idempotentes y no recrean ni eliminan la base.
Conservación de datos comprobada con bases temporales. No se ejecutó el seed sobre inventory.sqlite3.

## D. Fórmula exacta

Score = clamp(0,100, información + revisión + frescura + corroboración - conflicto).

- Información (máximo 45): modalidad 10, cantidad exacta 8/estimada 4, fabricante 8, modelo 7, edad exacta 6/estimada 3, configuración 3, condición 3.
- Revisión: 15 si revisado, 5 si solo reportado.
- Frescura: <=30 días 15; <=180 10; <=365 5; >365 0. Fecha inválida/futura: 0 y Unknown.
- Corroboración adicional compatible: 0 observadores 0; 1 observador 12; 2+ observadores 25. No contar otra vez al mismo colaborador ni sumar evidencia incompatible.
- Conflicto material: -25.
- Low <50; Medium 50–74; High >=75.
- Fresh <=180 días; Aging 181–365; Stale >365, separado del score.

No es una probabilidad ni una confianza proporcionada por IA.

## E. Pruebas

- Backend: 49 tests correctos.
- Frontend: 16 tests correctos.
- Build/lint: correctos en la verificación final, incluidos los badges de evidencia.
- Smoke real: todos los checks correctos.
- Benchmark real de aceptación: ES 1/1, EN 1/1, PT 1/1; no extrapolar a accuracy general.
- Seed: idempotencia y conteos en SQLite temporal.
- Sin marcadores de merge ni archivos .orig encontrados.

La automatización visual no pudo iniciarse: el plugin de navegador falló por una restricción de ruta de código confiable. No se declara validación visual completa. La guía manual cubre esa verificación.

## F. QVAC

MedPsy-1.7B, Q4_K_M (imatrix), @qvac/sdk 0.19.0, temperatura 0, semilla 42 y reasoning_budget 0.
Se verifican tamaño y SHA-256 de los pesos al iniciar; no se descargó ni cambió el modelo.
Métricas disponibles en el ensayo: carga, TTFT, prompt tokens, generated tokens, tokens/segundo, tiempo total y dispositivo gpu. Si el SDK no entrega una métrica, se registra null.
El primer fallo 504 y las ubicaciones inventadas motivaron desactivar razonamiento y validar ubicación contra la nota. Las pruebas posteriores pasaron.

## G. QA manual

Ver [TESTING.md](TESTING.md): observación normal, follow-up, captura rápida, corroboración, conflicto, Customer 360, oportunidades, idiomas y desconexión de Internet.

## H. Git

Rama: recuperar-frontend. Cambios locales conservados; archivos modificados y nuevos de backend, frontend, QVAC, scripts, tests y documentación.
No commit. No push. No borrado de datos, modelo ni entorno virtual.
