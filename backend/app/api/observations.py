import httpx
import logging
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from app.ai.count_grounding import EquipmentQuantityError

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
        if exc.response.status_code == 503:
            raise HTTPException(503, 'MedPsy está ocupado con otro análisis. Espera a que termine y reintenta; tu nota se conserva.') from exc
        raise HTTPException(502, "QVAC devolvió un error al procesar la observación.") from exc
    except EquipmentQuantityError as exc:
        raise HTTPException(502, 'No se pudo conciliar la cantidad de equipos con la observación. Revisa los grupos descritos y reintenta. Código: EQUIPMENT_QUANTITY.') from exc
    except (ValueError, KeyError, TypeError) as exc:
        reference = uuid4().hex[:8]
        # Never log the validation exception itself: it may include the note
        # or the model output. A reference and exception class are sufficient.
        logging.getLogger(__name__).warning('Extraction validation failed reference=%s type=%s', reference, type(exc).__name__)
        raise HTTPException(502, f'QVAC no devolvió una respuesta estructurada válida. Intenta nuevamente. Código: EXTRACTION_FORMAT/{reference}.') from exc
