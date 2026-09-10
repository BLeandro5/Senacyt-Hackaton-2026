from typing import Optional

from pydantic import BaseModel, field_validator, Field


class EquipmentExtracted(BaseModel):
    # Tipo de equipo: MRI, CT, Ultrasound, etc.
    modality: str

    # Fabricante si fue mencionado
    manufacturer: Optional[str] = None

    # Modelo si fue mencionado
    model: Optional[str] = None

    configuration: Optional[str] = None

    # Edad aproximada en años
    estimated_age_years: Optional[float] = Field(default=None, ge=0, le=150)

    # Estado aparente del equipo
    condition: Optional[str] = None

    @field_validator('manufacturer', 'model', 'configuration', 'condition', mode='before')
    @classmethod
    def unknown_is_null(cls, value):
        if isinstance(value, str) and value.strip().casefold() in ('', 'null', 'unknown', 'n/a', 'desconocido', 'desconocida', 'no especificado', 'desconhecido', 'desconhecida'):
            return None
        return value
