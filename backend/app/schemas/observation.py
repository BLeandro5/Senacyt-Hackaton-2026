from typing import Dict, List, Literal

from pydantic import BaseModel, Field

from app.schemas.equipment import EquipmentExtracted


EvidenceStatus = Literal['Confirmed', 'Reported', 'Estimated', 'Unknown']
ReliabilityLevel = Literal['Low', 'Medium', 'High']
FreshnessStatus = Literal['Fresh', 'Aging', 'Stale', 'Unknown']


class ObservationRequest(BaseModel):
    # Hospital donde se realizó la observación
    hospital_id: str | None = Field(default=None, min_length=1, max_length=80)

    # Texto libre escrito por el colaborador
    text: str = Field(..., min_length=3)


class ReliabilityBreakdown(BaseModel):
    informationQuality: int = Field(ge=0, le=45)
    humanValidation: int = Field(ge=0, le=15)
    freshness: int = Field(ge=0, le=15)
    corroboration: int = Field(ge=0, le=25)
    conflictPenalty: int = Field(ge=-25, le=0)


class ReliabilityPreview(BaseModel):
    score: int = Field(ge=0, le=100)
    level: ReliabilityLevel
    factors: List[str] = Field(default_factory=list)
    breakdown: ReliabilityBreakdown
    daysSinceObservation: int | None = Field(default=None, ge=0)
    freshness: FreshnessStatus


class EquipmentAnalysisMetadata(BaseModel):
    evidence_status: Dict[str, EvidenceStatus]
    reliability: ReliabilityPreview


class ObservationAnalysisResponse(BaseModel):
    detected_language: str = 'other'
    facility: str | None = None
    city: str | None = None
    country: str | None = None

    # Texto original recibido
    original_text: str

    # Lista de equipos detectados
    equipment: List[EquipmentExtracted]

    # Metadatos deterministas alineados por índice con equipment.
    # No son probabilidades generadas por MedPsy.
    equipment_metadata: List[EquipmentAnalysisMetadata] = Field(default_factory=list)
