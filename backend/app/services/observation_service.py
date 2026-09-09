from app.ai.extractor import extract_equipment
from app.schemas.observation import ObservationAnalysisResponse


def analyze_observation(text: str) -> ObservationAnalysisResponse:
    """
    Coordina el análisis de una observación.

    Aquí iremos agregando después:
    - extracción con IA
    - confidence score
    - normalización
    - detección de duplicados
    """

    equipment = extract_equipment(text)

    return ObservationAnalysisResponse(
        original_text=text,
        equipment=equipment,
    )