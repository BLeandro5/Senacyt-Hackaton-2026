from app.ai.extractor import extract_result
from app.schemas.observation import ObservationAnalysisResponse


def analyze_observation(text: str) -> ObservationAnalysisResponse:
    """Local extraction and grounding only; reliability is calculated separately."""

    result = extract_result(text)

    return ObservationAnalysisResponse(
        original_text=text,
        equipment=result.equipment,
        detected_language=result.detected_language, facility=result.facility, city=result.city, country=result.country,
    )
