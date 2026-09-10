"""Evidence statuses and reliability are derived locally.

MedPsy extracts the observation. It never decides whether a fact is confirmed
and never generates the reliability score.
"""

import re

from app.ai.age_grounding import MENTION, normalize
from app.ai.count_grounding import COUNT
from app.services.reliability import reliability


UNKNOWN = {
    '',
    'unknown',
    'null',
    'n/a',
    'desconocido',
    'desconocida',
    'no informado',
    'no informada',
    'desconhecido',
    'desconhecida',
}


def _normalized(value) -> str:
    if value is None:
        return ''
    return normalize(str(value)).strip()


def _quantity_status(source_text: str) -> str | None:
    source = normalize(source_text)

    # Preserve the same conservative quantity rule used by finalized evidence.
    count_prefixes = [source[:match.start()] for match in MENTION.finditer(source)]
    exact_prefixes = [prefix for prefix in count_prefixes if COUNT.search(prefix)]

    estimated_count = any(
        re.search(
            r'\b(unos|unas|aproximadamente|about|around|roughly|cerca de)\b'
            r'[^.;!?]{0,18}$',
            prefix,
        )
        for prefix in count_prefixes
    )

    if estimated_count:
        return 'estimated'
    if exact_prefixes:
        return 'exact'
    return None


def _derive_metadata(
    *,
    source_text: str,
    modality,
    manufacturer,
    model,
    configuration,
    age,
    condition,
    reviewed: bool,
    observed_at: str,
):
    source = normalize(source_text)

    uncertain = bool(
        re.search(
            r'\b(creo|parece|unos|unas|aproximadamente|cerca|quiza|about|around|'
            r'roughly|approximately|maybe|think|acho|talvez)\b',
            source,
        )
    )

    values = {
        'modality': modality,
        'manufacturer': manufacturer,
        'model': model,
        'configuration': configuration,
        'age': age,
        'condition': condition,
    }

    def attribute_uncertain(key, value) -> bool:
        normalized_value = _normalized(value)
        if not normalized_value:
            return False

        if key == 'age':
            return uncertain or bool(
                re.search(
                    r'[~≈]|aprox|about|cerca|entre|\d\s*[-–]\s*\d',
                    normalized_value,
                )
            )

        if key == 'modality':
            return False

        return bool(
            re.search(
                r'\b(?:creo|parece|quiza|maybe|perhaps|acho|talvez)\b'
                r'[^.;!?]{0,24}\b'
                + re.escape(normalized_value)
                + r'\b',
                source,
            )
        )

    statuses = {}
    for key, value in values.items():
        normalized_value = _normalized(value)

        if normalized_value in UNKNOWN:
            statuses[key] = 'Unknown'
        elif attribute_uncertain(key, value):
            statuses[key] = 'Estimated'
        elif reviewed:
            statuses[key] = 'Confirmed'
        else:
            statuses[key] = 'Reported'

    quantity = _quantity_status(source_text)

    if quantity == 'estimated':
        statuses['quantity'] = 'Estimated'
    elif quantity == 'exact':
        statuses['quantity'] = 'Confirmed' if reviewed else 'Reported'
    else:
        statuses['quantity'] = 'Unknown'

    score = reliability(
        modality=modality,
        quantity_status=quantity,
        manufacturer=manufacturer if statuses['manufacturer'] != 'Unknown' else None,
        model=model if statuses['model'] != 'Unknown' else None,
        age=age if statuses['age'] != 'Unknown' else None,
        age_estimated=statuses['age'] == 'Estimated',
        configuration=configuration if statuses['configuration'] != 'Unknown' else None,
        condition=condition if statuses['condition'] != 'Unknown' else None,
        reviewed=reviewed,
        observed_at=observed_at,
    )

    return statuses, score


def evidence_metadata(equipment, observation):
    """Metadata for evidence that is about to be persisted."""

    return _derive_metadata(
        source_text=observation.originalText,
        modality=equipment.type,
        manufacturer=equipment.brand,
        model=equipment.model,
        configuration=equipment.configuration,
        age=equipment.estimatedAge,
        condition=equipment.status,
        reviewed=equipment.reviewed,
        observed_at=observation.capturedAt,
    )


def preliminary_evidence_metadata(equipment, source_text: str, observed_at: str):
    """Preview metadata for a fresh MedPsy extraction before human review."""

    age = (
        None
        if equipment.estimated_age_years is None
        else f'{equipment.estimated_age_years:g} años'
    )

    return _derive_metadata(
        source_text=source_text,
        modality=equipment.modality,
        manufacturer=equipment.manufacturer,
        model=equipment.model,
        configuration=equipment.configuration,
        age=age,
        condition=equipment.condition,
        reviewed=False,
        observed_at=observed_at,
    )
