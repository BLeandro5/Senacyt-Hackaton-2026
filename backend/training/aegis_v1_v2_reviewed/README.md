# Casos AEGIS combinados, revisión automática

Se revisaron 546 relatos únicos: 246 del primer pack y 300 del volumen 2.
Se seleccionaron 207 etiquetas para extracción experimental: 95 anteriores y
112 nuevas. Se conservaron los otros 339 casos en `excluded_raw.jsonl`, con
su etiqueta original y motivo de exclusión. No se eliminaron archivos de origen.

El reparto nuevo es 145 train, 31 validación y 31 test. Las variantes de una
misma plantilla normalizada permanecen juntas. No hay duplicados exactos ni
familias normalizadas compartidas entre los tres conjuntos. Puede persistir
similitud semántica entre familias distintas; no es una prueba de generalización
a hospitales o relatos reales. Se conserva `original_split` para trazabilidad.
Estos conjuntos sustituyen las particiones anteriores para experimentos futuros;
no comparar sus resultados directamente con evaluaciones sobre otros tests.

La revisión acepta desconocidos como `null`, rangos de edad en `age_description`,
conteos exactos mediante elementos individuales, negaciones y mantenimiento futuro
sin alterar el estado actual. La bandera original `needs_human_review` por sí sola
no indica que el JSON sea incorrecto: una etiqueta puede enseñar a conservar dudas.

Por petición del usuario, los casos que contienen estados no contemplados, como
`limited_use`, quedan excluidos del entrenamiento. `under_maintenance` es un
sinónimo del estado existente `En mantenimiento`. No se añadieron estados a la app.
Los casos con C-Arm también quedan fuera del conjunto seleccionado para mantener
el vocabulario de entrenamiento anterior. Se conservan completos para trabajo futuro.

Se corrigen ubicaciones no mencionadas y nombres de ciudades/países que aparecen
únicamente dentro del nombre de otro lugar. Los relatos y las etiquetas originales
permanecen en `source_expected`. La revisión no verifica catálogos comerciales de
fabricantes/modelos; son textos sintéticos, no un inventario real.

`review.html` permite ver todas las decisiones y respuestas sin servidor.
`report.json` contiene los conteos, límites y procedencia. Los ejemplos llevan
`review_method: automatic-projection-v2` y `human_reviewed: false`: la aprobación
es automática y se refiere a selección para entrenamiento experimental.

La validación estructural y las pruebas de los scripts no miden la calidad de
MedPsy. Este procesamiento no entrena ni activa pesos. El entrenamiento nativo
QVAC necesita el GGUF Q8_0 compatible; el Q4_K_M instalado no admite ese proceso.

El GGUF Q8_0 ya se descargó y verificó. Una prueba posterior de entrenamiento
se interrumpió por una configuración incorrecta de lotes (tokens, no ejemplos).
El checkpoint parcial en `artifacts/medpsy-aegis-v1-v2-lora` no está validado
y no debe activarse. No hay un adaptador final evaluado. El script conserva
la corrección de parámetros para una prueba futura en una carpeta nueva.

Para reproducir desde la raíz, usando una carpeta de salida nueva:

```powershell
.\backend\.venv\Scripts\python.exe backend/scripts/curate_aegis_dataset.py backend/training/aegis_260_production_clean backend/training/aegis_v2_300_production_draft --output backend/training/otra_revision
npm.cmd run qvac:lora:preflight
```

Después de entrenar, usar el mismo test, prompt y parámetros para comparar modelo
base y adaptador, incluyendo equipos omitidos/inventados y precisión por atributo.
La aplicación solo debe usar el adaptador cuando la comparación justifique el cambio.
