from typing import Optional

from pydantic import BaseModel


class EquipmentExtracted(BaseModel):
    # Tipo de equipo: MRI, CT, Ultrasound, etc.
    modality: str

    # Fabricante si fue mencionado
    manufacturer: Optional[str] = None

    # Modelo si fue mencionado
    model: Optional[str] = None

    configuration: Optional[str] = None

    # Edad aproximada en años
    estimated_age_years: Optional[float] = None

    # Estado aparente del equipo
    condition: Optional[str] = None
