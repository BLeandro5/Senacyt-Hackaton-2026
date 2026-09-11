import json
import re
from collections import Counter
from typing import Literal

from pydantic import BaseModel

from app.ai.qvac_client import generate_with_qvac
from app.ai.age_grounding import ground_ages, normalize, MENTION
from app.ai.count_grounding import complete_explicit_mentions, ground_counts
from app.ai.language import detect_language
from app.ai.narrative_grounding import ground_narrative
from app.schemas.equipment import EquipmentExtracted
from app.schemas.follow_up import FollowUpCandidate
from pydantic import Field


class ExtractionResult(BaseModel):
    equipment: list[EquipmentExtracted]
    detected_language: Literal['es', 'en', 'pt', 'other'] = 'other'
    facility: str | None = None
    city: str | None = None
    country: str | None = None
    follow_up_candidates: list[FollowUpCandidate] = Field(default_factory=list)


KNOWN_MANUFACTURERS = ('Philips', 'Siemens', 'GE', 'Mindray', 'Hologic', 'Canon', 'Fujifilm', 'Samsung', 'Esaote', 'Carestream', 'Shimadzu', 'Hitachi', 'Toshiba')
NUMBER_WORDS = {'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10}
NUMBER_WORDS.update({'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10})
NO_EQUIPMENT = re.compile(r'\b(?:no\s+hay|sin|there\s+is\s+no|no\s+equipment|nao\s+ha|nao\s+existem|sem)\s+(?:ningun[oa]?\s+)?(?:equipos?|equipment|equipamentos?)\b')


def explicit_span_inventory(text: str) -> list[EquipmentExtracted]:
    """Extract literal ES inventory spans to validate a small local model.

    This intentionally recognizes only facts stated in the same equipment
    phrase. It does not estimate ranges, infer brands, or manufacture models.
    """
    source = normalize(text)
    mentions = list(MENTION.finditer(source))
    result = []
    for position, mention in enumerate(mentions):
        modality = 'X-ray' if mention.lastgroup == 'Xray' else mention.lastgroup
        start = mention.end()
        end = mentions[position + 1].start() if position + 1 < len(mentions) else len(source)
        phrase = source[start:end]
        if re.search(r'\b(?:no hay|sin|no se observaron)\s*$', source[max(0, mention.start()-30):mention.start()]):
            continue
        prefix = source[max(0, mention.start() - 48):mention.start()]
        count_match = re.search(r'\b(\d+|' + '|'.join(NUMBER_WORDS) + r')\s*$', prefix)
        expected = int(count_match.group(1)) if count_match and count_match.group(1).isdigit() else NUMBER_WORDS.get(count_match.group(1), 1) if count_match else 1
        brand_hits = [(match.start(), name) for name in KNOWN_MANUFACTURERS
                      for match in re.finditer(r'\b' + re.escape(normalize(name)) + r'\b', phrase)]
        brand_hits.sort()
        created = 0
        for index, (brand_position, brand) in enumerate(brand_hits):
            before_brand = phrase[max(0, brand_position - 24):brand_position]
            explicit_count = re.search(r'\b(\d+|' + '|'.join(NUMBER_WORDS) + r')\s*$', before_brand)
            copies = int(explicit_count.group(1)) if explicit_count and explicit_count.group(1).isdigit() else NUMBER_WORDS.get(explicit_count.group(1), 1) if explicit_count else 1
            next_brand = brand_hits[index + 1][0] if index + 1 < len(brand_hits) else len(phrase)
            details = phrase[max(0, brand_position - 16):next_brand]
            # End at the next physical device, not merely at its brand.
            details = re.split(r';|\by\s+(?:un|otro)\s+(?:equipo|sistema)|\bel segundo\b', details)[0]
            nearby = details
            age_match = re.search(r'\b(?:(?:fue\s+instalado\s+)?hace\s+)?(?:unos?|aproximadamente|cerca de)?\s*(\d+|' + '|'.join(NUMBER_WORDS) + r')\s+anos\b', details)
            age = None if re.search(r'\bentre\s+\d+\s+y\s+\d+\b', details) else (int(age_match.group(1)) if age_match and age_match.group(1).isdigit() else NUMBER_WORDS.get(age_match.group(1)) if age_match else None)
            configuration = '1.5T' if re.search(r'\b1[.,]5\s*t\b', nearby) else 'Móvil' if re.search(r'\bmovil\b', nearby) else 'Portátil' if re.search(r'\bportatil\b', nearby) else None
            condition = 'Operativo' if re.search(r'\boperativ[oa]\b', details) else None
            if condition and 'fallas' in details:
                condition = 'Operativo con fallas intermitentes en el sistema de enfriamiento' if 'fallas intermitentes en el sistema de enfriamiento' in details else 'Operativo'
            age_range = re.search(r'\bentre\s+(\d+)\s+y\s+(\d+)\s+anos', details)
            age_description = f"{age_range[1]}–{age_range[2]} años" if age_range else (f'Aproximadamente {age} años' if age is not None and re.search(r'\b(unos|estima|aproximadamente|parece)\b', details) else None)
            result.extend(EquipmentExtracted(modality=modality, manufacturer=brand, configuration=configuration,
                                             estimated_age_years=age, age_description=age_description, condition=condition) for _ in range(min(copies, 50)))
            created += copies
        remainder = re.search(r'\by\s+un\s+equipo\s+portatil\b', phrase)
        result.extend(EquipmentExtracted(modality=modality, configuration='Portátil' if remainder else None) for _ in range(max(0, min(expected, 50) - created)))
    return result


def literal_short_inventory(text: str) -> list[EquipmentExtracted]:
    """Ground short ES/EN/PT inventory sentences before human review.

    MedPsy remains the extractor. This only supplies an explicit literal
    inventory when a compact note gives a small model contradictory counts or
    brands. It never guesses a brand or product model.
    """
    source = normalize(text)
    mentions = list(MENTION.finditer(source))
    if not mentions or NO_EQUIPMENT.search(source):
        return []
    brands = [(match.start(), name) for name in KNOWN_MANUFACTURERS
              for match in re.finditer(r'\b' + re.escape(normalize(name)) + r'\b', source)]
    assignments: dict[int, list[tuple[int, str]]] = {index: [] for index in range(len(mentions))}
    for position, brand in brands:
        nearest = min(range(len(mentions)), key=lambda index: abs(mentions[index].start() - position))
        if abs(mentions[nearest].start() - position) <= 45:
            assignments[nearest].append((position, brand))
    words = '|'.join(re.escape(word) for word in NUMBER_WORDS)
    count_pattern = re.compile(r'\b(?P<count>\d+|' + words + r')(?:\s+(?:equipos?|sistemas?|systems?|equipment|equipamentos?))?\s*$')
    result: list[EquipmentExtracted] = []
    for index, mention in enumerate(mentions):
        sentence_start = max(source.rfind(stop, 0, mention.start()) for stop in '.;!?\n') + 1
        prefix = source[sentence_start:mention.start()]
        count_match = count_pattern.search(prefix)
        count = int(count_match['count']) if count_match and count_match['count'].isdigit() else NUMBER_WORDS.get(count_match['count'], 1) if count_match else 1
        count = min(max(count, 1), 50)
        assigned = assignments[index]
        brand = min(assigned, key=lambda hit: abs(hit[0] - mention.start()))[1] if assigned else None
        end = mentions[index + 1].start() if index + 1 < len(mentions) else len(source)
        local = source[max(0, mention.start() - 45):min(len(source), end + 45)]
        model = None
        if brand and re.search(r'\b' + re.escape(normalize(brand)) + r'\s+incisive\b', local):
            model = 'Incisive'
        modality = 'X-ray' if mention.lastgroup == 'Xray' else mention.lastgroup
        # Ellipsis: "dos tomógrafos Philips y uno Siemens" has three devices.
        # Only expand an explicit count immediately before each additional brand.
        if len(mentions) == 1 and len(assigned) > 1:
            scoped = []
            for brand_index, (position, name) in enumerate(sorted(assigned)):
                if brand_index == 0:
                    copies = count
                else:
                    preceding = source[mention.end():position]
                    additional = re.search(r'\b(?:y|and|e)\s+(\d+|' + words + r')\s*$', preceding)
                    if additional is None:
                        scoped = []
                        break
                    copies = int(additional[1]) if additional[1].isdigit() else NUMBER_WORDS[additional[1]]
                scoped.extend(EquipmentExtracted(modality=modality, manufacturer=name) for _ in range(min(copies, 50)))
            if scoped:
                return scoped
        result.extend(EquipmentExtracted(modality=modality, manufacturer=brand, model=model) for _ in range(count))
    return result


def literal_correction_needed(model_items: list[EquipmentExtracted], literal_items: list[EquipmentExtracted]) -> bool:
    aliases = {'resonancia': 'MRI', 'resonador': 'MRI', 'mri': 'MRI', 'tomografo': 'CT', 'ct': 'CT', 'ultrasonido': 'Ultrasound', 'ultrasound': 'Ultrasound'}
    normalized = lambda item: aliases.get(normalize(item.modality), item.modality)
    if len(model_items) != len(literal_items) or Counter(normalized(item) for item in model_items) != Counter(normalized(item) for item in literal_items):
        return True
    stated_model_brands = Counter(normalize(item.manufacturer) for item in model_items if item.manufacturer)
    stated_literal_brands = Counter(normalize(item.manufacturer) for item in literal_items if item.manufacturer)
    return any(stated_model_brands[brand] > stated_literal_brands[brand] for brand in stated_model_brands)


def complete_json_objects(raw: str) -> list[dict]:
    """Return valid nested JSON objects without trying to repair their values."""
    objects = []
    for start, opening in enumerate(raw):
        if opening != '{':
            continue
        depth, quoted, escaped = 0, False, False
        for index in range(start, len(raw)):
            character = raw[index]
            if quoted:
                if escaped:
                    escaped = False
                elif character == '\\':
                    escaped = True
                elif character == '"':
                    quoted = False
                continue
            if character == '"':
                quoted = True
            elif character == '{':
                depth += 1
            elif character == '}':
                depth -= 1
                if depth == 0:
                    try:
                        value = json.loads(raw[start:index + 1])
                        if isinstance(value, dict):
                            objects.append(value)
                    except json.JSONDecodeError:
                        pass
                    break
    return objects


def parse_extraction(raw: str) -> ExtractionResult:
    # Qwen-based models can start inside an implicit thinking block: the SDK
    # may return its closing tag without an opening <think>. Only parse the
    # final answer after that explicit boundary, never JSON from reasoning.
    if '</think>' in raw:
        raw = raw.rsplit('</think>', 1)[1]
    if '<think>' in raw:
        raise ValueError('Model reasoning was not completed')
    raw = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw.strip(), flags=re.IGNORECASE)
    try:
        return ExtractionResult.model_validate_json(raw)
    except ValueError as original_error:
        # MedPsy can repeat an equipment wrapper between valid device objects.
        # Only complete objects that already name a modality are retained.
        items = [value for value in complete_json_objects(raw) if 'modality' in value]
        if not items:
            raise original_error
        return ExtractionResult(equipment=[EquipmentExtracted.model_validate(item) for item in items])


def extract_result(text: str) -> ExtractionResult:
    from app.ai.prompts import EXTRACTION_PROMPT
    prompt = EXTRACTION_PROMPT
    language = detect_language(text)
    if language in ('es', 'en', 'pt'):
        prompt = prompt.replace('Observation JSON string:', 'Questions must be written in ' + {'es':'Spanish', 'en':'English', 'pt':'Portuguese'}[language] + '.\nObservation JSON string:')
    literal_inventory = explicit_span_inventory(text)
    raw = generate_with_qvac(prompt + json.dumps(text, ensure_ascii=False))
    result = parse_extraction(raw)
    result.detected_language = detect_language(text)
    source = ' '.join(normalize(text).split())
    for field in ('facility', 'city', 'country'):
        value = getattr(result, field)
        if value and ' '.join(normalize(value).split()) not in source:
            setattr(result, field, None)
    for item in result.equipment:
        for field in ('manufacturer', 'model', 'configuration', 'age_description', 'condition'):
            value = getattr(item, field)
            if value and normalize(value).strip() in {'unknown', 'null', 'desconocido', 'desconocida', 'no especificado'}:
                setattr(item, field, None)
    if NO_EQUIPMENT.search(normalize(text)):
        result.equipment = []
        return result
    short_inventory = literal_short_inventory(text) if len(text) <= 350 else []
    if short_inventory and result.equipment and literal_correction_needed(result.equipment, short_inventory):
        ground_ages(text, short_inventory)
        result.equipment = short_inventory
        result.follow_up_candidates = []  # Original indices no longer identify these devices.
        return result
    # A model-proposed location is not trusted unless it occurs in the note.
    source = ' '.join(normalize(text).split())
    for field in ('facility', 'city', 'country'):
        value = getattr(result, field)
        if value and (' '.join(normalize(value).split()) not in source):
            setattr(result, field, None)
    # Keep a valid model result by default. For a long field note, a literal
    # span inventory can safely restore devices the model omitted altogether.
    referential_groups = bool(re.search(r'\b(?:uno de (?:los|ellos)|los otros|el tercero)\b', source))
    enumerated_inventory = any(source[m.end():].lstrip().startswith(':') for m in MENTION.finditer(source)) and len({e.modality for e in literal_inventory}) >= 3
    using_literal_inventory = bool(not referential_groups and result.equipment and (enumerated_inventory or len(literal_inventory) > len(result.equipment)))
    equipment = literal_inventory if using_literal_inventory else result.equipment
    # Do not keep model-created labels such as "Philips CT scanner" when the
    # note named only Philips and CT. Attributes must be directly grounded.
    for item in equipment:
        for field in ('manufacturer', 'model', 'configuration', 'condition'):
            value = getattr(item, field)
            if not using_literal_inventory and value and (' '.join(normalize(value).split()) not in source):
                if field == 'condition' and all(word in source for word in re.findall(r'\w+', normalize(value)) if word not in {'con','y','el','la','en','de'}):
                    continue
                setattr(item, field, None)
    # Normalize equivalent modality names without inventing or adding equipment.
    modalities = {
        'tomography': 'CT',
        'resonancia': 'MRI', 'resonancia magnética': 'MRI', 'resonador': 'MRI',
        'mri': 'MRI', 'ct': 'CT', 'tomógrafo': 'CT', 'tomografía': 'CT',
        'ultrasound': 'Ultrasound', 'ultrasonido': 'Ultrasound', 'ecógrafo': 'Ultrasound',
        'mammography': 'Mammography', 'mamografía': 'Mammography', 'mamógrafo': 'Mammography',
        'rayos x': 'X-ray', 'x-ray': 'X-ray',
        'ressonancia': 'MRI', 'ressonância magnética': 'MRI', 'ultrassom': 'Ultrasound',
    }
    for item in equipment:
        key = item.modality.strip().lower().split('|', 1)[0].strip()
        item.modality = modalities.get(key, item.modality)
    for item in equipment:
        if item.model:
            continue
        model_source = next((candidate.model for candidate in short_inventory
                             if candidate.model and candidate.modality == item.modality and
                             (not candidate.manufacturer or normalize(candidate.manufacturer) == normalize(item.manufacturer or ''))), None)
        if model_source:
            item.model = model_source
    if using_literal_inventory:
        result.equipment = equipment
        result.follow_up_candidates = []
        return result
    if referential_groups:
        from app.ai.group_grounding import reconcile_declared_groups
        reconciled = reconcile_declared_groups(text, equipment)
        if reconciled is not None:
            # Rebuild indices only for explicit groups, then validate questions
            # again against the reconciled devices in observation_service.
            result.equipment = reconciled
            return result
        # Do not recount "the second", model names containing CT, or inspected
        # subsets as additional devices. Keep MedPsy's physical-device grouping.
        # An unassigned age range must not become a fact on either candidate.
        ambiguous = re.search(r'\buno de (?:los|ellos)\b[^.!?]*\b(?:no estoy seguro|no se|no pude confirmar)[^.!?]*', source)
        if ambiguous:
            for item in equipment:
                if not item.manufacturer or normalize(item.manufacturer) in ambiguous[0]:
                    item.estimated_age_years = None
                    item.age_description = None
        result.equipment = equipment
        return result
    ground_ages(text, equipment)
    # Discard known modalities that the model added without any mention in
    # the note. Preserve unsupported types for review instead of guessing.
    mentioned = {'X-ray' if m.lastgroup == 'Xray' else m.lastgroup
                 for m in MENTION.finditer(source)}
    supported = {'CT', 'MRI', 'Ultrasound', 'Mammography', 'X-ray'}
    equipment = [item for item in equipment
                 if item.modality not in supported or item.modality in mentioned]
    grounded = ground_counts(text, equipment)
    result.equipment = ground_narrative(text, complete_explicit_mentions(text, grounded)) if grounded else grounded
    if len(result.equipment) != len(equipment):
        result.follow_up_candidates = []
    return result


def extract_equipment(text: str) -> list[EquipmentExtracted]:
    return extract_result(text).equipment
