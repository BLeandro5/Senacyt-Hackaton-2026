"""Validate individually enumerated devices against their own source clauses.

Only reconciles a modality when explicit device clauses and model records have
the same count. It never creates inventory in place of model inference.
"""
import re
from collections import Counter

from app.ai.age_grounding import MENTION, NUMBER, age_value, normalize


START = re.compile(
    r'\b(?:el\s+(?:primero|segundo|tercero)\b|'
    r'(?:un|el)\s+(?:primer|segundo|tercer)\s+(?:tomografo|resonador|equipo)\b|'
    r'uno\s+(?=[A-Za-z])|otro\s+(?:equipo|resonador|tomografo)\b|'
    r'un\s+(?:resonador|tomografo)\b)'
)
RANGE = re.compile(r'\bentre\s+(' + NUMBER + r')\s+y\s+(' + NUMBER + r')\s+anos\b')
AGE = re.compile(r'\b(?:hace|de|tiene|tener)\s+(?:aproximadamente\s+|unos?\s+)?(' + NUMBER + r')\s+anos\b')


def ground_narrative(text, equipment):
    source = normalize(text)
    mentions = list(MENTION.finditer(source))
    starts = list(START.finditer(source))
    clauses = []
    for index, start in enumerate(starts):
        end = starts[index + 1].start() if index + 1 < len(starts) else len(source)
        # Stop at the sentence boundary, while preserving decimal field strengths.
        clause = re.split(r'\.(?!\d)|[;!?]', source[start.start():end], maxsplit=1)[0]
        local = list(MENTION.finditer(clause))
        previous = [m for m in mentions if m.start() < start.start()]
        mention = local[0] if local else previous[-1] if previous else None
        if mention is None:
            continue
        modality = 'X-ray' if mention.lastgroup == 'Xray' else mention.lastgroup
        clauses.append((modality, clause))
    counts = Counter(modality for modality, _ in clauses)
    for modality, count in counts.items():
        items = [item for item in equipment if item.modality == modality]
        if count < 2 or len(items) != count:
            continue
        spans = [clause for kind, clause in clauses if kind == modality]
        # Match distinctive literal brand/configuration first, not output order.
        remaining = list(items)
        assignments = []
        # Reserve explicitly identified devices before assigning unknown spans.
        spans = sorted(spans, key=lambda clause: max(
            sum(bool(value and re.search(r'\b' + re.escape(normalize(value)) + r'\b', clause))
                for value in (item.manufacturer, item.configuration)) for item in items), reverse=True)
        for clause in spans:
            def rank(item):
                return sum(bool(value and re.search(r'\b' + re.escape(normalize(value)) + r'\b', clause))
                           for value in (item.manufacturer, item.configuration))
            selected = max(remaining, key=rank)
            remaining.remove(selected)
            assignments.append((selected, clause))
        for item, clause in assignments:
            for field in ('manufacturer', 'model', 'configuration', 'condition'):
                value = getattr(item, field)
                if value and normalize(value) not in clause:
                    setattr(item, field, None)
            # A later unrelated sentence cannot donate an age or maintenance date.
            age_clause = re.split(r'\b(?:mantenimiento|garantia|contrato)\b', clause)[0]
            age_range = RANGE.search(age_clause)
            age = AGE.search(age_clause)
            item.estimated_age_years = None
            item.age_description = None
            if age_range:
                low, high = age_value(age_range[1]), age_value(age_range[2])
                if 0 <= low <= high <= 150:
                    item.age_description = f'{low:g}–{high:g} años'
            elif age:
                value = age_value(age[1])
                if 0 <= value <= 150:
                    item.estimated_age_years = value
                    item.age_description = f'Aproximadamente {value:g} años'
            operational = re.search(r'\b(?:continua en operacion|sigue operativo|esta operativo)\b', clause)
            failure = re.search(r'\bfallas[^,;.]*', clause)
            if operational:
                item.condition = operational[0] + ('; ' + failure[0] if failure else '')
            # Keep historical/uninspected status as qualified evidence, never as
            # a definite operational condition or confirmed physical presence.
            if 'retirado' in clause and re.search(r'no (?:se )?pudo verificar', clause):
                item.condition = 'Retiro reportado; presencia en almacenamiento no verificada'
            elif re.search(r'no fue posible inspeccionar|no (?:se )?pudo inspeccionar', clause):
                item.condition = 'No inspeccionado; estado operativo desconocido'
    return equipment
