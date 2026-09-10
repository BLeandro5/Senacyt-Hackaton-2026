# Senacyt-Hackaton-2026

La consulta general ahora está en **Inicio → Observaciones generales**, para todos los colaboradores: filtros por país y hospital, búsqueda por nota/equipo/colaborador y detalle de visita. El módulo supervisor está retirado de la interfaz; las referencias posteriores a sus pantallas son históricas. No se borraron los datos guardados.

## Prototipo local con MedPsy

Flujo actual: captura → `POST /observations/analyze` → FastAPI → extractor →
servicio local en `127.0.0.1:11500` → `@qvac/sdk` → MedPsy.

Modelo oficial: [QVAC MedPsy-1.7B](https://huggingface.co/qvac/MedPsy-1.7B-GGUF),
cuantización Q4_K_M con imatrix. En el SDK 0.19.0 su identificador es
`HEALTHCARE_1_7B_MEDICAL_Q4_K_M`. MedPsy realiza toda la extracción de equipos
del flujo principal: no hay fallback a MedGemma ni inferencia remota.
El servicio verifica tamaño y SHA-256 de los pesos oficiales antes de cargar.
La ficha declara inglés como idioma; la calidad en cada idioma debe medirse con
nuestros casos. Para extracción usamos `reasoning_budget: 0`, temperatura
0 y semilla 42. El SDK separa el razonamiento del texto final y Python valida
el JSON; no usamos gramática JSON forzada, incompatible con el razonamiento
en esta combinación de SDK y modelo. Esta configuración no reproduce los
benchmarks médicos del autor. El razonamiento está desactivado para reducir la
latencia de extracción; no se almacena razonamiento interno.

### Versión para pruebas de integración

Consulta [TESTING.md](TESTING.md) para el flujo de prueba completo y
[PHASE2_STATUS.md](PHASE2_STATUS.md) para el alcance y las limitaciones.
La prueba `backend/scripts/smoke_system.py` usa MedPsy real y una SQLite temporal:
registro/login, extracción, persistencia, corroboración, conflicto y analytics.
No añade datos de ensayo al inventario habitual.

La base instalada ahora separa **activos canónicos** de **evidencias**. Las
coincidencias requieren decisión humana; una evidencia puede enviarse a revisión.
El colaborador usa `/hospitals`, `/hospitals/:hospitalId` y
`/review`, con datos de API/SQLite, confiabilidad explicable,
historial, frescura y señales de renovación por edad >7 años.
La captura rápida exige confirmar hospital. Las ubicaciones no mencionadas se
descartan y los idiomas ES/EN/PT se detectan localmente de forma conservadora.
Settings permite apariencia e idioma de sus textos; la traducción del resto de
la interfaz sigue pendiente. Voz/STT local en español usa Vosk; la transcripción
es editable y el audio no se guarda. OCR es opcional y requiere Tesseract instalado.

Integración actual y límites: [INTEGRATION_REPORT.md](INTEGRATION_REPORT.md).
Dashboard `/dashboard`, geografía esquemática offline `/map`, detalle/auditoría
`/equipment/:assetId` y consultas `/analytics` están en la navegación del colaborador.
No existe un rol supervisor activo.

### Ejecutar en Windows

Requisitos: Node.js 24, Python con las dependencias de `backend/requirements.txt`
y los pesos MedPsy descargados. Instalar dependencias JS con
`npm.cmd ci` en la raíz y `npm.cmd ci --prefix frontend`.

Descargar una sola vez los pesos oficiales (~1,28 GB):

```powershell
npm.cmd run qvac:download
```

La descarga usa Hugging Face con revisión fija y verifica SHA-256.
Los pesos quedan en `models/`, ignorado por Git.

En tres terminales desde la raíz:

```powershell
# 1. Carga los pesos una vez; no necesita qvac serve.
npm.cmd run qvac:start
```

El servicio busca `models/medpsy-1.7b-q4_k_m-imat.gguf` en el proyecto.
Si está en otra ubicación, definir antes `$env:QVAC_MODEL_PATH` con la ruta
absoluta al mismo GGUF oficial de MedPsy. No acepta pesos de otro modelo ni
descarga modelos automáticamente al iniciar el servidor.
Evitar mantener otro servidor con el mismo modelo cargado para no duplicar memoria.

```powershell
# 2. API
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
# 3. Interfaz
cd frontend
npm.cmd run dev -- --port 5173 --strictPort
```

Escribir una observación en captura y analizar. La respuesta real de MedPsy
se guarda con la observación y abre la pantalla de revisión, donde se pueden
editar los equipos antes de continuar a coincidencias y guardar la visita.
Las cantidades, marcas y edades provienen del backend; no se generan equipos
demo ni porcentajes de confianza. Si el análisis falla, captura muestra el
error y permite reintentar. El hospital seleccionado usa su ID real, por ejemplo `HOSP-001`.
Voz y fotos no tienen inferencia
real todavía. Revisar los datos extraídos antes de utilizarlos: pueden contener
errores. Esta herramienta organiza inventario; no diagnostica ni recomienda
tratamientos.

### Persistencia SQLite

FastAPI crea `backend/data/inventory.sqlite3` al consultar o guardar datos.
El archivo está ignorado por Git. Se puede cambiar su ubicación con la variable
`APP_DATABASE_PATH` antes de iniciar el backend. El catálogo inicial de cinco
hospitales está en `backend/app/db/hospitals.json`.

Tablas: `hospitals`, `visits`, `observations` y `equipment`, relacionadas con
claves foráneas. Cada fila de equipo representa un equipo observado en una
observación; todavía no es un inventario físico deduplicado. Las coincidencias
de la interfaz siguen siendo demostrativas y no se usan como claves de SQLite.
Las edades revisadas se conservan como texto para respetar valores desconocidos
o aproximados introducidos por el usuario.

Al confirmar las decisiones se guarda la visita en curso en SQLite. Finalizar
la visita confirma el guardado y entonces limpia el borrador. Los reintentos
con el mismo ID no duplican observaciones ni equipos; cada guardado es una
transacción. Ante un fallo del backend, los borradores quedan abiertos.

Inicio e historial consultan SQLite y mantienen una copia local de consulta.
Las visitas terminadas se pueden recuperar desde el backend aunque se borren
los datos del navegador. Los borradores de edición siguen siendo locales.
Las visitas antiguas que solo están en el navegador se conservan, pero no se
importan automáticamente; los ejemplos simulados tampoco se insertan.
«Guardada» significa persistida en SQLite local, no sincronizada con una nube.

API disponible en `/docs`:

- `GET /hospitals`: catálogo persistido.
- `PUT /visits/{id}`: guarda la visita y sus observaciones/equipos.
- `GET /visits`: visitas finalizadas; acepta `hospital_id` como filtro.
- `GET /visits/{id}`: detalle, incluida una visita en curso.

Para probarlo: finalizar una visita, reiniciar FastAPI y volver al historial
con «Mostrar visitas de ejemplo» desactivado. No es necesario iniciar MedPsy
para consultar datos ya guardados.

### Vista consolidada por hospital

Abrir **Hospitales** como supervisor en `/supervisor/hospitals`, seleccionar un hospital
y consultar su resumen: visitas finalizadas, observaciones, registros de
equipos y última visita. La tabla permite buscar por marca/modelo/estado y
filtrar por área y tipo. Cada registro enlaza a su visita de origen y conserva
la observación original. También se muestra el historial completo del hospital.

La vista consulta `GET /hospitals/{id}/overview` y utiliza exclusivamente datos
de SQLite de visitas finalizadas, sin incorporar los ejemplos del navegador.
Un hospital sin visitas muestra totales cero. Las visitas abiertas quedan fuera.
Los registros repetidos en visitas distintas se conservan: estos totales no
afirman contar equipos físicos únicos mientras la deduplicación esté pendiente.

### Dashboard

El endpoint compatible `GET /dashboard` conserva el resumen histórico para
mostrar totales de visitas finalizadas, observaciones y registros de equipos
por hospital, región y modalidad. Permite alternar las barras entre registros
y visitas, consultar una tabla por hospital y abrir su vista consolidada.
«Actualizar» vuelve a consultar SQLite. No se incluyen ejemplos del navegador
ni visitas en curso. MRI/Resonador, CT/Tomógrafo y otros alias se agrupan.
Un equipo registrado en visitas diferentes sigue siendo varios registros.

Si guardar indica que el backend no reconoce la operación, hay una instancia
antigua de FastAPI ejecutándose: detenerla y usar el comando con `--reload`
indicado arriba. La API actual debe mostrar `/visits` y `/dashboard` en `/docs`.
El frontend conserva el borrador ante errores y muestra el motivo del backend.

### Mapa geográfico y catálogo de Panamá

Abrir **Mapa** en la navegación o `/map` para recorrer la base instalada por
**País → Provincia → Ciudad → Hospital**. El mapa permite filtrar, abrir la
vista consolidada de cada hospital y comenzar una visita con ese hospital ya
seleccionado. Las visitas y sus observaciones permanecen asociadas al código
del hospital en SQLite.

El catálogo inicial contiene 36 hospitales del *Listado de instalaciones de
salud, año 2024* de MINSA. Incluye hospital, provincia, distrito, localidad,
tipo de instalación, dependencia y el identificador oficial. Las coordenadas
son aproximadas a la localidad y sirven para la visualización; no sustituyen
una dirección o coordenada validada de la instalación. La fuente, su alcance y
fecha de actualización deben revisarse antes de usar el catálogo como padrón
oficial definitivo: [MINSA — Instalaciones de salud](https://www.minsa.gob.pa/informacion-salud/instalaciones).

El modelo de SQLite permite extender el catálogo a Latinoamérica sin cambiar
la relación visitas → observaciones → equipos. Para cada país se necesita una
fuente institucional de establecimientos, normalización de país/provincia/ciudad,
identificadores estables y geocodificación validada. Después se puede cargar
el catálogo con el mismo esquema y activar el país en el mapa.

### Pruebas automáticas

Frontend: `npm.cmd test --prefix frontend`, `npm.cmd run build --prefix frontend`
y `npm.cmd run lint --prefix frontend`. Las pruebas verifican petición,
conversión de resultados y conservación de los equipos al guardar la visita.

Desde `backend` y con el servicio SDK iniciado:

```powershell
.venv/Scripts/python.exe -m unittest discover -s tests
$env:PYTHONPATH = '.'
.venv/Scripts/python.exe tests/benchmark_local.py
```

El segundo comando ejecuta ocho observaciones sintéticas a través de FastAPI
y el SDK real. Guarda el prompt, resultado, modelo, cuantización, tiempo de
carga, TTFT observado en el servicio, tiempo total y estadísticas de tokens
del SDK en `benchmarks/results/medpsy-baseline.json`. El informe anterior
`medgemma-baseline.json` se conserva únicamente como referencia histórica.
Valores no disponibles
se guardan como `null`; no se estiman tokens a partir de palabras. El tiempo
de carga corresponde al arranque del servicio, no a cada petición. No es una
evaluación clínica ni una medición representativa de calidad general.

Las edades se verifican contra las frases del texto original después de la
extracción de MedPsy. Una edad local solo se asigna a la modalidad mencionada;
«ambos» y «todos» permiten compartirla explícitamente dentro de una oración.
La comprobación reconoce MRI, CT, ultrasonido y rayos X, discrimina fabricantes
cuando es posible y deja `null` en casos ambiguos o no soportados. No calcula
antigüedad a partir de garantías, fechas ni historial del hospital.

La evaluación histórica ampliada obtuvo 8/8 casos en los campos evaluados;
no debe confundirse con una evaluación general de la versión actual.
El backend separa el razonamiento terminado en `</think>` del JSON final y
valida este último; no acepta JSON incompleto ni texto arbitrario sobrante.
También comprueba cantidades explícitas contra las menciones originales:
si «dos resonadores» produjo un solo registro, lo expande únicamente si sus
atributos son idénticos. No inventa un equipo que MedPsy no haya detectado ni
mezcla dispositivos con atributos diferentes. Cantidades ambiguas no se
expanden; contradicciones con atributos distintos requieren separar la
observación. Se permiten hasta 50 equipos por análisis.
El reporte conserva la salida original del modelo y el resultado validado.
Estos ocho ejemplos no equivalen a una garantía de extracción perfecta.
El campo `ttft_ms` mide el primer contenido de respuesta visible; con
razonamiento activado incluye la espera hasta terminar el razonamiento.

La inferencia usa pesos locales y no configura proveedores remotos. Las
instalaciones iniciales requieren acceso a los registros de paquetes y a la
fuente de los pesos. No se guardan prompts de usuarios en el servicio; solo
el evaluador guarda sus ejemplos sintéticos. Dependencias y versiones están
declaradas en los archivos de paquetes y requisitos. API del SDK consultada:
[documentación oficial QVAC](https://docs.qvac.tether.io/introduction/),
contrastada con la versión instalada 0.19.0.

Pendiente para la entrega del reto: evaluación
más amplia, medición y especificación completa del hardware, validación sin
red, revisión de licencias y elección de licencia permisiva del proyecto,
y vídeo de hasta cinco minutos. Esta implementación no declara cumplimiento
completo del Track 02.

Construyendo un prototipo que convierta lo que un colaborador de campo observa en un hospital en datos estructurados y confiables sobre los equipos instalados, con captura tan simple como una conversación y con la inferencia corriendo en el dispositivo.
