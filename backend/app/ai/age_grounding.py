"""Conservative age attribution for the inventory modalities we normalize.

MedPsy still detects devices and their attributes. This check prevents an age
from another equipment phrase being copied into the returned inventory.
Ambiguous or unsupported age wording produces None instead of a guess.
"""
import re
import unicodedata

from app.schemas.equipment import EquipmentExtracted


def normalize(text: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', text.lower())
                   if unicodedata.category(c) != 'Mn')


MENTION = re.compile(
    r'\b(?P<MRI>resonador(?:es)?|resonancias?(?: magneticas?)?|ressonancias?(?: magneticas?)?|mri)\b|'
    r'\b(?P<CT>tomografos?|tomografias?|ct|tac)\b|'
    r'\b(?P<Ultrasound>ultrasonidos?|ecografos?|ultrasound|ultrassom)\b|'
    r'\b(?P<Xray>rayos x|x-ray)\b'
)
ONES = dict(zip(
    'cero uno un una dos tres cuatro cinco seis siete ocho nueve diez once doce '
    'trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte '
    'veintiuno veintidos veintitres veinticuatro veinticinco veintiseis '
    'veintisiete veintiocho veintinueve'.split(),
    [0, 1, 1, 1, *range(2, 30)],
))
TENS = dict(zip('treinta cuarenta cincuenta sesenta setenta ochenta noventa'.split(), range(30, 100, 10)))
ONES.update(dict(zip('zero one two three four five six seven eight nine ten eleven twelve'.split(), range(13))))
ONES.update({'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'quatro': 4, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'onze': 11, 'doze': 12})
NUMBER = r'(?:\d+(?:[.,]\d+)?|' + '|'.join(TENS) + r'(?: y (?:' + '|'.join(ONES) + r'))?|' + '|'.join(ONES) + ')'
AGE = re.compile(r'\b(?:de|tiene|tienen|con|com|is|aged|age|of)\s+(?:(?:aproximadamente|unos|unas|about|around|approximately|cerca de)\s+)?(?P<number>' + NUMBER + r')\s+(?:anos|years)(?:\s+old)?\b')
PREFIX_AGE = re.compile(r'\b(?P<number>' + NUMBER + r')[- ]year[- ]old\b')
SHARED = re.compile(r'\b(ambos|ambas|todos|todas)\b')


def age_value(number: str) -> float:
    if number in ONES:
        return float(ONES[number])
    if number in TENS:
        return float(TENS[number])
    if ' y ' in number:
        tens, ones = number.split(' y ')
        return float(TENS[tens] + ONES[ones])
    return float(number.replace(',', '.'))


def ground_ages(text: str, equipment: list[EquipmentExtracted]) -> None:
    source = normalize(text)
    mentions = list(MENTION.finditer(source))
    groups = []
    for index, mention in enumerate(mentions):
        end = mentions[index + 1].start() if index + 1 < len(mentions) else len(source)
        phrase = source[mention.end():end]
        # Do not interpret the history of a later sentence as equipment age.
        local = re.split(r'[;!?\n]|\.(?!\d)', phrase, maxsplit=1)[0]
        local = re.split(r'\b(?:hospital|sala|edificio|garantia|contrato|paciente|mantenimiento)\b', local, maxsplit=1)[0]
        ages = list(AGE.finditer(local))
        value = age_value(ages[0]['number']) if len(ages) == 1 else None
        if not ages:
            start = mentions[index - 1].end() if index else 0
            prefix = re.split(r'[;.!?\n]|\band\b', source[start:mention.start()])[-1]
            prefix_ages = list(PREFIX_AGE.finditer(prefix))
            if len(prefix_ages) == 1:
                value = age_value(prefix_ages[0]['number'])
        if re.search(r'\b(no|entre|menos|mas|posiblemente|quiza)\b', local):
            value = None
        groups.append({'modality': 'X-ray' if mention.lastgroup == 'Xray' else mention.lastgroup,
                       'phrase': phrase, 'age': value})
        shared = SHARED.search(local)
        if shared and ages and shared.start() < ages[0].start():
            # Explicit collective age applies within this sentence only.
            sentence_start = max(source.rfind(p, 0, mention.start()) for p in '.;!?\n') + 1
            same_sentence = [i for i in range(len(groups)) if mentions[i].start() >= sentence_start]
            targets = same_sentence[-2:] if shared[0] in ('ambos', 'ambas') else same_sentence
            for target in targets:
                groups[target]['age'] = value

    for item in equipment:
        candidates = [g for g in groups if g['modality'] == item.modality]
        if len(candidates) > 1 and item.manufacturer:
            brand = normalize(item.manufacturer)
            candidates = [g for g in candidates if re.search(r'\b' + re.escape(brand) + r'\b', g['phrase'])]
        values = {g['age'] for g in candidates}
        item.estimated_age_years = values.pop() if len(values) == 1 else None
