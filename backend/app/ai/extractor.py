from app.schemas.equipment import EquipmentExtracted


def extract_equipment(text: str) -> list[EquipmentExtracted]:
    """
    Extrae equipos mencionados en una observación.

    Por ahora devuelve datos simulados.
    Más adelante esta función utilizará QVAC.
    """

    # Respuesta temporal para comprobar el flujo completo
    return [
        EquipmentExtracted(
            modality="MRI",
            manufacturer="Siemens",
        ),
        EquipmentExtracted(
            modality="MRI",
            manufacturer="Siemens",
        ),
        EquipmentExtracted(
            modality="CT",
            manufacturer="Philips",
            estimated_age_years=7,
        ),
    ]