from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.observations import router as observations_router
from app.api.visits import router as visits_router
from app.api.users import router as users_router
from app.api.intelligence import router as intelligence_router
from app.api.media import router as media_router


# AplicaciÃ³n principal del backend
app = FastAPI(
    title="Installed Base Intelligence API",
    version="0.1.0",
)


# Registramos las rutas relacionadas con observaciones
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)

app.include_router(observations_router)
app.include_router(visits_router)
app.include_router(users_router)
app.include_router(intelligence_router)
app.include_router(media_router)


@app.get("/")
def root():
    # Endpoint sencillo para comprobar que el backend estÃ¡ vivo
    return {
        "status": "ok",
        "message": "Backend funcionando",
    }
