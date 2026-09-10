Prueba local de captura
-----------------------

Iniciar primero `npm.cmd run qvac:start` desde la raíz: utiliza el SDK y
MedPsy instalado en `127.0.0.1:11500`. Para descargar los pesos por primera vez,
usar `npm.cmd run qvac:download`. Después, ejecutar desde la raíz:

```powershell
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

En otra terminal:

```powershell
cd frontend
npm.cmd run dev -- --port 5173 --strictPort
```

Abrir el frontend, llegar a captura y escribir:
“Dos resonadores Siemens y un tomógrafo Philips de siete años”.
Al analizar se abre revisión con los tres equipos de la respuesta real. La edad de
los resonadores debe figurar como no indicada y la del tomógrafo como 7 años.
El backend comprueba la asignación de edades contra el texto original.
La evaluación ampliada pasa sus ocho casos de cantidad, modalidad, fabricante
y edad. El backend comprueba cantidades explícitas y separa el razonamiento
del JSON final antes de validarlo.
La salida del modelo puede variar y requiere revisión.

La prueba envía `hospital_id: 1`; todavía no vincula hospitales ni guarda
resultados. Solo se analiza texto: la voz sigue siendo una demostración y
las fotografías no se envían al modelo.

`frontend/.env.example` documenta `VITE_API_URL`; el valor predeterminado
es `http://127.0.0.1:8000`. Reiniciar Vite al cambiar variables de entorno.

Pruebas automáticas desde `backend`:

```powershell
.venv/Scripts/python.exe -m unittest discover -s tests
```

Estas pruebas simulan QVAC para verificar el contrato y los errores;
la prueba manual anterior utiliza el modelo real.
