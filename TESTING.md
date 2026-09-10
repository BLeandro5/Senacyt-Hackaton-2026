# Pruebas locales del sistema

Esta versión está preparada para pruebas funcionales del flujo principal. No es una entrega de producción ni una declaración de que toda la Fase 2 esté completa.

## Abrir la aplicación

Interfaz: http://localhost:5173 (la instancia actual de Vite escucha en localhost).

API y rutas disponibles: http://127.0.0.1:8000/docs

Estado local: http://127.0.0.1:8000/status

Si los servicios no están levantados, abre tres terminales desde la raíz del repositorio:

```powershell
# Terminal 1: IA local, sin descargar modelos
npm.cmd run qvac:start
```

```powershell
# Terminal 2: API; --reload evita seguir usando rutas antiguas
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
# Terminal 3: interfaz
cd frontend
npm.cmd run dev -- --port 5173 --strictPort
```

No ejecutes dos instancias de QVAC. Espera el mensaje `QVAC SDK ready` antes de analizar. En esta máquina se han observado consultas de decenas de segundos; el timeout de inferencia es 180 segundos. Si está ocupado, espera a que termine la petición anterior. Recarga la interfaz con Ctrl+F5 si estaba abierta antes de actualizar el código.

## 1. Registro → visita → análisis → guardado

1. Abre `/register`. Crea un colaborador de prueba con correo y cédula que no existan. Las contraseñas se almacenan hasheadas.
2. Entra con su correo o cédula y contraseña.
3. Nueva visita → Hospital Santo Tomás (`HOSP-001`) → Radiología.
4. Escribe exactamente: `Dos resonadores Siemens y un tomógrafo Philips de siete años.`
5. Analiza. Revisa 2 MRI Siemens con edad desconocida y 1 CT Philips con edad 7; no deben aparecer ciudad/país inventados.
6. En Review, responde u omite las preguntas (máximo dos); corrige los campos si hace falta. Confirma la revisión.
7. En coincidencias, confirma cada equipo como nuevo para este primer ensayo. Si ya existen registros de pruebas, comprueba los candidatos antes de decidir.
8. Continúa y finaliza la visita en la pantalla de éxito. Guardar una observación intermedia no equivale a finalizar toda la visita.
9. Abre Mis visitas, entra al detalle y verifica nota original, equipos y colaborador. Recarga o reinicia FastAPI y repite la consulta: los datos deben permanecer.

## 2. Captura rápida y hospital propuesto

Desde Inicio abre Captura rápida. Usa:

`Estoy en Hospital Santo Tomás en Panamá. Vi un tomógrafo Philips que parece tener unos ocho años.`

Confirma el hospital del catálogo antes de revisar. Sin hospital seleccionado no se puede continuar. Para un hospital inexistente usa Proponer nuevo hospital (nombre, ciudad, país): quedará Reported, no confirmado. Entra luego como supervisor para confirmarlo.

La nota rápida se conserva localmente al recargar. Si tienes otra visita activa, termínala antes de continuar la captura rápida. La fotografía es un adjunto; no hay OCR ni análisis visual. Voz está explícitamente no disponible.

## 3. Corroboración, conflicto y revisión

- Crea un segundo colaborador y registra un CT Philips de siete años en el mismo hospital. Elige el activo anterior como “Es el mismo equipo”. El número de activos no aumenta; sí las evidencias y los observadores independientes.
- Repetir con el mismo colaborador no cuenta como otro observador independiente.
- Un tercer colaborador puede reportar Siemens para ese mismo CT. Selecciona explícitamente el activo desde el selector del mismo hospital/modalidad y confirma solo para este ensayo de conflicto. El valor canónico no debe sobrescribirse; aparece conflicto y baja la confiabilidad.
- También puedes elegir “No puedo decidir · Enviar a revisión”. La evidencia se guarda y aparece en la cola, sin crear un activo ficticio.

Supervisor demo local: usuario `supervisor`, contraseña `demo123`. Es un acceso de prototipo, no autorización de producción.

En `/supervisor/review`: confirmar hospital, mantener en verificación, vincular evidencia pendiente, crear activo, aceptar valores de una evidencia o separar como otro equipo. Los cambios se guardan en SQLite y generan eventos de auditoría. Aceptar valores no borra evidencias históricas contradictorias; separarlas resuelve la contradicción cuando eran equipos diferentes.

## 4. Customer 360, oportunidades y consultas

Abre un hospital desde `/supervisor/hospitals`. Verifica activos consolidados, evidencias, nombres de colaboradores, notas originales, fecha, factores de confiabilidad y frescura.

Una edad mayor a 7 años activa “Posible oportunidad de renovación”. Es una señal de seguimiento comercial, no una recomendación clínica ni una orden de reemplazo.

Pregunta en el panel: `Muéstrame resonadores de más de siete años.` Revisa los filtros interpretados visibles. MedPsy no ejecuta SQL: propone filtros validados y los resultados salen de SQLite. Una sola modalidad por consulta; las preguntas ambiguas pueden requerir reformulación.

## 5. Datos sintéticos opcionales

Solo si quieres añadir datos claramente DEMO a tu inventario local:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts/seed_demo.py
```

Crea 3 hospitales DEMO, 3 colaboradores DEMO, 5 activos y 7 evidencias: corroboración, conflicto, frescura distinta y edades >7. Es idempotente; no borra datos existentes ni se ejecuta al iniciar. No se ejecutó sobre tu inventario como parte de esta verificación.

## 6. Pruebas repetibles sin contaminar tu inventario

```powershell
# Desde backend; QVAC debe estar libre y listo
.\.venv\Scripts\python.exe scripts/smoke_system.py
.\.venv\Scripts\python.exe scripts/benchmark_multilingual.py --limit 3
# Benchmark ampliado de 15 casos; requiere más tiempo
.\.venv\Scripts\python.exe scripts/benchmark_multilingual.py
# Unitarias, no necesitan IA encendida
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

Desde la raíz:

```powershell
npm.cmd test --prefix frontend
npm.cmd run build --prefix frontend
npm.cmd run lint --prefix frontend
```

Informes: `benchmarks/results/system-smoke.json` y `multilingual.json`. Los ejemplos son sintéticos. Las métricas operativas se guardan sin notas ni respuestas de usuarios en `benchmarks/results/inference.jsonl`.

## 7. Idioma, apariencia y sin Internet

Settings guarda la preferencia de idioma y apariencia claro/oscuro/sistema. La UI completa aún no está traducida: usa español para la aceptación principal. Las notas ES/EN/PT se analizan localmente; textos muy breves o ambiguos pueden devolver idioma `other`.

Con los tres servicios levantados, desconecta Wi-Fi y repite login, captura, análisis, guardado e historial. No detengas los servicios ni cambies el host local. La inspección del frontend no encontró fuentes/CDNs/API remotas necesarias para el core. La prueba de desconexión física queda para QA manual.

No introducir información identificable de pacientes. No confundir este prototipo local con una aplicación multiusuario segura para exposición en Internet.
