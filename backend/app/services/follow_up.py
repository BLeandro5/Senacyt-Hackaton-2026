"""Contextual questions; model wording is subordinate to data rules."""
from app.schemas.follow_up import FollowUpCandidate
from app.services.evidence import _quantity_status, UNKNOWN, _normalized

FIELDS=[('manufacturer','manufacturer','marca'),('age','estimated_age_years','antigüedad'),('model','model','modelo'),('configuration','configuration','configuración'),('condition','condition','estado')]

def validated_questions(equipment,text,proposals=(),answered=()):
    eligible=[]
    if equipment and _quantity_status(text) != 'exact':
        estimated=_quantity_status(text)=='estimated'
        eligible.append((0,'quantity',f'¿La cantidad de {len(equipment)} equipos es exacta o aproximada?' if estimated else '¿Puedes confirmar cuántos equipos observaste? Indica la cantidad y si es exacta o aproximada.'))
    for field,attribute,label in FIELDS:
        for index,item in enumerate(equipment):
            if _normalized(getattr(item,attribute)) in UNKNOWN:
                eligible.append((index,field,f'Para el equipo {index+1} ({item.modality}{" " + item.manufacturer if item.manufacturer else ""}), ¿conoces su {label}?'))
    result=[]
    for index,field,fallback in eligible:
        if f'{index}:{field}' in answered: continue
        proposed=next((p for p in proposals if p.equipment_index==index and p.field==field),None)
        # A validated field/index gets contextual wording; untrusted model text
        # never overrides quantity semantics or introduces a new missing field.
        question=proposed.question if proposed and field!='quantity' else fallback
        result.append(FollowUpCandidate(equipment_index=index,field=field,question=question))
    return result
