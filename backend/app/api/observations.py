from fastapi import APIRouter

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
    Recibe una observación de campo y devuelve
    los equipos detectados de forma estructurada.
    """

    return analyze_observation(observation.text)