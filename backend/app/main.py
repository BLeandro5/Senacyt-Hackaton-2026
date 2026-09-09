from fastapi import FastAPI

from app.api.observations import router as observations_router


# Aplicación principal del backend
app = FastAPI(
    title="Installed Base Intelligence API",
    version="0.1.0",
)


# Registramos las rutas relacionadas con observaciones
app.include_router(observations_router)


@app.get("/")
def root():
    # Endpoint sencillo para comprobar que el backend está vivo
    return {
        "status": "ok",
        "message": "Backend funcionando",
    }