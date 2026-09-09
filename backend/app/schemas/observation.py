from typing import List

from pydantic import BaseModel, Field

from app.schemas.equipment import EquipmentExtracted


class ObservationRequest(BaseModel):
    # Hospital donde se realizó la observación
    hospital_id: str = Field(..., min_length=1, max_length=80)

    # Texto libre escrito por el colaborador
    text: str = Field(..., min_length=3)


class ObservationAnalysisResponse(BaseModel):
    # Texto original recibido
    original_text: str

    # Lista de equipos detectados
    equipment: List[EquipmentExtracted]
