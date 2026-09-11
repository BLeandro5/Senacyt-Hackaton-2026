# Verificación local para la presentación

**Alcance final aclarado por el usuario:** recolectar observaciones y correcciones
para aprendizaje futuro. No se requiere entrenar ahora. Se conserva MedPsy base;
los ensayos LoRA descritos abajo son antecedentes, no un requisito pendiente de demo.

## Producto y comprobaciones

- Texto y voz siguen en React → FastAPI → QVAC/MedPsy → SQLite local.
- Follow-up propuesto en la misma inferencia: máximo dos preguntas. Se validan
  campo, índice, marca/modalidad mencionada y datos ya conocidos. No hay cuestionario
  rígido de reserva. Una propuesta inadecuada se descarta.
- Se corrigió `dos tomógrafos Philips y uno Siemens`, la duplicación por referencias
  ordinales y subconjuntos y la contaminación de atributos entre grupos explícitos.
- La respuesta real guardada del caso complejo se reprocesó sin más inferencia:
  2 CT Philips, 3 MRI, 4 ultrasonidos aproximados y 1 X-ray móvil. Conserva Incisive CT,
  8 años aproximados y fallas reportadas, dos Magnetom 1.5T y LOGIQ portátil. La edad
  de 5–6 años sin atribución permanece en el relato, sin asignarla a un equipo.
- La respuesta cruda de MedPsy tuvo omisiones y atributos incorrectos: este resultado
  combina IA con validación literal local, no demuestra extracción perfecta del modelo.
- En ese caso no quedó ninguna pregunta útil tras validar las propuestas. En el caso
  corto sí se generaron preguntas; su calidad e idioma pueden variar con este modelo.
- Latencias reales iniciales: 43,5 s corto, 73,7 s multi-equipo; complejo con el prompt
  final alrededor de 101 s. Hubo pruebas fallidas a los 170 s. No son tiempos de GPU.
- Voz real Vosk: PASS con voz española sintética de Windows, audio en memoria y
  `audioStored:false`. Grabación física y permiso del micrófono requieren prueba manual.
- Feedback: tabla aditiva e idempotente; guarda paquetes al finalizar una visita cuyos
  equipos están revisados. Reintentos no duplican paquetes; versiones distintas se conservan.
  La exportación no convierte automáticamente revisiones en etiquetas aprobadas.
- Analytics muestra filtros legibles y enlaces a evidencias; conserva filtros validados,
  sin SQL generado. Customer 360 muestra activos, evidencia, colaboradores, conflictos,
  actualización y posibles oportunidades, con enlaces a trazabilidad.
- Dashboard distingue activos y evidencia. Mapa Leaflet con geometría local, sin tiles
  externos. Login y decisiones humanas se conservan; se retiró un módulo no usado con
  credenciales ficticias en texto plano, sin tocar usuarios SQLite.
- Inspección visual: 8 páginas × 4 tamaños (390×844, 430×932, 768×1024, 1366×900), más
  captura/voz/revisión móvil. Se corrigió overflow en Nueva visita. 33 comprobaciones
  pasaron sin errores JavaScript ni overflow; recorrido adicional Review → Match también pasó.
  El navegador usó autenticación y análisis ficticios aislados; no escribió visitas reales.
- Frontend: 24 tests, build y lint pasaron. Backend: suite final de 91 tests pasó,
  incluidos los ajustes de agrupación y las preguntas de seguimiento.
  Avisos existentes: deprecación de TestClient/httpx y ResourceWarning en pruebas.
- OCR Tesseract no está instalado; queda como función opcional, fuera de la demo de voz/texto.

## Demo de cinco minutos

0:00–0:30: explicar observaciones → evidencia → activos; entrar a Inicio.
0:30–1:30: hospital, voz local breve, editar la transcripción y analizar.
1:30–2:30: revisar atributos, desconocidos y pregunta contextual si hay una válida.
2:30–3:15: decidir coincidencia/equipo nuevo y finalizar en SQLite.
3:15–4:15: Customer 360, evidencia y confiabilidad determinista.
4:15–5:00: Dashboard, mapa y Analytics; explicar correcciones para aprendizaje futuro.
Preparar con antelación el caso complejo: en CPU puede consumir más de un minuto.

En terminales separadas, desde la raíz:

