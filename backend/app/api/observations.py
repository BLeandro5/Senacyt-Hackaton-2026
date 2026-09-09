import httpx
from fastapi import APIRouter, HTTPException

from app.schemas.observation import (
    ObservationAnalysisResponse,
    ObservationRequest,
)
from app.services.observation_service import analyze_observation


router = APIRouter(
    prefix="/observations",
    tags=["Observations"],
)


@router.post(
    "/analyze",
    response_model=ObservationAnalysisResponse,
)
def analyze_observation_endpoint(
    observation: ObservationRequest,
):
    """
    Recibe una observaciÃ³n de campo y devuelve
    los equipos detectados de forma estructurada.
    """

    try:
        return analyze_observation(observation.text)
    except httpx.TimeoutException as exc:
        raise HTTPException(504, "QVAC tardó demasiado. Intenta nuevamente.") from exc
    except httpx.RequestError as exc:
        raise HTTPException(503, "No se pudo conectar con QVAC. Comprueba que esté iniciado.") from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(502, "QVAC devolvió un error al procesar la observación.") from exc
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(502, "QVAC no devolvió una respuesta estructurada válida. Intenta nuevamente.") from exc