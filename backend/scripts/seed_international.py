"""Explicit fictional demo across ten countries; never invoked at startup."""
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.api.users import password_hash
from app.api.visits import save_visit
from app.db.database import connect
from app.schemas.visit import VisitRecord

COUNTRIES = (
    ('Panamá', 'Panamá', 'Ciudad de Panamá'),
    ('Costa Rica', 'San José', 'San José'),
    ('Guatemala', 'Guatemala', 'Ciudad de Guatemala'),
    ('Honduras', 'Francisco Morazán', 'Tegucigalpa'),
    ('El Salvador', 'San Salvador', 'San Salvador'),
    ('Nicaragua', 'Managua', 'Managua'),
    ('Colombia', 'Cundinamarca', 'Bogotá'),
    ('Ecuador', 'Pichincha', 'Quito'),
    ('República Dominicana', 'Distrito Nacional', 'Santo Domingo'),
    ('Brasil', 'São Paulo', 'São Paulo'),
)


def main():
    db = connect()
    now = datetime.now(timezone.utc)
    try:
        with db:
            for i in range(3):
                user = f'DEMO-INT-USER-{i}'
                salt = uuid.uuid4().bytes
                db.execute('''INSERT OR IGNORE INTO users
                    (id,first_name,last_name,cedula,email,phone,password_hash,password_salt,role,created_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?)''',
                    (user, 'DEMO', f'FICTICIO {i}', user, f'int-demo-{i}@example.invalid', 'DEMO',
                     password_hash('demo123', salt), salt.hex(), 'field', now.isoformat()))
        for index, (country, region, city) in enumerate(COUNTRIES):
            hospital = f'DEMO-INT-HOSP-{index:02}'
            name = f'DEMO FICTICIO Hospital {index + 1}'
            with db:
                db.execute('INSERT OR IGNORE INTO hospitals(id,name,region,city,country) VALUES (?,?,?,?,?)',
                           (hospital, name, region, city, country))
            asset = None
            for repeat in range(3):
                visit = f'DEMO-INT-VISIT-{index:02}-{repeat}'
                existing = db.execute('SELECT matched_equipment_id FROM equipment WHERE visit_id=? AND id=?',
                                      (visit, 'MRI')).fetchone()
                if existing:
                    asset = existing['matched_equipment_id']
                    continue  # Never overwrite demo decisions on subsequent execution.
                observed = (now - timedelta(days=(3, 160, 400)[index % 3] + 2 - repeat)).isoformat()
                brand = 'Siemens' if repeat == 2 and index % 2 == 0 else 'Philips'
                items = [dict(id='MRI', type='MRI', brand=brand, model='DEMO-MRI', configuration='3T',
                              estimatedAge='9 años', status='Operativo', reviewed=True,
                              resolution='new' if asset is None else 'existing', matchedEquipmentId=asset)]
                note = f'DEMO FICTICIO: Un MRI {brand} DEMO-MRI 3T operativo de 9 años.'
                if repeat == 0:
                    items += [dict(id='CT', type='CT', brand='GE', estimatedAge='4 años', reviewed=True, resolution='new'),
                              dict(id='US', type='Ultrasound', reviewed=False, resolution='new')]
                    note += ' Un CT GE de 4 años. Un ultrasonido sin datos de marca ni antigüedad.'
                payload = VisitRecord.model_validate(dict(id=visit, hospitalId=hospital, hospital=name,
                    collaboratorId=f'DEMO-INT-USER-{repeat}', area='DEMO FICTICIO', startedAt=observed,
                    completedAt=observed, observations=[dict(id='DEMO-OBS', captureMode='chat',
                    capturedAt=observed, originalText=note, equipment=items)]))
                saved = save_visit(visit, payload, db)
                asset = saved['observations'][0]['equipment'][0]['matchedEquipmentId']
        print('DEMO FICTICIO listo: 10 países, 10 hospitales, 30 activos, 50 evidencias. Sin pacientes reales.')
    finally:
        db.close()


if __name__ == '__main__':
    main()
