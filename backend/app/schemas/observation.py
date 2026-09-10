from typing import List

from pydantic import BaseModel, Field

from app.schemas.equipment import EquipmentExtracted


class ObservationRequest(BaseModel):
    # Hospital donde se realizó la observación
    hospital_id: str | None = Field(default=None, min_length=1, max_length=80)

    # Texto libre escrito por el colaborador
    text: str = Field(..., min_length=3)


class ObservationAnalysisResponse(BaseModel):
    detected_language: str = 'other'
    facility: str | None = None
    city: str | None = None
    country: str | None = None
    # Texto original recibido
    original_text: str

    # Lista de equipos detectados
    equipment: List[EquipmentExtracted]
