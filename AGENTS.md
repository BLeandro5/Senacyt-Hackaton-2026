# Proyecto

React/Vite en `frontend`, FastAPI/SQLite en `backend` y MedPsy local mediante QVAC en `qvac`.
La consulta general está en Inicio: observaciones de todos los colaboradores por país/hospital. No hay módulo supervisor activo en la interfaz.
No usar inferencia cloud ni descargar el modelo salvo petición explícita.

## Reglas de datos

- MedPsy propone; el humano revisa y decide coincidencias.
- Los valores no mencionados deben ser `null` en la extracción.
- Usar IDs reales de hospital (`HOSP-001`), nunca `hospital_id: 1`.
- SQLite local es la fuente de verdad para visitas finalizadas.
- `equipment` contiene evidencia; `installed_equipment` contiene activos canónicos. Contar activos y evidencia por separado.
- Las coincidencias y resoluciones requieren decisión humana; conservar notas y trazabilidad.
- Confiabilidad determinista en `services/reliability.py`; nunca porcentajes de confianza del modelo.
- Los ensayos automatizados usan SQLite temporal. El seed sintético se ejecuta solo por acción explícita.
- No guardar contraseñas en texto plano ni en localStorage.
- No hacer commit o push salvo petición explícita.

## Comandos

```powershell
npm.cmd run qvac:start
cd backend; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
cd frontend; npm.cmd run dev -- --port 5173 --strictPort
```

Validar con `npm.cmd test --prefix frontend`, `npm.cmd run build --prefix frontend`,
`npm.cmd run lint --prefix frontend` y, desde `backend`,
`.\.venv\Scripts\python.exe -m unittest discover -s tests`.
