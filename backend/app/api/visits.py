import sqlite3
import json
import re
import uuid
from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from app.db.database import get_db
from app.schemas.visit import VisitRecord
from app.services.installed_base import assets, link_evidence, modality, known
from app.services.evidence import evidence_metadata
from app.services.visit_similarity import similar_visits
from app.services.installation_year import installation_year
from app.services.training_feedback import save_training_feedback

router = APIRouter(tags=['Storage'])


class AssetDecision(BaseModel):
    actorId: str = Field(min_length=1)
    action: Literal['Confirmed', 'Reported', 'Needs verification', 'accept_evidence', 'separate']
    visitId: str | None = None
    observationId: str | None = None
    equipmentId: str | None = None


class VisitSimilarityQuery(BaseModel):
    hospitalId: str = Field(min_length=1)
    text: str = Field(min_length=3, max_length=20_000)


@router.put('/installed-equipment/{asset_id}/decision')
def asset_decision(asset_id: str, payload: AssetDecision, db=Depends(get_db)):
    asset = db.execute('SELECT * FROM installed_equipment WHERE id=?', (asset_id,)).fetchone()
    if asset is None:
        raise HTTPException(404, 'Equipo no encontrado')
    now = datetime.now(timezone.utc).isoformat()
    with db:
        if payload.action in ('accept_evidence', 'separate'):
            evidence = db.execute('SELECT * FROM equipment WHERE visit_id=? AND observation_id=? AND id=? AND matched_equipment_id=?',
                                  (payload.visitId, payload.observationId, payload.equipmentId, asset_id)).fetchone()
            if evidence is None:
                raise HTTPException(422, 'Selecciona una evidencia vinculada a este equipo.')
            if payload.action == 'separate':
                new_id = str(uuid.uuid4())
                db.execute('''INSERT INTO installed_equipment
                    (id,hospital_id,modality,manufacturer,model,configuration,estimated_age,condition,status,created_at,updated_at,last_observed_at,estimated_installation_year,installation_year_status)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', (new_id,asset['hospital_id'],evidence['modality'],evidence['manufacturer'],
                    evidence['model'],evidence['configuration'],evidence['estimated_age'],evidence['condition'],'Reported',now,now,asset['last_observed_at'],evidence['estimated_installation_year'],evidence['installation_year_status']))
                db.execute('UPDATE equipment SET matched_equipment_id=? WHERE visit_id=? AND observation_id=? AND id=?',
                           (new_id,payload.visitId,payload.observationId,payload.equipmentId))
            else:
                db.execute('UPDATE installed_equipment SET manufacturer=?,model=?,configuration=?,estimated_age=?,condition=?,updated_at=?,estimated_installation_year=?,installation_year_status=? WHERE id=?',
                           (evidence['manufacturer'],evidence['model'],evidence['configuration'],evidence['estimated_age'],evidence['condition'],now,evidence['estimated_installation_year'],evidence['installation_year_status'],asset_id))
        else:
            db.execute('UPDATE installed_equipment SET status=?,updated_at=? WHERE id=?', (payload.action,now,asset_id))
        db.execute('INSERT INTO audit_events VALUES (?,?,?,?,?,?)',
                   (str(uuid.uuid4()),now,payload.actorId,asset_id,payload.action,payload.model_dump_json()))
    return {'ok': True}


class HospitalProposal(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    country: str = Field(min_length=1, max_length=100)


class HospitalDecision(BaseModel):
    actorId: str = Field(min_length=1)
    status: Literal['Confirmed', 'Reported', 'Needs verification']


@router.put('/hospitals/{hospital_id}/decision')
def hospital_decision(hospital_id: str, payload: HospitalDecision, db=Depends(get_db)):
    if not db.execute('SELECT 1 FROM hospitals WHERE id=?', (hospital_id,)).fetchone():
        raise HTTPException(404, 'Hospital no encontrado')
    with db:
        db.execute('UPDATE hospitals SET verification_status=? WHERE id=?', (payload.status, hospital_id))
        db.execute('INSERT INTO audit_events VALUES (?,?,?,?,?,?)', (str(uuid.uuid4()), datetime.now(timezone.utc).isoformat(),
            payload.actorId, hospital_id, 'hospital_verification', payload.model_dump_json()))
    return {'ok': True}


@router.get('/review/evidence')
def unlinked_evidence(db=Depends(get_db)):
    return [dict(r) for r in db.execute('''SELECT e.*,v.hospital_id,h.name AS hospital_name,
        o.original_text,o.captured_at,u.first_name,u.last_name FROM equipment e
        JOIN visits v ON v.id=e.visit_id JOIN hospitals h ON h.id=v.hospital_id
        JOIN observations o ON o.visit_id=e.visit_id AND o.id=e.observation_id
        LEFT JOIN users u ON u.id=v.collaborator_id
        WHERE (e.matched_equipment_id IS NULL OR e.matched_equipment_id='') AND v.completed_at!=''
        ORDER BY o.captured_at DESC''')]


class EvidenceDecision(BaseModel):
    actorId: str = Field(min_length=1)
    visitId: str
    observationId: str
    equipmentId: str
    assetId: str | None = None


@router.put('/review/evidence')
def resolve_evidence(payload: EvidenceDecision, db=Depends(get_db)):
    row = db.execute('''SELECT e.*,v.hospital_id,o.captured_at FROM equipment e JOIN visits v ON v.id=e.visit_id
        JOIN observations o ON o.visit_id=e.visit_id AND o.id=e.observation_id
        WHERE e.visit_id=? AND e.observation_id=? AND e.id=? AND v.completed_at!='' ''',
        (payload.visitId,payload.observationId,payload.equipmentId)).fetchone()
    if row is None:
        raise HTTPException(404, 'Evidencia no encontrada')
    if row['matched_equipment_id']:
        raise HTTPException(409, 'La evidencia ya está vinculada; actualiza la cola.')
    now = datetime.now(timezone.utc).isoformat()
    with db:
        asset_id = payload.assetId
        if asset_id:
            candidate = db.execute('SELECT * FROM installed_equipment WHERE id=?', (asset_id,)).fetchone()
            if not candidate or candidate['hospital_id'] != row['hospital_id'] or modality(candidate['modality']) != modality(row['modality']):
                raise HTTPException(422, 'El candidato debe pertenecer al mismo hospital y modalidad.')
        else:
            asset_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{payload.visitId}/{payload.observationId}/{payload.equipmentId}"))
            db.execute('''INSERT OR IGNORE INTO installed_equipment
                (id,hospital_id,modality,manufacturer,model,configuration,estimated_age,condition,status,created_at,updated_at,last_observed_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''', (asset_id,row['hospital_id'],modality(row['modality']),row['manufacturer'],row['model'],
                row['configuration'],row['estimated_age'],row['condition'],'Reported',now,now,row['captured_at']))
        db.execute('UPDATE equipment SET matched_equipment_id=?,resolution=? WHERE visit_id=? AND observation_id=? AND id=?',
                   (asset_id,'existing' if payload.assetId else 'new',payload.visitId,payload.observationId,payload.equipmentId))
        db.execute('INSERT INTO audit_events VALUES (?,?,?,?,?,?)', (str(uuid.uuid4()),now,payload.actorId,asset_id,'resolve_evidence',payload.model_dump_json()))
    return {'ok': True, 'assetId': asset_id}


@router.post('/hospitals', status_code=201)
def propose_hospital(payload: HospitalProposal, db=Depends(get_db)):
    if not all(v.strip() for v in (payload.name, payload.city, payload.country)):
        raise HTTPException(422, 'Nombre, ciudad y país son obligatorios.')
    hospital_id = 'HOSP-' + str(uuid.uuid4())
    with db:
        db.execute('INSERT INTO hospitals(id,name,city,country,region,verification_status) VALUES (?,?,?,?,?,?)',
                   (hospital_id, payload.name.strip(), payload.city.strip(), payload.country.strip(), '', 'Reported'))
    return dict(db.execute('SELECT * FROM hospitals WHERE id=?', (hospital_id,)).fetchone())


@router.get('/installed-equipment')
def installed(hospital_id: str | None = None, db=Depends(get_db)):
    return assets(db, hospital_id)


@router.get('/installed-equipment/{asset_id}/audit')
def asset_audit(asset_id: str, db=Depends(get_db)):
    return [dict(r) for r in db.execute('''SELECT a.changed_at,a.action,a.entity_id,
        coalesce(u.first_name || ' ' || u.last_name, 'Colaborador histórico') AS collaborator
        FROM audit_events a LEFT JOIN users u ON u.id=a.changed_by WHERE a.entity_id=?
        ORDER BY a.changed_at DESC LIMIT 200''', (asset_id,))]


@router.post('/equipment/candidates')
def candidates(payload: VisitRecord, db=Depends(get_db)):
    available = assets(db, payload.hospitalId)
    return {e.id: [a for a in available if modality(a['modality']) == modality(e.type)
                  and (not e.brand or not a['manufacturer'] or e.brand.lower() == a['manufacturer'].lower())]
            for o in payload.observations for e in o.equipment}


def read_visit(db, visit_id):
    row = db.execute('''SELECT v.*, h.name, h.region, h.country, h.province, h.city, u.first_name, u.last_name, u.cedula
        FROM visits v JOIN hospitals h ON h.id=v.hospital_id
        LEFT JOIN users u ON u.id=v.collaborator_id WHERE v.id=?''', (visit_id,)).fetchone()
    if row is None:
        raise HTTPException(404, 'Visita no encontrada')
    observations = []
    for obs in db.execute('SELECT * FROM observations WHERE visit_id=? ORDER BY position', (visit_id,)):
        equipment = [dict(id=e['id'], type=e['modality'], brand=e['manufacturer'], model=e['model'],
                          configuration=e['configuration'], estimatedAge=e['estimated_age'], status=e['condition'],
                          resolution=e['resolution'], matchedEquipmentId=e['matched_equipment_id'],
                          reviewed=bool(e['reviewed']), evidenceStatus=json.loads(e['evidence_status'] or '{}'),
                          estimatedInstallationYear=e['estimated_installation_year'], installationYearStatus=e['installation_year_status'])
                     for e in db.execute('SELECT * FROM equipment WHERE visit_id=? AND observation_id=? ORDER BY position', (visit_id, obs['id']))]
        observations.append(dict(id=obs['id'], visitId=visit_id, title=obs['title'], captureMode=obs['capture_mode'],
                                 capturedAt=obs['captured_at'], originalText=obs['original_text'],
                                 photoName=obs['photo_name'], photoData=obs['photo_data'], equipment=equipment, detectedLanguage=obs['detected_language'], analysis=json.loads(obs['analysis_json']) if obs['analysis_json'] else None))
    collaborator = None if row['collaborator_id'] is None else dict(id=row['collaborator_id'],
        firstName=row['first_name'], lastName=row['last_name'], name=f"{row['first_name']} {row['last_name']}", cedula=row['cedula'])
    return dict(id=visit_id, hospitalId=row['hospital_id'], hospital=row['name'], region=row['region'],
                country=row['country'], province=row['province'], city=row['city'],
                area=row['area'], startedAt=row['started_at'], completedAt=row['completed_at'],
                date=row['completed_at'] or row['started_at'], syncStatus='synced', collaboratorId=row['collaborator_id'],
                collaborator=collaborator, observations=observations)


@router.get('/hospitals')
def hospitals(db=Depends(get_db)):
    return [dict(r) for r in db.execute('SELECT * FROM hospitals ORDER BY name')]


@router.get('/visits')
def visits(hospital_id: str | None = None, db=Depends(get_db)):
    rows = db.execute('SELECT id FROM visits WHERE completed_at != ? AND (? IS NULL OR hospital_id=?) ORDER BY completed_at DESC', ('', hospital_id, hospital_id)).fetchall()
    return [read_visit(db, row['id']) for row in rows]


@router.post('/visits/similarity')
def visit_similarity(payload: VisitSimilarityQuery, db=Depends(get_db)):
    matches = similar_visits(db, payload.hospitalId, payload.text)
    highest = matches[0]['similarity'] if matches else 0
    return {'isDuplicate': highest >= 80, 'highestSimilarity': highest, 'matches': matches[:5]}


@router.get('/hospitals/{hospital_id}/overview')
def hospital_overview(hospital_id: str, db=Depends(get_db)):
    hospital = db.execute('SELECT * FROM hospitals WHERE id=?', (hospital_id,)).fetchone()
    if hospital is None:
        raise HTTPException(404, 'Hospital no encontrado')
    visits = [dict(r) for r in db.execute('''
        SELECT v.id, v.area, v.completed_at AS completedAt,
               COUNT(o.id) AS observationCount
        FROM visits v LEFT JOIN observations o ON o.visit_id=v.id
        WHERE v.hospital_id=? AND v.completed_at != ''
        GROUP BY v.id ORDER BY v.completed_at DESC, v.id
    ''', (hospital_id,))]
    records = [dict(r) for r in db.execute('''
        SELECT e.id, e.modality AS type, e.manufacturer AS brand, e.model,
               e.estimated_age AS estimatedAge, e.condition AS status,
               e.configuration, e.observation_id AS observationId, e.visit_id AS visitId,
               o.original_text AS originalText, v.area, v.completed_at AS recordedAt
        FROM equipment e JOIN visits v ON v.id=e.visit_id
        JOIN observations o ON o.visit_id=e.visit_id AND o.id=e.observation_id
        WHERE v.hospital_id=? AND v.completed_at != ''
        ORDER BY v.completed_at DESC, v.id, o.position, e.position
    ''', (hospital_id,))]
    canonical_assets = assets(db, hospital_id)
    grouped = {}
    for asset in canonical_assets:
        group = grouped.setdefault(asset['modality'], {'modality': asset['modality'], 'assets': [], 'scores': [], 'dates': []})
        group['assets'].append(asset)
        group['scores'].append(asset['reliability']['score'])
        if asset['lastObservedAt']:
            group['dates'].append(asset['lastObservedAt'])

    landscape = []
    for group in grouped.values():
        ages = []
        for asset in group['assets']:
            match = re.search(r'\d+(?:[.,]\d+)?', asset.get('estimated_age') or '')
            if match:
                ages.append(float(match.group().replace(',', '.')))
        if not ages:
            age = 'Unknown'
        elif min(ages) == max(ages):
            age = f'{min(ages):g} years'
        else:
            age = f'{min(ages):g}–{max(ages):g} years'
        score = round(sum(group['scores']) / len(group['scores']))
        landscape.append({
            'modality': group['modality'], 'quantity': len(group['assets']), 'approxAge': age,
            'confidence': {'score': score, 'level': 'High' if score >= 75 else 'Medium' if score >= 50 else 'Low'},
            'lastUpdated': max(group['dates']) if group['dates'] else None,
        })
    landscape.sort(key=lambda row: row['modality'])
    return dict(hospital=dict(hospital), visits=visits, equipment=records, assets=canonical_assets, installedEquipment=canonical_assets, landscape=landscape,
                summary=dict(visits=len(visits), observations=sum(v['observationCount'] for v in visits),
                             equipmentRecords=len(records), canonicalEquipment=len(canonical_assets),
                             needsReview=sum(a['hasConflict'] or a['status']=='Needs verification' or a['reliability']['level']=='Low' for a in canonical_assets),
                             opportunities=sum(a['potentialOpportunity'] for a in canonical_assets),
                             lastVisit=visits[0]['completedAt'] if visits else None))


@router.get('/visits/{visit_id}')
def visit(visit_id: str, db=Depends(get_db)):
    return read_visit(db, visit_id)


@router.get('/dashboard')
def dashboard(db=Depends(get_db)):
    rows = db.execute('''
        SELECT v.id AS visit_id, h.id AS hospital_id, h.name, h.region, h.province,
               o.id AS observation_id, e.id AS equipment_id, e.modality
        FROM visits v JOIN hospitals h ON h.id=v.hospital_id
        LEFT JOIN observations o ON o.visit_id=v.id
        LEFT JOIN equipment e ON e.visit_id=o.visit_id AND e.observation_id=o.id
        WHERE v.completed_at != ''
    ''').fetchall()
    def bucket(label):
        return dict(label=label, visits=set(), observations=set(), hospitals=set(), equipmentRecords=0)
    total = bucket('Total')
    by_hospital, by_region, by_province, by_modality = {}, {}, {}, {}
    aliases = {'resonador': 'MRI', 'resonancia': 'MRI', 'mri': 'MRI',
               'tomógrafo': 'CT', 'tomografo': 'CT', 'ct': 'CT', 'tac': 'CT',
               'ultrasonido': 'Ultrasound', 'ecógrafo': 'Ultrasound', 'ultrasound': 'Ultrasound',
               'rayos x': 'X-ray', 'x-ray': 'X-ray'}
    for row in rows:
        hospital = by_hospital.setdefault(row['hospital_id'], {**bucket(row['name']), 'id': row['hospital_id'], 'region': row['region']})
        region = by_region.setdefault(row['region'] or 'No indicada', bucket(row['region'] or 'No indicada'))
        province = by_province.setdefault(row['province'] or 'No indicada', bucket(row['province'] or 'No indicada'))
        targets = [total, hospital, region, province]
        if row['equipment_id'] is not None:
            name = (row['modality'] or '').strip()
            modality = aliases.get(name.lower(), name or 'No indicada')
            targets.append(by_modality.setdefault(modality, bucket(modality)))
        for target in targets:
            target['visits'].add(row['visit_id'])
            target['hospitals'].add(row['hospital_id'])
            if row['observation_id'] is not None:
                target['observations'].add((row['visit_id'], row['observation_id']))
            target['equipmentRecords'] += int(row['equipment_id'] is not None)
    def counts(group):
        return {k: len(v) if isinstance(v, set) else v for k, v in group.items()}
    def series(groups):
        return sorted([counts(g) for g in groups.values()], key=lambda g: (-g['equipmentRecords'], g['label']))
    from app.services.inventory_summary import inventory_summary
    return dict(summary=counts(total), byHospital=series(by_hospital), byRegion=series(by_region),
                intelligence=inventory_summary(db), byProvince=series(by_province), byModality=series(by_modality))


@router.put('/visits/{visit_id}')
def save_visit(visit_id: str, payload: VisitRecord, db=Depends(get_db)):
    if payload.id != visit_id:
        raise HTTPException(422, 'El identificador de visita no coincide')
    existing = db.execute('SELECT hospital_id, completed_at FROM visits WHERE id=?', (visit_id,)).fetchone()
    if existing and existing['hospital_id'] != payload.hospitalId:
        raise HTTPException(409, 'La visita ya pertenece a otro hospital')
    if existing and existing['completed_at'] and not payload.completedAt:
        raise HTTPException(409, 'La visita ya está finalizada')
    if payload.collaboratorId and db.execute('SELECT 1 FROM users WHERE id=?', (payload.collaboratorId,)).fetchone() is None:
        raise HTTPException(422, 'El colaborador de la visita no existe')
    try:
        with db:
            db.execute('INSERT OR IGNORE INTO hospitals(id,name,region) VALUES (?,?,?)', (payload.hospitalId, payload.hospital, payload.region))
            db.execute('''INSERT INTO visits (id, hospital_id, area, started_at, completed_at, collaborator_id)
                VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET area=excluded.area,
                completed_at=excluded.completed_at, collaborator_id=excluded.collaborator_id''',
                       (visit_id, payload.hospitalId, payload.area, payload.startedAt, payload.completedAt, payload.collaboratorId))
            db.execute('DELETE FROM observations WHERE visit_id=?', (visit_id,))
            for i, obs in enumerate(payload.observations):
                db.execute('''INSERT INTO observations (visit_id,id,title,capture_mode,captured_at,original_text,photo_name,photo_data,position)
                    VALUES (?,?,?,?,?,?,?,?,?)''',
                           (visit_id, obs.id, obs.title, obs.captureMode, obs.capturedAt, obs.originalText, obs.photoName, obs.photoData, i))
                db.execute('UPDATE observations SET detected_language=?, analysis_json=? WHERE visit_id=? AND id=?',
                           (obs.detectedLanguage, obs.analysis.model_dump_json() if obs.analysis else None, visit_id, obs.id))
                if payload.completedAt:
                    save_training_feedback(db, obs)
                for j, eq in enumerate(obs.equipment):
                    canonical_id = link_evidence(db, payload, obs, eq)
                    statuses, score = evidence_metadata(eq, obs)
                    year, year_status = installation_year(obs.originalText,eq.estimatedAge,obs.capturedAt or payload.startedAt,eq.type,eq.brand,eq.reviewed)
                    statuses['installation_year'] = year_status
                    db.execute('''INSERT INTO equipment
                        (visit_id, observation_id, id, modality, manufacturer, model, configuration,
                         estimated_age, condition, resolution, matched_equipment_id, position)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
                               (visit_id, obs.id, eq.id, eq.type, eq.brand, eq.model, eq.configuration, eq.estimatedAge, eq.status, eq.resolution, canonical_id, j))
                    db.execute('UPDATE equipment SET reviewed=?, evidence_status=? WHERE visit_id=? AND observation_id=? AND id=?',
                               (int(eq.reviewed), json.dumps(statuses), visit_id, obs.id, eq.id))
                    db.execute('UPDATE equipment SET reliability_score=?, reliability_level=?, reliability_factors=? WHERE visit_id=? AND observation_id=? AND id=?',
                               (score['score'], score['level'], json.dumps(score), visit_id, obs.id, eq.id))
                    db.execute('UPDATE equipment SET estimated_installation_year=?,installation_year_status=? WHERE visit_id=? AND observation_id=? AND id=?',
                               (year,year_status,visit_id,obs.id,eq.id))
                    if canonical_id and eq.resolution=='new':
                        db.execute('UPDATE installed_equipment SET estimated_installation_year=coalesce(estimated_installation_year,?),installation_year_status=CASE WHEN estimated_installation_year IS NULL THEN ? ELSE installation_year_status END WHERE id=?',
                                   (year,year_status,canonical_id))
    except sqlite3.Error as exc:
        raise HTTPException(503, 'No se pudo guardar en SQLite. Reintenta sin cerrar la visita.') from exc
    return read_visit(db, visit_id)
