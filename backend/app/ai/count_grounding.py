"""Check explicit quantities without extracting equipment in place of MedPsy."""
import re

from app.ai.age_grounding import MENTION, ONES, TENS, age_value, normalize
from app.schemas.equipment import EquipmentExtracted


WORDS = '|'.join(TENS) + r'(?: y (?:' + '|'.join(ONES) + r'))?|' + '|'.join(ONES)
COUNT = re.compile(r'(?<![\w.,-])(?P<count>\d+|' + WORDS + r')\s+$')
MAX_EQUIPMENT = 50
KNOWN_BRANDS = ('Philips', 'Siemens', 'GE', 'Mindray', 'Hologic', 'Canon', 'Fujifilm', 'Samsung', 'Esaote', 'Carestream', 'Shimadzu', 'Hitachi', 'Toshiba')


def ground_counts(text: str, equipment: list[EquipmentExtracted]) -> list[EquipmentExtracted]:
    source = normalize(text)
    mentions = list(MENTION.finditer(source))
    result = list(equipment)
    for index, mention in enumerate(mentions):
        prefix = source[:mention.start()]
        quantity = COUNT.search(prefix)
        if quantity is None:
            continue
        # Avoid interpreting limits, negation and estimates as exact counts.
        context = re.split(r'[.;!?\n]', prefix)[-1]
        if re.search(r'\b(no|sin|entre|menos|mas|unos|unas|aproximadamente|hasta)\b', context):
            continue
        count = int(age_value(quantity['count']))
        if count > MAX_EQUIPMENT:
            raise ValueError('Too many devices; split this observation into smaller groups')
        modality = 'X-ray' if mention.lastgroup == 'Xray' else mention.lastgroup
        matching = [i for i, item in enumerate(result) if item.modality == modality]
        same_type = [m for m in mentions if m.lastgroup == mention.lastgroup]
        if len(same_type) > 1:
            # A brand must uniquely identify the phrase if its modality repeats.
            phrases = [source[m.end():mentions[j + 1].start() if j + 1 < len(mentions) else len(source)]
                       for j, m in enumerate(mentions) if m.lastgroup == mention.lastgroup]
            end = mentions[index + 1].start() if index + 1 < len(mentions) else len(source)
            phrase = source[mention.end():end]
            def brand_in(brand: str, candidate: str) -> bool:
                return re.search(r'\b' + re.escape(normalize(brand)) + r'\b', candidate) is not None

            matching = [i for i in matching if result[i].manufacturer
                        and brand_in(result[i].manufacturer, phrase)
                        and sum(brand_in(result[i].manufacturer, p) for p in phrases) == 1]
        if not matching or len(matching) == count:
            continue
        # Only repeat an identical extracted record. Distinct models/conditions
        # cannot safely be collapsed or copied into additional physical devices.
        template = result[matching[0]]
        if any(result[i] != template for i in matching):
            raise ValueError('Ambiguous equipment quantity; separate devices with different attributes')
        insert_at = matching[0]
        result = [item for i, item in enumerate(result) if i not in matching]
        result[insert_at:insert_at] = [template.model_copy(deep=True) for _ in range(count)]
    if len(result) > MAX_EQUIPMENT:
        raise ValueError('Too many devices; split this observation into smaller groups')
    return result


def complete_explicit_mentions(text: str, equipment: list[EquipmentExtracted]) -> list[EquipmentExtracted]:
    """Keep explicitly named devices visible when a small model omits one.

    This only adds the modality and, when literally present in the same phrase,
    a known manufacturer. All other fields intentionally stay unknown.
    """
    source = normalize(text)
    mentions = list(MENTION.finditer(source))
    expected: dict[str, list[str | None]] = {}
    for index, mention in enumerate(mentions):
        modality = 'X-ray' if mention.lastgroup == 'Xray' else mention.lastgroup
        prefix = source[:mention.start()]
        context = re.split(r'[.;!?\n]', prefix)[-1]
        if re.search(r'\b(no|sin)\b', context):
            continue
        quantity = COUNT.search(prefix)
        count = int(age_value(quantity['count'])) if quantity else 1
        if not 1 <= count <= MAX_EQUIPMENT:
            continue
        end = mentions[index + 1].start() if index + 1 < len(mentions) else len(source)
        phrase = source[mention.end():end]
        brand = next((name for name in KNOWN_BRANDS if re.search(r'\b' + re.escape(normalize(name)) + r'\b', phrase)), None)
        expected.setdefault(modality, []).extend([brand] * count)
    result = list(equipment)
    for modality, brands in expected.items():
        current = [item for item in result if item.modality == modality]
        for brand in brands:
            if brand and any(item.manufacturer and normalize(item.manufacturer) == normalize(brand) for item in current):
                continue
            if len(current) >= len(brands):
                break
            item = EquipmentExtracted(modality=modality, manufacturer=brand)
            result.append(item)
            current.append(item)
    return result
