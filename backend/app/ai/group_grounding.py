"""Reconcile explicit Spanish group totals and their local device clauses.

Applies only to distinct, explicitly counted modality groups already detected
by MedPsy. Repeated references and inspected subsets cannot increase a total.
Unresolved attributes stay null; the complete note remains human evidence.
"""
import re
from app.ai.age_grounding import MENTION, NUMBER, age_value, normalize
from app.ai.count_grounding import KNOWN_BRANDS
from app.schemas.equipment import EquipmentExtracted

INTRO = re.compile(r'\b(?:observe|vi|hay|tienen|tenemos|existen|se observaron|se identificaron)\s+'
                   r'(?:(?:unos?|unas?|aproximadamente)\s+)?(' + NUMBER + r')\s+(?:equipos?\s+de\s+)?$')
ORDINAL = re.compile(r'\b(?:el|del)\s+(primero|primer|segundo|tercero|tercer)\b|^\s*uno\s+(?:es|tiene)\b')
AGE = re.compile(r'\b(?:de|tiene|tener|hace|con)\s+(?:(aproximadamente|unos?|cerca de)\s+)?(' + NUMBER + r')\s+anos\b')
BRANDS = re.compile(r'\b(?:' + '|'.join(KNOWN_BRANDS) + r')\b', re.I)


def attributes(clause, item):
    source = normalize(clause)
    brand = BRANDS.search(clause)
    if brand:
        item.manufacturer = next(b for b in KNOWN_BRANDS if b.casefold() == brand[0].casefold())
    # Literal product words after a brand or "es un", never catalog knowledge.
    tail = clause[brand.end():].strip() if brand else re.split(r'\bes un\s+', clause, flags=re.I)[-1] if re.search(r'\bes un\s+', clause, re.I) else ''
    model = re.match(r'([A-Z][A-Za-z0-9-]*(?:\s+(?:[A-Z][A-Za-z0-9-]*|\d+[A-Za-z0-9-]*))*)\b', tail)
    if model and model[1] not in {'CT', 'MRI', 'Ultrasound', *KNOWN_BRANDS}:
        item.model = model[1]
    strength = re.search(r'\b\d+(?:[.,]\d+)?\s*[tT]\b|\b\d+\s+cortes\b', clause)
    if strength:
        item.configuration = strength[0]
    elif re.search(r'\bportatil\b', source):
        item.configuration = 'Portátil'
    elif re.search(r'\bmovil\b', source):
        item.configuration = 'Móvil'
    age = AGE.search(source)
    if age and not re.search(r'\b(?:entre|no|desconoc|mantenimiento|garantia)\b', source[:age.end()]):
        value = age_value(age[2])
        if 0 <= value <= 150:
            item.estimated_age_years = value
            if age[1] or re.search(r'\b(?:creo|parece|estima)\b', source):
                item.age_description = f'Aproximadamente {value:g} años'
    if re.search(r'\b(?:operativo|funcionando)\b', source) and not re.search(r'\bno\s+(?:esta\s+)?(?:operativo|funcionando)', source):
        item.condition = 'Operativo'
        if 'fallas' in source:
            item.condition += '; fallas reportadas' if 'report' in source else '; con fallas'
    elif 'fuera de servicio' in source:
        item.condition = 'Fuera de servicio'


def reconcile_declared_groups(text, predicted):
    source = normalize(text)
    groups = []
    for mention in MENTION.finditer(source):
        prefix_start = max(source.rfind(stop, 0, mention.start()) for stop in '.;!?\n') + 1
        count = INTRO.search(source[prefix_start:mention.start()])
        if not count:
            continue
        if re.search(r'\b(?:no|sin|quizas|posiblemente)\b', source[prefix_start:mention.start()]):
            return None
        modality = 'X-ray' if mention.lastgroup == 'Xray' else mention.lastgroup
        number = int(age_value(count[1]))
        if not 1 <= number <= 50:
            return None
        groups.append((mention, modality, number))
    modalities = [kind for _, kind, _ in groups]
    if len(groups) < 2 or len(set(modalities)) != len(modalities) or sum(n for _, _, n in groups) > 50:
        return None
    if set(modalities) != {item.modality for item in predicted}:
        return None
    result = []
    for position, (mention, modality, count) in enumerate(groups):
        end = groups[position + 1][0].start() if position + 1 < len(groups) else len(text)
        section = text[mention.end():end]
        if re.search(r'\b(?:retirad\w*|trasladad\w*|futur\w*|comprar\w*)\b', normalize(section)):
            return None
        clauses = re.split(r'\.(?!\d)|[;\n]', section)
        items = [EquipmentExtracted(modality=modality) for _ in range(count)]
        # Attributes directly attached to the plural introduction are shared.
        introduction = re.split(r'[:,]|\b(?:uno|otro|el segundo)\b', clauses[0], maxsplit=1, flags=re.I)[0]
        for item in items:
            attributes(introduction, item)
        assigned = 0
        for clause in clauses[1:]:
            normalized = normalize(clause).strip()
            if not normalized:
                continue
            if re.search(r'\buno de (?:los|ellos)\b', normalized):
                continue  # Unknown attribution: keep the range in original evidence.
            ordinal = ORDINAL.search(normalized)
            if ordinal:
                index = {'primero':0, 'primer':0, 'segundo':1, 'tercero':2, 'tercer':2}.get(ordinal[1], 0)
                if index < count:
                    attributes(clause, items[index])
                    assigned = max(assigned, index + 1)
                continue
            brand_hits = list(BRANDS.finditer(clause))
            for brand_index, brand in enumerate(brand_hits):
                prefix = normalize(clause[:brand.start()])
                explicit = re.search(r'\b(' + NUMBER + r')\s+(?:son\s+)?$', prefix)
                if not explicit:
                    continue
                copies = int(age_value(explicit[1]))
                stop = brand_hits[brand_index + 1].start() if brand_index + 1 < len(brand_hits) else len(clause)
                detail = clause[brand.start():stop]
                for index in range(assigned, min(count, assigned + copies)):
                    attributes(detail, items[index])
                assigned += copies
        result.extend(items)
    return result
