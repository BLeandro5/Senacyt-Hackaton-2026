"""Contextual questions; model wording is subordinate to data rules."""
from app.services.evidence import _quantity_status, UNKNOWN, _normalized
from app.ai.count_grounding import KNOWN_BRANDS
from app.ai.age_grounding import MENTION
import re

FIELDS=[('manufacturer','manufacturer','marca'),('age','estimated_age_years','antigüedad'),('model','model','modelo'),('configuration','configuration','configuración'),('condition','condition','estado')]

def validated_questions(equipment,text,proposals=(),answered=()):
    # MedPsy chooses and ranks. Never disguise a fixed questionnaire as AI.
    attributes = {field: attribute for field, attribute, _ in FIELDS}
    result, seen = [], set(answered)
    for proposed in proposals:
        index, field = proposed.equipment_index, proposed.field
        key = f'{index}:{field}'
        if key in seen or not 0 <= index < len(equipment):
            continue
        item = equipment[index]
        brands = [brand for brand in KNOWN_BRANDS if re.search(r'\b' + re.escape(_normalized(brand)) + r'\b', _normalized(proposed.question))]
        if brands and _normalized(item.manufacturer) not in {_normalized(brand) for brand in brands}:
            continue
        modalities = {'X-ray' if match.lastgroup == 'Xray' else match.lastgroup for match in MENTION.finditer(_normalized(proposed.question))}
        if modalities and item.modality not in modalities:
            continue
        if field == 'quantity':
            if _quantity_status(text) == 'exact':
                continue
        else:
            if _normalized(getattr(item, attributes[field])) not in UNKNOWN:
                continue
            if field == 'age' and item.age_description:
                continue
        if not proposed.question.strip() or any(p.question == proposed.question for p in result):
            continue
        seen.add(key)
        result.append(proposed)
        if len(result) == 2:
            break
    return result
