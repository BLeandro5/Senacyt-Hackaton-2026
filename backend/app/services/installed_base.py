"""Canonical assets are created only by a human's new/existing decision."""
import re
import json
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException
from app.ai.age_grounding import normalize
from app.services.reliability import reliability
from app.services.installation_year import installation_year


def modality(value):
    key = normalize(value or '').strip()
    aliases = {'mamografia': 'Mammography', 'mamografo': 'Mammography', 'mammography': 'Mammography', 'rayos x': 'X-ray', 'x-ray': 'X-ray', 'radiografia': 'X-ray', 'ecografia': 'Ultrasound'}
    if key in aliases:
        return aliases[key]
    return {'resonador': 'MRI', 'resonancia': 'MRI', 'mri': 'MRI', 'tomografo': 'CT', 'ct': 'CT', 'tac': 'CT',
            'ecografo': 'Ultrasound', 'ultrasonido': 'Ultrasound', 'ultrasound': 'Ultrasound'}.get(key, key)


def known(value):
    return bool(value and normalize(value).strip() not in ('desconocido', 'desconocida', 'no informado', 'no informada', 'n/a', 'unknown', 'not reported', 'desconhecido', 'desconhecida', 'null'))


def link_evidence(db, visit, observation, equipment):
    if equipment.resolution not in ('new', 'existing'):
        return None
    if equipment.resolution == 'existing':
        asset = db.execute('SELECT * FROM installed_equipment WHERE id=?', (equipment.matchedEquipmentId,)).fetchone()
        if not asset or asset['hospital_id'] != visit.hospitalId or modality(asset['modality']) != modality(equipment.type):
            raise HTTPException(422, 'La coincidencia debe ser un equipo del mismo hospital y modalidad.')
        return asset['id']
    asset_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f'{visit.id}/{observation.id}/{equipment.id}'))
    now = datetime.now(timezone.utc).isoformat()
    db.execute('''INSERT OR IGNORE INTO installed_equipment
        (id,hospital_id,modality,manufacturer,model,configuration,estimated_age,condition,status,created_at,updated_at,last_observed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''', (asset_id, visit.hospitalId, modality(equipment.type), equipment.brand,
        equipment.model, equipment.configuration, equipment.estimatedAge, equipment.status, 'Reported', now, now,
        observation.capturedAt or visit.startedAt))
    return asset_id


def assets(db, hospital_id=None):
    result = []
    for row in db.execute('SELECT * FROM installed_equipment WHERE (? IS NULL OR hospital_id=?)', (hospital_id, hospital_id)):
        evidence = [dict(e) for e in db.execute('''SELECT e.*, v.collaborator_id, o.captured_at, o.original_text,
            u.first_name, u.last_name FROM equipment e JOIN visits v ON v.id=e.visit_id
            JOIN observations o ON o.visit_id=e.visit_id AND o.id=e.observation_id
            LEFT JOIN users u ON u.id=v.collaborator_id
            WHERE e.matched_equipment_id=? AND v.completed_at != '' ''', (row['id'],))]
        if not evidence:
            continue
        observers = {e['collaborator_id'] for e in evidence if e['collaborator_id']}
        compatible_observers = {e['collaborator_id'] for e in evidence if e['collaborator_id']
            and any(known(e[field]) and known(row[field]) for field in ('manufacturer', 'model'))
            and all(not known(e[field]) or not known(row[field])
                    or normalize(e[field]).strip() == normalize(row[field]).strip()
                    for field in ('manufacturer', 'model'))}
        conflict = any(len({normalize(e[field]).strip() for e in evidence if known(e[field])}) > 1
                       for field in ('manufacturer', 'model'))
        age_values = [float(m[0].replace(',', '.')) for e in evidence
                      if (m := re.search(r'\d+(?:[.,]\d+)?', e['estimated_age'] or ''))]
        conflict = conflict or bool(age_values and max(age_values) - min(age_values) >= 5)
        field_statuses = [json.loads(e['evidence_status'] or '{}') for e in evidence]
        quantities = [s.get('quantity') for s in field_statuses]
        quantity_status = 'exact' if any(q in ('Confirmed', 'Reported') for q in quantities) else 'estimated' if 'Estimated' in quantities else None
        dates = [e['captured_at'] for e in evidence if e['captured_at']]
        observed = max(dates) if dates else row['last_observed_at']
        score = reliability(modality=row['modality'], quantity_status=quantity_status,
            manufacturer=row['manufacturer'] if known(row['manufacturer']) else None,
            model=row['model'] if known(row['model']) else None,
            age=row['estimated_age'], age_estimated=any(s.get('age') == 'Estimated' for s in field_statuses) or not field_statuses, configuration=row['configuration'],
            condition=row['condition'] if known(row['condition']) else None, reviewed=any(e['reviewed'] for e in evidence),
            observed_at=observed, corroborators=max(0, len(compatible_observers)-1), conflict=conflict)
        age_match = re.search(r'\d+(?:[.,]\d+)?', row['estimated_age'] or '')
        year,year_status=installation_year('',row['estimated_age'],observed,row['modality'],row['manufacturer']) if row['estimated_installation_year'] is None else (row['estimated_installation_year'],row['installation_year_status'])
        result.append({**dict(row), 'estimated_installation_year':year,'installation_year_status':year_status,'reliability': score, 'hasConflict': conflict,
            'evidenceCount': len(evidence), 'independentCollaborators': len(observers), 'lastObservedAt': observed,
            'potentialOpportunity': bool(age_match and float(age_match[0].replace(',', '.')) > 7),
            'evidence': [{k: e[k] for k in ('id','visit_id','observation_id','original_text','captured_at','manufacturer','model')}
                         | {'evidenceStatus': json.loads(e['evidence_status'] or '{}')}
                         | {'collaboratorName': ' '.join(filter(None, (e['first_name'],e['last_name'])))} for e in evidence]})
    return result
