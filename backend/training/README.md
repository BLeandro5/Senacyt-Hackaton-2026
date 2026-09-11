# Dataset de ajuste supervisado de extracción

El pack nuevo de 260 ejemplos está adaptado en [aegis_260_production_draft](aegis_260_production_draft/README.md), con sus tres splits, etiquetas originales, informe de correcciones y comparación de predicciones antes/después. Todos siguen en borrador; revisar especialmente duplicados entre splits y campos de incertidumbre no soportados por producción.

`inventory_extraction_es_draft.jsonl` contiene los dos primeros relatos de evaluación convertidos a conversaciones de ajuste supervisado. Cada ejemplo conserva el texto literal como entrada y un objeto JSON como respuesta esperada.

Los rótulos son un primer borrador de anotación: deben ser aprobados por una persona con conocimiento del inventario antes de usarse para entrenar pesos. Los campos no mencionados se dejan como `null`. Las expresiones inciertas se conservan en `age_description` o `condition`; no se transforman en números ni estados confirmados.

El formato es compatible con herramientas de fine-tuning conversacional que acepten JSONL con `messages`. El objetivo usa el esquema actual de extracción:

```json
{"equipment":[{"modality":"CT","manufacturer":null,"model":null,"configuration":null,"estimated_age_years":null,"age_description":null,"condition":null}],"facility":null,"city":null,"country":null}
```

Antes de ajustar el modelo:

1. Revisa cada línea y cambia `metadata.review_status` a `approved`.
2. Amplía el conjunto a 200–500 relatos aprobados y separa entrenamiento, validación y prueba sin reutilizar textos.
3. Conserva los relatos revisados fuera del entrenamiento final como prueba de regresión; reúne relatos distintos para entrenamiento y validación.

Ejecuta una evaluación contra el modelo local, sin guardar visitas:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts/evaluate_training_dataset.py training/inventory_extraction_es_draft.jsonl
```

El evaluador compara conteos por modalidad y guarda la respuesta por caso en `benchmarks/results/training-eval-*`.
