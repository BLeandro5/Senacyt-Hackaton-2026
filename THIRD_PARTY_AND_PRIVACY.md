# Componentes, red y privacidad

## Inferencia principal

La extracción de observaciones y las preguntas de inventario usan exclusivamente el SDK local `@qvac/sdk` (`0.19.0`) y el peso oficial `HEALTHCARE_1_7B_MEDICAL_Q4_K_M`, identificado como MedPsy-1.7B Q4_K_M (imatrix). QVAC escucha solamente en `127.0.0.1:11500`; FastAPI se comunica únicamente con esa dirección local. No existe RAG ni un proveedor de inferencia en la nube.

SQLite, el frontend y el mapa por coordenadas locales funcionan sin Internet una vez instalados. Leaflet se ejecuta como biblioteca incluida en la aplicación y no solicita mosaicos, geocodificación ni cartografía remota. El contorno vectorial detallado de Panamá se empaqueta con el frontend y procede de Natural Earth GeoJSON, un conjunto de datos de dominio público.

## Componentes opcionales locales

- Vosk: transcripción de voz en español. El audio se procesa en memoria y no se guarda.
- Tesseract + Pillow: lectura y preparación de placas fotográficas. El OCR añade texto editable; no identifica el estado de un equipo por imagen ni toma decisiones clínicas.

Estos componentes no sustituyen MedPsy en el flujo principal. Si faltan, el usuario puede introducir la observación por escrito y completar el flujo con MedPsy.

## Red y descargas explícitas

Durante la ejecución normal no se realizan solicitudes remotas. Las únicas conexiones externas ocurren por una acción explícita de instalación:

| Acción | Destino | Motivo |
| --- | --- | --- |
| `npm.cmd run qvac:download` | Hugging Face | Descargar una vez los pesos oficiales de MedPsy y verificar SHA-256. |
| Instalar dependencias | npm/PyPI | Instalar paquetes declarados. |
| Instalar idiomas OCR | repositorio oficial tessdata_fast | Descargar archivos de idioma locales. |
| Instalar Vosk | PyPI y alphacephei.com | Instalar dependencia y modelo español locales. |

Los modelos, base SQLite y adjuntos no se envían a estos servicios durante el uso. No hay telemetría externa; el registro operativo excluye prompts y notas de usuarios. El benchmark guarda prompts **sintéticos** para reproducibilidad, nunca observaciones reales.

## Licencias

El repositorio está bajo [MIT](LICENSE). Las dependencias conservan sus propias licencias. MedPsy se usa bajo su licencia publicada por QVAC/Tether; revisar sus términos antes de redistribuir pesos. Tesseract y Vosk se instalan como componentes separados y no se incorporan al código fuente del proyecto. La base geográfica local procede de [Natural Earth GeoJSON](https://github.com/martynafford/natural-earth-geojson), disponible como dominio público.
