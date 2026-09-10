# Integración local — 10 septiembre 2026

## Disponible para pruebas

- Colaborador único: Inicio con observaciones generales por país/hospital; Hospitales/Customer 360, Revisar, Dashboard, Mapa, Oportunidades y Analytics. Sin rutas ni login de supervisor activos.
- Customer 360 consulta SQLite: activos canónicos, evidencias, visitas, observaciones, notas originales, colaboradores, frescura, conflictos y decisiones auditadas. Finalizar visita conduce al hospital.
- Confiabilidad calculada en backend con la fórmula existente. Review muestra metadatos preliminares; editar invalida esos metadatos. No se atribuye confianza porcentual a MedPsy.
- Hasta dos preguntas contextuales, priorizando cantidad y atributos faltantes. No hay una llamada MedPsy por pregunta. La cantidad se confirma sobre las tarjetas existentes; no se clonan equipos heterogéneos automáticamente.
- Coincidencias restringidas a hospital/modalidad, ordenadas por marca, modelo, configuración y edad similar; siempre requieren decisión humana.
- Dashboard separa activos canónicos de evidencias, muestra geografía, modalidad, antigüedad, confiabilidad y frescura. Edad >7 es una señal comercial, no recomendación clínica.
- Año de instalación explícito asociado a la frase del equipo; si solo existe edad se deriva respecto de la fecha de observación y se etiqueta `Estimated`. Migración SQLite aditiva, sin borrar datos.
- Voz española real con Vosk local: micrófono → WAV mono 16 kHz → transcripción editable → análisis voluntario. Máximo tres minutos; audio en memoria, sin guardado permanente ni envío a Internet.
- Estado visible de red del navegador, FastAPI, SQLite, QVAC, MedPsy, STT y OCR. El indicador de red no prueba acceso a Internet.
- Lectura opcional de etiquetas con Tesseract local: texto editable y confirmación humana antes de añadirlo a la nota. Si falta OCR, se informa; no se simula un resultado.

## Límites explícitos

- Browser no pudo conectarse por una restricción de código confiable del plugin. QA visual, micrófono físico y sesión con red desconectada quedan pendientes; no se declaran aprobados.
- La descarga cartográfica fue rechazada. `/map` es un esquema navegable rotulado, no un mapa territorial ni coordenadas reales de hospitales.
- Tesseract no está instalado: infraestructura y error de indisponibilidad comprobados, OCR real pendiente. No se descargó ningún motor OCR.
- STT instalado solo en español. Calidad con jerga, marcas o ruido requiere ensayo con el micrófono real.
- Pedir preguntas adicionales en el prompt deterioró una extracción real. Se restauró el prompt estable: se admiten propuestas opcionales del modelo, pero normalmente las preguntas se generan con reglas contextuales sobre su extracción, sin llamada adicional.
- Prototipo local, no autenticación/autorización endurecida para producción; interfaz mayormente española. No exponer la API a Internet.

## Instalación de voz autorizada

Vosk `0.3.45`, modelo oficial `vosk-model-small-es-0.42` (~39 MB), guardado en `models/` e ignorado por Git. No se modificaron los pesos MedPsy.

```powershell
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements-stt.txt
.\backend\.venv\Scripts\python.exe backend/scripts/install_stt_model.py
```

Instalación explícita, sin descargas durante arranque/transcripción. El instalador registra procedencia y SHA-256; el servicio valida archivos del modelo. Audio de prueba generado con la voz española local de Windows: `hay dos equipos en el hospital un equipo tiene ocho años`, transcripción real Vosk con `audioStored=false`. Esto no sustituye una prueba con micrófono.

## Datos demo opcionales

No se ejecutaron contra tu inventario habitual. Para cargarlos deliberadamente:

```powershell
.\backend\.venv\Scripts\python.exe backend/scripts/seed_international.py
```

Diez países, diez hospitales ficticios, 30 activos y 50 evidencias; tres colaboradores DEMO, MRI/CT/Ultrasound, datos incompletos, frescura variada, corroboración y conflictos. IDs `DEMO-INT-*`, correos `example.invalid`. Reejecución probada sin duplicar ni sobrescribir decisiones existentes. El seed original sigue separado.

## Prueba manual breve

1. Abre http://localhost:5173 y recarga con Ctrl+F5; registra/inicia sesión como colaborador.
2. Nueva visita: escribe o graba `Dos resonadores Siemens y un tomógrafo Philips de siete años.` Revisa la transcripción antes de analizar.
3. Verifica tres equipos, edad desconocida en MRI y siete en CT. Responde/omite preguntas, confirma revisión, decide coincidencias y finaliza.
4. Customer 360 debe mostrar activos/evidencias separados, fuente y nota original. Abre detalle/auditoría, vuelve a Inicio y filtra país/hospital.
5. Repite evidencia con otro colaborador; comprueba corroboración y conflicto sin sobrescritura automática.
6. Revisa Dashboard, esquema geográfico, Oportunidades y Analytics. Actualiza o recarga después de guardar.
7. Con los servicios locales iniciados, desconecta Internet manualmente y repite captura, análisis, transcripción y guardado. No cierres FastAPI/QVAC. La falta de Internet no debe presentarse como fallo de SQLite.

Comandos automatizados y flujo detallado en [TESTING.md](TESTING.md). No se hizo commit/push ni se borraron datos, configuración, entornos o pesos existentes.
