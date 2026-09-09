import sqlite3
from fastapi import APIRouter, Depends, HTTPException

from app.db.database import get_db
from app.schemas.visit import VisitRecord

router = APIRouter(tags=['Storage'])


def read_visit(db, visit_id):
    row = db.execute('SELECT v.*, h.name, h.region FROM visits v JOIN hospitals h ON h.id=v.hospital_id WHERE v.id=?', (visit_id,)).fetchone()
    if row is None:
        raise HTTPException(404, 'Visita no encontrada')
    observations = []
    for obs in db.execute('SELECT * FROM observations WHERE visit_id=? ORDER BY position', (visit_id,)):
        equipment = [dict(id=e['id'], type=e['modality'], brand=e['manufacturer'], model=e['model'],
                          configuration=e['configuration'], estimatedAge=e['estimated_age'], status=e['condition'],
                          resolution=e['resolution'], matchedEquipmentId=e['matched_equipment_id'])
                     for e in db.execute('SELECT * FROM equipment WHERE visit_id=? AND observation_id=? ORDER BY position', (visit_id, obs['id']))]
        observations.append(dict(id=obs['id'], visitId=visit_id, title=obs['title'], captureMode=obs['capture_mode'],
                                 capturedAt=obs['captured_at'], originalText=obs['original_text'],
                                 photoName=obs['photo_name'], photoData=obs['photo_data'], equipment=equipment))
    return dict(id=visit_id, hospitalId=row['hospital_id'], hospital=row['name'], region=row['region'],
                area=row['area'], startedAt=row['started_at'], completedAt=row['completed_at'],
                date=row['completed_at'] or row['started_at'], syncStatus='synced', observations=observations)


@router.get('/hospitals')
def hospitals(db=Depends(get_db)):
    return [dict(r) for r in db.execute('SELECT * FROM hospitals ORDER BY name')]


@router.get('/visits')
def visits(hospital_id: str | None = None, db=Depends(get_db)):
    rows = db.execute('SELECT id FROM visits WHERE completed_at != ? AND (? IS NULL OR hospital_id=?) ORDER BY completed_at DESC', ('', hospital_id, hospital_id)).fetchall()
    return [read_visit(db, row['id']) for row in rows]


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
    return dict(hospital=dict(hospital), visits=visits, equipment=records,
                summary=dict(visits=len(visits), observations=sum(v['observationCount'] for v in visits),
                             equipmentRecords=len(records), lastVisit=visits[0]['completedAt'] if visits else None))


@router.get('/visits/{visit_id}')
def visit(visit_id: str, db=Depends(get_db)):
    return read_visit(db, visit_id)


@router.get('/dashboard')
def dashboard(db=Depends(get_db)):
    rows = db.execute('''
        SELECT v.id AS visit_id, h.id AS hospital_id, h.name, h.region,
               o.id AS observation_id, e.id AS equipment_id, e.modality
        FROM visits v JOIN hospitals h ON h.id=v.hospital_id
        LEFT JOIN observations o ON o.visit_id=v.id
        LEFT JOIN equipment e ON e.visit_id=o.visit_id AND e.observation_id=o.id
        WHERE v.completed_at != ''
    ''').fetchall()
    def bucket(label):
        return dict(label=label, visits=set(), observations=set(), hospitals=set(), equipmentRecords=0)
    total = bucket('Total')
    by_hospital, by_region, by_modality = {}, {}, {}
    aliases = {'resonador': 'MRI', 'resonancia': 'MRI', 'mri': 'MRI',
               'tomógrafo': 'CT', 'tomografo': 'CT', 'ct': 'CT', 'tac': 'CT',
               'ultrasonido': 'Ultrasound', 'ecógrafo': 'Ultrasound', 'ultrasound': 'Ultrasound',
               'rayos x': 'X-ray', 'x-ray': 'X-ray'}
    for row in rows:
        hospital = by_hospital.setdefault(row['hospital_id'], {**bucket(row['name']), 'id': row['hospital_id'], 'region': row['region']})
        region = by_region.setdefault(row['region'] or 'No indicada', bucket(row['region'] or 'No indicada'))
        targets = [total, hospital, region]
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
    return dict(summary=counts(total), byHospital=series(by_hospital), byRegion=series(by_region), byModality=series(by_modality))


@router.put('/visits/{visit_id}')
def save_visit(visit_id: str, payload: VisitRecord, db=Depends(get_db)):
    if payload.id != visit_id:
        raise HTTPException(422, 'El identificador de visita no coincide')
    existing = db.execute('SELECT hospital_id, completed_at FROM visits WHERE id=?', (visit_id,)).fetchone()
    if existing and existing['hospital_id'] != payload.hospitalId:
        raise HTTPException(409, 'La visita ya pertenece a otro hospital')
    if existing and existing['completed_at'] and not payload.completedAt:
        raise HTTPException(409, 'La visita ya está finalizada')
    try:
        with db:
            db.execute('INSERT OR IGNORE INTO hospitals(id,name,region) VALUES (?,?,?)', (payload.hospitalId, payload.hospital, payload.region))
            db.execute('INSERT INTO visits VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET area=excluded.area, completed_at=excluded.completed_at',
                       (visit_id, payload.hospitalId, payload.area, payload.startedAt, payload.completedAt))
            db.execute('DELETE FROM observations WHERE visit_id=?', (visit_id,))
            for i, obs in enumerate(payload.observations):
                db.execute('INSERT INTO observations VALUES (?,?,?,?,?,?,?,?,?)',
                           (visit_id, obs.id, obs.title, obs.captureMode, obs.capturedAt, obs.originalText, obs.photoName, obs.photoData, i))
                for j, eq in enumerate(obs.equipment):
                    db.execute('INSERT INTO equipment VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                               (visit_id, obs.id, eq.id, eq.type, eq.brand, eq.model, eq.configuration, eq.estimatedAge, eq.status, eq.resolution, eq.matchedEquipmentId, j))
    except sqlite3.Error as exc:
        raise HTTPException(503, 'No se pudo guardar en SQLite. Reintenta sin cerrar la visita.') from exc
    return read_visit(db, visit_id)
