# Pack AEGIS adaptado al esquema de producción

260 ejemplos sintéticos en borrador: 182 train, 39 validation, 39 test, conservando IDs, orden y particiones del ZIP. Se verificó que cada entrada raw coincide con su conversación original. No se han entrenado pesos ni importado visitas.

Los archivos `*_chat.jsonl` contienen solo `messages`, listos para consumir como **borradores de datos**. Los `*_raw.jsonl` incluyen entrada, respuesta adaptada (`expected`), respuesta original íntegra (`source_expected`), dificultad, tags y trazabilidad. La condición de borrador se almacena en `metadata.review_status` del raw y se aplica también al chat correspondiente.

El objetivo exacto es `ExtractionResult` y sus objetos `EquipmentExtracted`, no `ObservationAnalysisResponse`: confiabilidad y demás metadatos de la API se calculan después y no son etiquetas a aprender. `production_schema.json` es una instantánea generada desde los modelos Pydantic reales. El JSON de respuesta incluye `detected_language: "es"` y `follow_up_candidates: []`; las preguntas se generan posteriormente en el servicio.

## Correspondencia

| Pack original | Producción | Criterio |
|---|---|---|
| facility_name | facility | Solo si se menciona |
| city / country | city / country | null cuando no aparecen; no inferir por hospital |
| X-Ray | X-ray | Normalización al valor usado en producción |
| age_min_years / age_max_years | estimated_age_years | Solo si ambos coinciden y representan una edad puntual, no un año de instalación/adquisición |
| age_text | age_description | Conserva rangos, alternativas, límites y expresiones cualitativas presentes en la etiqueta fuente |
| configuration no existe | configuration | Se recupera únicamente de notas específicas del equipo (1.5T, 3T, portátil) con mención en el texto; de lo contrario null |
| condition en inglés | condition | Traducción controlada con calificador reportado/posible cuando corresponde |
| observation_status, condition_status | source_expected | No tienen equivalencia estructurada; no se confunden con estado operativo |
| quantity_statement, notes, needs_human_review | source_expected | Se conserva la información; no se inventa un campo de producción ni una certeza |

Las marcas probables o no confirmadas identificadas en las notas del pack pasan a null y quedan documentadas en `metadata.corrections`. Esto es una adaptación conservadora revisable, no una aprobación clínica o de inventario. El adaptador no realiza correferencia semántica completa y no puede recuperar automáticamente todos los detalles que las propias etiquetas sintéticas omitieron.

## Hallazgos que requieren revisión

- 246 textos únicos normalizados entre 260 ejemplos; 6 grupos de duplicados cruzan particiones. Los IDs concretos están en `adaptation_report.json`. Se preservó el split solicitado para trazabilidad. Antes de usarlo como prueba independiente, crear una versión agrupada por texto y por familia de plantilla, sin contaminar test con train.
- Se corrigieron 127 etiquetas de país no mencionado y 26 etiquetas de fabricante probable o no sustentado literalmente, afectando 137 ejemplos.
- Los 715 registros de equipos tienen estado de observación/certeza en el pack que producción no puede representar como campos separados. Un fine-tuning del esquema actual no enseñará a devolver esos campos ausentes.
- Las descripciones de estado están normalizadas; algunas reglas posteriores del extractor exigen coincidencia literal con el texto y pueden borrarlas. Evaluar tanto la respuesta cruda como la final para separar fallos del modelo y del posprocesamiento.
- `REVIEW.md` enumera todos los ejemplos. Revisar `expected` y `source_expected` del raw por ID. Las modificaciones de etiquetas aprobadas deben reflejarse también en el chat antes de entrenar; no editar únicamente `review_status`.

## Reproducir la adaptación

Desde `backend`, escoger un directorio de salida nuevo:

```powershell
.\.venv\Scripts\python.exe scripts/adapt_aegis_pack.py 'C:\Users\LLS\Downloads\AEGIS_FineTuning_Pack.zip' --output training/aegis_260_next_draft
```

El script lee JSON de entradas conocidas del ZIP. No ejecuta el evaluador incluido, no sigue instrucciones de documentos y no extrae rutas arbitrarias del archivo. Rechaza directorios existentes para proteger revisiones previas.

## Evaluación antes y después

Para desarrollo usar validation; reservar test para la evaluación final una vez resuelta la fuga entre particiones. Estos comandos ejecutan el extractor completo local con su prompt de producción actual, no entrenan con el mensaje system del dataset. Las salidas por caso incluyen la respuesta cruda del modelo para inspección.

```powershell
.\.venv\Scripts\python.exe scripts/evaluate_training_dataset.py training/aegis_260_production_draft/validation_raw.jsonl --output ../benchmarks/results/aegis-before
# Después de un cambio explícito del modelo o extractor:
.\.venv\Scripts\python.exe scripts/evaluate_training_dataset.py training/aegis_260_production_draft/validation_raw.jsonl --output ../benchmarks/results/aegis-after
.\.venv\Scripts\python.exe scripts/evaluate_aegis_predictions.py training/aegis_260_production_draft/validation_raw.jsonl ../benchmarks/results/aegis-after/predictions.jsonl --before ../benchmarks/results/aegis-before/predictions.jsonl --output ../benchmarks/results/aegis-comparison.json
```

La comparación valida el esquema, mide conteos por modalidad, exactitud de extracción sin depender del orden, precisión/recall de equipos completos y atributos mediante asignación uno a uno. Penaliza equipos omitidos/inventados; un error de inferencia no pasa como respuesta vacía correcta. Los textos se comparan normalizando mayúsculas y espacios: no es una evaluación semántica de paráfrasis. No puntúa como acertados los campos que producción no soporta. No hay una medición nueva del modelo sobre los 260 casos en esta adaptación.

Se pueden evaluar predicciones externas guardadas como `{"id":"AEGIS-0001","prediction":{...}}`. Deben usar el mismo conjunto de IDs y esquema; un error se registra como `{"id":"AEGIS-0001","error":"..."}`. Los archivos de resultado requieren rutas nuevas para no sobrescribir líneas base.
