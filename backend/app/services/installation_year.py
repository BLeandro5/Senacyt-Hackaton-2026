"""Explicit installation year scoped to an equipment phrase, else estimated from age."""
import re
from datetime import datetime
from app.ai.age_grounding import MENTION, normalize

def installation_year(note,age,observed_at,equipment_type,manufacturer='',reviewed=False):
    try: year=datetime.fromisoformat(observed_at.replace('Z','+00:00')).year
    except (ValueError,TypeError,AttributeError): return None,'Unknown'
    source=normalize(note);mentions=list(MENTION.finditer(source));kind=MENTION.search(normalize(equipment_type))
    candidates=[]
    for i,mention in enumerate(mentions):
        if not kind or mention.lastgroup!=kind.lastgroup:continue
        end=mentions[i+1].start() if i+1<len(mentions) else len(source)
        phrase=source[mention.start():end]
        candidates.append(phrase)
    if len(candidates)>1 and manufacturer:
        candidates=[phrase for phrase in candidates if normalize(manufacturer) in phrase]
    if len(candidates)==1:
        years=re.findall(r'\b(?:instalad[oa]s?|installed|instalacao|installation)\b[^.;!?]{0,24}\b(19\d{2}|20\d{2})\b',candidates[0])
        if len(set(years))==1 and 1900<=int(years[0])<=year:
            return int(years[0]),'Confirmed' if reviewed else 'Reported'
    match=re.search(r'\d+(?:[.,]\d+)?',str(age if age is not None else ''))
    if match:
        years=float(match[0].replace(',','.'))
        if 0<=years<=150:return year-int(years),'Estimated'
    return None,'Unknown'
