from datetime import datetime, timezone

from app.ai.extractor import extract_result
from app.schemas.observation import (
    EquipmentAnalysisMetadata,
    ObservationAnalysisResponse,
)
from app.services.evidence import preliminary_evidence_metadata


def analyze_observation(text: str) -> ObservationAnalysisResponse:
    """Local extraction plus deterministic preliminary reliability."""

    result = extract_result(text)
    observed_at = datetime.now(timezone.utc).isoformat()

    equipment_metadata = []
    for item in result.equipment:
        statuses, score = preliminary_evidence_metadata(
            equipment=item,
            source_text=text,
            observed_at=observed_at,
        )
        equipment_metadata.append(
            EquipmentAnalysisMetadata(
                evidence_status=statuses,
                reliability=score,
            )
        )

    return ObservationAnalysisResponse(
        original_text=text,
        equipment=result.equipment,
        equipment_metadata=equipment_metadata,
        detected_language=result.detected_language,
        facility=result.facility,
        city=result.city,
        country=result.country,
    )
