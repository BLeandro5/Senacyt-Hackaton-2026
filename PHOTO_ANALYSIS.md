# Fotos, OCR y MedPsy

La configuración actual utiliza MedPsy 1.7B Q4 para texto. No envía imágenes a QVAC. El flujo es fotografía PNG/JPEG → Tesseract local → corrección humana del texto → MedPsy → revisión de equipos. No determina el estado operativo por la apariencia ni convierte automáticamente un año de fabricación en años de uso.

## Uso y configuración

Instala Tesseract OCR. En Windows se detecta tanto en PATH como en `C:/Program Files/Tesseract-OCR/tesseract.exe`. Para otra ubicación configura `TESSERACT_COMMAND` en el entorno del backend. La API consulta los idiomas instalados y usa español, inglés y portugués cuando están disponibles; `OCR_LANGUAGES=spa+eng` permite exigir idiomas concretos. No descarga idiomas al arrancar.

Fotografía solo la placa, bien enfocada, derecha y sin reflejos. Selecciona campos separados, bloque de texto o una línea según su distribución. Comprueba especialmente modelo, serie y cifras. La confirmación añade el texto a la nota editable. Si adjuntas otra imagen, el resultado anterior se descarta y su petición se cancela.

## Cómo medir y mejorar

1. Reúne un conjunto representativo de placas con distintos fabricantes, iluminación, orientación e idiomas. Conserva la imagen original, transcripción humana exacta y campos esperados; marca los datos ausentes como null. No incluyas datos de pacientes.
2. Separa entrenamiento, validación y prueba por equipo físico y visita, no solo por fotografía, para evitar que fotos casi iguales aparezcan en ambos conjuntos.
3. Mide por separado error de caracteres del OCR, coincidencia exacta de marca/modelo/serie, cantidad correcta y campos inventados por el extractor. Compara siempre sobre el mismo conjunto de prueba. No hay todavía un porcentaje de calidad validado con fotos reales.
4. Primero corrige enfoque, encuadre, giro y segmentación. Si persisten errores de lectura específicos, prepara pares imagen de línea/transcripción para entrenar Tesseract con tesstrain.
5. Si el OCR es correcto pero el JSON no, crea pares texto corregido/JSON revisado para evaluar cambios de prompt o un ajuste supervisado del modelo textual. El ajuste requiere un checkpoint entrenable, recursos de cómputo y verificar licencia y compatibilidad de exportación con QVAC; el GGUF Q4 instalado es el artefacto de inferencia, no un trabajo de entrenamiento listo.
6. Entrenar el modelo textual no le añade visión. Para reconocer visualmente equipos sin placa se necesita un componente de visión local aparte y una evaluación propia; MedPsy puede seguir estructurando la evidencia textual.

Las correcciones de la interfaz no reentrenan automáticamente ningún modelo. No se ha ejecutado un entrenamiento ni se garantiza una mejora de precisión sin medirla.

Fuentes: [MedPsy: modelos de texto](https://huggingface.co/blog/qvac/medpsy), [calidad OCR](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html), [entrenamiento de Tesseract](https://github.com/tesseract-ocr/tesstrain).
