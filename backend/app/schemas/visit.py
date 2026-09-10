from typing import Literal
from pydantic import BaseModel, Field, model_validator
from app.schemas.observation import ObservationAnalysisResponse


class EquipmentRecord(BaseModel):
    quantityStatus: Literal['exact','estimated','unknown'] | None = None
    id: str = Field(min_length=1)
    type: str = Field(min_length=1)
    brand: str = ''
    model: str = ''
    configuration: str = ''
    estimatedAge: str = ''
    status: str = ''
    resolution: Literal['existing', 'new', 'review'] | None = None
    matchedEquipmentId: str | None = None
    reviewed: bool = False


class ObservationRecord(BaseModel):
    detectedLanguage: Literal['es', 'en', 'pt', 'other'] = 'other'
    analysis: ObservationAnalysisResponse | None = None
    id: str = Field(min_length=1)
    title: str = ''
    captureMode: Literal['chat', 'voice']
    capturedAt: str = ''
    originalText: str = Field(min_length=1)
    photoName: str | None = None
    photoData: str | None = Field(default=None, max_length=3_000_000)
    equipment: list[EquipmentRecord] = Field(min_length=1, max_length=50)


class VisitRecord(BaseModel):
    id: str = Field(min_length=1)
    hospitalId: str = Field(min_length=1)
    hospital: str = Field(min_length=1)
    area: str = ''
    region: str = ''
    startedAt: str = Field(min_length=1)
    completedAt: str = ''
    collaboratorId: str | None = None
    observations: list[ObservationRecord] = Field(min_length=1, max_length=100)

    @model_validator(mode='after')
    def unique_ids(self):
        if len({o.id for o in self.observations}) != len(self.observations):
            raise ValueError('Duplicate observation IDs')
        for observation in self.observations:
            if len({e.id for e in observation.equipment}) != len(observation.equipment):
                raise ValueError('Duplicate equipment IDs')
            matched = [e.matchedEquipmentId for e in observation.equipment if e.resolution == 'existing' and e.matchedEquipmentId]
            if len(matched) != len(set(matched)):
                raise ValueError('Two physical devices in one observation cannot match the same installed asset')
        return self
