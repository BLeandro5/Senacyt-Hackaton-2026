"""Evidence statuses are derived locally; the model cannot confirm facts."""
import re
from app.ai.age_grounding import normalize, MENTION
from app.ai.count_grounding import COUNT
from app.services.reliability import reliability

UNKNOWN = {'', 'unknown', 'null', 'n/a', 'desconocido', 'desconocida', 'no informado', 'no informada', 'desconhecido', 'desconhecida'}


def evidence_metadata(equipment, observation):
    source = normalize(observation.originalText)
    uncertain = bool(re.search(r'\b(creo|parece|unos|unas|aproximadamente|cerca|quiza|about|around|roughly|approximately|maybe|think|acho|talvez)\b', source))
    values = dict(modality=equipment.type, manufacturer=equipment.brand, model=equipment.model,
                  configuration=equipment.configuration, age=equipment.estimatedAge, condition=equipment.status)
    def attribute_uncertain(key, value):
        if key == 'age':
            return uncertain or bool(re.search(r'[~≈]|aprox|about|cerca|entre|\d\s*[-–]\s*\d', normalize(value)))
        if key == 'modality':
            return False
        return bool(re.search(r'\b(?:creo|parece|quiza|maybe|perhaps|acho|talvez)\b[^.;!?]{0,24}\b' + re.escape(normalize(value)) + r'\b', source))
    statuses = {key: 'Unknown' if normalize(value or '').strip() in UNKNOWN else
                'Estimated' if attribute_uncertain(key, value) else
                'Confirmed' if equipment.reviewed else 'Reported' for key, value in values.items()}
    # AI extraction remains Reported until a user explicitly confirms a field.
    # A status supplied by the review UI is accepted only for a known field.
    for key, status in equipment.fieldStatuses.items():
        if key in statuses and (status == 'Unknown' or normalize(values[key] or '').strip() not in UNKNOWN):
            # Qualifying language and ranges make the value an estimate even
            # when a person reviews the rest of the equipment record.
            if statuses[key] != 'Estimated':
                statuses[key] = status
    # A list of proposed devices is not itself proof of an exact observed count.
    count_prefixes = [source[:m.start()] for m in MENTION.finditer(source)]
    exact_prefixes = [prefix for prefix in count_prefixes if COUNT.search(prefix)]
    estimated_count = any(re.search(r'\b(unos|unas|aproximadamente|about|around|roughly|cerca de)\b[^.;!?]{0,18}$', prefix) for prefix in count_prefixes)
    quantity = 'estimated' if estimated_count else 'exact' if exact_prefixes else None
    derived_quantity_status = 'Estimated' if quantity == 'estimated' else ('Confirmed' if equipment.reviewed else 'Reported') if quantity else 'Unknown'
    statuses['quantity'] = 'Estimated' if derived_quantity_status == 'Estimated' else equipment.fieldStatuses.get('quantity', derived_quantity_status)
    score = reliability(modality=equipment.type, quantity_status=quantity,
        manufacturer=equipment.brand if statuses['manufacturer'] != 'Unknown' else None, model=equipment.model if statuses['model'] != 'Unknown' else None,
        age=equipment.estimatedAge if statuses['age'] != 'Unknown' else None, age_estimated=statuses['age'] == 'Estimated',
        configuration=equipment.configuration if statuses['configuration'] != 'Unknown' else None, condition=equipment.status if statuses['condition'] != 'Unknown' else None,
        reviewed=equipment.reviewed, observed_at=observation.capturedAt)
    return statuses, score
