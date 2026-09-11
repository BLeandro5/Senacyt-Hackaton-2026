# Cómo revisar y aprobar las etiquetas

1. Genera el revisor local:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts/make_aegis_review.py training/aegis_260_production_clean --output training/aegis_260_production_clean/review.html
```

2. Abre `review.html` en cualquier navegador. No usa red ni envía datos. Cada tarjeta muestra la observación, el JSON que entrenaría producción, la etiqueta sintética original y las correcciones automáticas.
3. Para cada tarjeta elige:
   - **Aprobar**: cada equipo y atributo del JSON está explícito en el texto, y la incertidumbre no se convirtió en un hecho.
   - **Excluir**: el ejemplo no debe entrenar al modelo, está duplicado o la etiqueta no es recuperable con seguridad.
   - **Requiere edición**: necesitas corregir el JSON. Añade una nota con el cambio; después corrige el raw manualmente o pide que se aplique la edición.
4. Descarga las decisiones. El navegador guarda el progreso localmente hasta que uses “Limpiar” o borres sus datos.
5. Cuando todos estén aprobados o excluidos, crea un dataset nuevo:

```powershell
.\.venv\Scripts\python.exe scripts/apply_aegis_review.py training/aegis_260_production_clean C:\ruta\aegis-review-decisions.json --output training/aegis_260_reviewed
```

El comando se detiene si queda algún caso sin revisar o que requiera edición. No modifica el dataset de origen. El LoRA usa los `*_raw.jsonl` para comprobar aprobación y los `*_chat.jsonl` para entrenar.

Para decidir un caso, aplica estas reglas: `null` para valores no mencionados; rangos y límites se mantienen como texto; “apagado” no significa fuera de servicio; equipos futuros, retirados o descritos solo por un documento no se agregan; una marca probable sigue siendo `null`; y hechos reportados no se convierten en observación directa.
