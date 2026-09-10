# Track 02 — Evidencia de cumplimiento

## Problema y flujo completo

Un colaborador captura una observación de equipos de un hospital en lenguaje natural. MedPsy extrae evidencia estructurada localmente; el usuario revisa valores ausentes, responde preguntas de seguimiento y decide posibles coincidencias. SQLite guarda la evidencia y los activos canónicos; Customer 360, dashboard y mapa local muestran la base instalada. El resultado es útil sin conexión después de la instalación.

MedPsy no diagnostica, recomienda tratamientos ni confirma el estado clínico de un equipo. Los valores no mencionados quedan `null`; la confiabilidad es determinista y las coincidencias requieren decisión humana.

## Modelo Psy central

| Campo | Declaración |
| --- | --- |
| Modelo | QVAC MedPsy-1.7B |
| Identificador SDK | `HEALTHCARE_1_7B_MEDICAL_Q4_K_M` |
| Cuantización | Q4_K_M (imatrix) |
| SDK | `@qvac/sdk` 0.19.0 |
| Ejecución | local, `127.0.0.1:11500` |
| Función | extracción del flujo principal y filtros de analítica en lenguaje natural |
| Configuración | temperatura 0, semilla 42, `reasoning_budget: 0`, contexto 2048, salida máxima 256 |

El servidor local carga, ejecuta y descarga el modelo con `loadModel`, `completion`, `unloadModel` y `close` de `@qvac/sdk`. Ver [qvac/server.mjs](qvac/server.mjs). No se implementó RAG; no hay otra operación de RAG que declarar.

## Evidencia reproducible

1. Ejecutar `scripts/capture-hardware.ps1` con QVAC iniciado. Genera `benchmarks/results/hardware.json` con CPU, RAM, GPU, sistema, versiones y modelo real.
2. Ejecutar `backend/scripts/benchmark_multilingual.py` con QVAC iniciado. Genera `benchmarks/results/multilingual.json` con cada prompt sintético, respuesta, tokens de entrada/salida, TTFT, throughput, carga del modelo, dispositivo, resultado y hora.
3. Ejecutar la demostración descrita abajo; no use datos de pacientes ni afirme precisión clínica.

## Hardware declarado

La especificación concreta de la máquina usada para la entrega se registra en `benchmarks/results/hardware.json`; no sustituirla con especificaciones estimadas. El modelo Q4 está seleccionado para ejecución edge de bajo consumo y se registra el dispositivo real entregado por el SDK en cada benchmark.

## Componentes remotos y licencia

La divulgación completa de red, privacidad y terceros está en [THIRD_PARTY_AND_PRIVACY.md](THIRD_PARTY_AND_PRIVACY.md). El repositorio usa licencia [MIT](LICENSE). El uso principal no depende de red; no se envían prompts, inventario, voz o fotos a Internet.

## Guion de vídeo (menos de 5 minutos)

1. **0:00–0:30:** mostrar hardware, `qvac:start`, estado `MedPsy-1.7B Q4_K_M`, y desconexión de red.
2. **0:30–1:30:** crear visita, escribir una observación y analizarla; mostrar que MedPsy devuelve equipos y `null` cuando faltan datos.
3. **1:30–2:30:** corregir/confirmar evidencia, responder una pregunta, revisar sugerencia de duplicado y decidir manualmente.
4. **2:30–3:30:** finalizar, abrir Customer 360, dashboard y mapa local; distinguir evidencia de activos canónicos.
5. **3:30–4:20:** abrir el registro de rendimiento y mostrar prompt, tokens, TTFT, throughput, carga, modelo y hardware.
6. **4:20–5:00:** explicar límites: no diagnóstico, revisión humana obligatoria, ausencia de inferencia remota y uso sin red.
