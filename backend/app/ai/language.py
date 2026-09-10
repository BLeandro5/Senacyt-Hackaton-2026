"""Conservative local language hints for short ES/EN/PT inventory notes.

Ambiguous notes (e.g. just a model/brand) remain other. This is not translation.
"""
import re
from app.ai.age_grounding import normalize

MARKERS = {
    'es': {'hay','veo','estoy','tiene','tienen','un','dos','siete','ocho','nueve','una','unos','las','los','del','sin','modelo','resonador','resonadores'},
    'en': {'there','the','an','one','two','three','eight','years','year','old','with','from','manufacturer','equipment','system','systems','unknown'},
    'pt': {'ha','um','uma','dois','duas','oito','nao','com','sem','ressonancia','equipamentos','desconhecido','desconhecida','salao'},
}


def detect_language(text):
    tokens=set(re.findall(r'\b\w+\b',normalize(text)))
    scores={language:len(tokens & markers) for language,markers in MARKERS.items()}
    if 'años' in text.lower(): scores['es']+=2
    if 'não' in text.lower() or 'há' in text.lower(): scores['pt']+=2
    best=max(scores.values())
    winners=[language for language,score in scores.items() if score==best]
    return winners[0] if best and len(winners)==1 else 'other'
