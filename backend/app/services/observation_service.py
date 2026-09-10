from datetime import datetime, timezone

from app.ai.extractor import extract_result
from app.schemas.observation import (
    EquipmentAnalysisMetadata,
    ObservationAnalysisResponse,
)
from app.services.evidence import preliminary_evidence_metadata
from app.services.follow_up import validated_questions
from app.services.installation_year import installation_year


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
                estimated_installation_year=installation_year(text,item.estimated_age_years,observed_at,item.modality,item.manufacturer)[0],
                installation_year_status=installation_year(text,item.estimated_age_years,observed_at,item.modality,item.manufacturer)[1],
                evidence_status=statuses,
                reliability=score,
            )
        )

    return ObservationAnalysisResponse(
        original_text=text,
        equipment=result.equipment,
        equipment_metadata=equipment_metadata,
        follow_up_candidates=validated_questions(result.equipment,text,result.follow_up_candidates),
        detected_language=result.detected_language,
        facility=result.facility,
        city=result.city,
        country=result.country,
    )