```powershell
$env:QVAC_DEVICE='cpu'
$env:MODEL_MODE='base'
npm.cmd run qvac:start
```

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
cd frontend
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173`. Vosk español ya está instalado en
`models/vosk-model-small-es-0.42`; `STT_MODEL_PATH` permite indicar otra ruta local.
No es necesario descargarlo de nuevo. Modelo principal: MedPsy-1.7B Q4_K_M (imatrix).

## Fine-tuning (equipo actual)

La rama `integrar-github` y `origin/main` apuntaban a `02af1af` al iniciar
esta revisión. El árbol local se conservó; no se hicieron commits ni push.

Dataset: `backend/training/aegis_v1_v2_reviewed`, 145 train, 31 validation,
31 test. La auditoría `results/final-label-audit.json` comprueba esquema,
correspondencia raw/chat, duplicados, familias entre splits y respaldo literal.
207 casos pasan esas comprobaciones; esto no certifica la atribución semántica
de todos los atributos. No se cambiaron etiquetas ni particiones.

El informe de hardware anterior corresponde a otro equipo. Aquí hay un Intel
Core i3-1005G1, Intel UHD y 21.271.379.968 bytes de RAM física reportada por Node.
El Q8 no estaba presente: se descargó con autorización y se verificó SHA-256
`03ebb130aa6e818a8cf733301381c9edb69c94e0e1ad556595b1d5545a1c5073`.

QVAC instalado: SDK 0.19.0. La definición
`node_modules/@qvac/llm-llamacpp/index.d.ts:548` especifica `batchSize` en
tokens (`n_batch`), divisible por `microBatchSize` y mayor o igual a este.
128/128 es válido. No equivale a 128 ejemplos. `contextLength` es la longitud
de secuencia de entrenamiento; no es el tamaño del lote.

El smoke usa dos ejemplos train y uno validation, una época, LR 0.0001,
contexto 2048, lotes 128/128, rango 8, alpha 16 y pérdida de assistant.
Los archivos se copian al directorio del ensayo; el test no participa.
El intento GPU no emitió métricas y se interrumpió. Sus archivos permanecen
en `artifacts/medpsy-aegis-smoke`. El ensayo CPU usa una carpeta separada.

La loss por sí sola no autoriza activar un adaptador. Hasta completar un
smoke válido y comparar ambos modelos, la decisión es **BASE**.

Resultado CPU: primer paso en 157.742 ms, 32 lotes para este smoke, ETA
4.890.008 ms adicionales (aproximadamente 81 minutos). Loss inicial 0,
insuficiente para acreditar aprendizaje. Se crearon `model.gguf` (34.892.032
bytes) y `optimizer.gguf` (69.793.152 bytes) con metadata en checkpoints.
Se interrumpió el ensayo por coste antes de validación. No hubo entrenamiento
completo ni comparación Base/LoRA; no se afirma mejora. Reanudar el trabajo
de entrenamiento en hardware adecuado y verificar también que haya tokens
assistant supervisados en los lotes que reporten pérdida.

## Reproducción

Desde la raíz:

```powershell
.\backend\.venv\Scripts\python.exe backend/scripts/audit_training_labels.py backend/training/aegis_v1_v2_reviewed --output benchmarks/results/otra-auditoria.json
npm.cmd run qvac:lora:preflight
$env:QVAC_TRAINING_DEVICE='cpu' # En este equipo sin GPU dedicada
$env:QVAC_LORA_OUTPUT='artifacts/otro-smoke'
npm.cmd run qvac:lora:smoke
```

Usar una carpeta nueva para cada ensayo; los checkpoints previos no se borran.
Solo ejecutar `qvac:lora:train` después de verificar loss, validación y
checkpoint del smoke. El entrenamiento completo conserva tres épocas como máximo.

Evaluación, con el servidor local correspondiente ya iniciado:

```powershell
.\backend\.venv\Scripts\python.exe backend/scripts/evaluate_training_dataset.py backend/training/aegis_v1_v2_reviewed/test_raw.jsonl --output benchmarks/results/base-final
# Repetir con el adaptador, el mismo código y parámetros, en lora-final.
.\backend\.venv\Scripts\python.exe backend/scripts/evaluate_aegis_predictions.py backend/training/aegis_v1_v2_reviewed/test_raw.jsonl benchmarks/results/lora-final/predictions.jsonl --before benchmarks/results/base-final/predictions.jsonl --output benchmarks/results/comparacion-final.json
```

El evaluador registra hashes de dataset, extractor y cada prompt, salud del
modelo y latencia. Los conteos omitidos/inventados comparan multiplicidades
por modalidad; la identidad y los atributos se evalúan por separado.
La evaluación de extracción no mide calidad de preguntas contextuales.
