"""Explicit, idempotent SYNTHETIC seed. Never runs during application startup."""
import sys
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db.database import connect
from app.api.visits import save_visit
from app.schemas.visit import VisitRecord
from app.api.users import password_hash


def main():
    db = connect()
    try:
        now = datetime.now(timezone.utc)
        hospital = 'DEMO-SYNTHETIC-001'
        with db:
            db.execute('INSERT OR IGNORE INTO hospitals(id,name,region,city,country) VALUES (?,?,?,?,?)',
                       (hospital,'DEMO SYNTHETIC Hospital Alpha','DEMO','DEMO City','DEMO Country'))
        asset_id = None
        for index in range(3):
            user_id = f'DEMO-SYNTHETIC-USER-{index}'
            salt = uuid.uuid4().bytes
            with db:
                db.execute('''INSERT OR IGNORE INTO users(id,first_name,last_name,cedula,email,phone,password_hash,password_salt,role,created_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?)''', (user_id,'DEMO',f'SYNTHETIC {index}',user_id,f'demo-{index}@example.invalid',
                    'DEMO',password_hash('demo123',salt),salt.hex(),'field',now.isoformat()))
            observed = (now - timedelta(days=400-index)).isoformat()
            visit_id = f'DEMO-SYNTHETIC-VISIT-{index}'
            payload = VisitRecord.model_validate(dict(id=visit_id,hospitalId=hospital,hospital='DEMO SYNTHETIC Hospital Alpha',
                collaboratorId=user_id,area='DEMO',startedAt=observed,completedAt=observed,observations=[dict(id='DEMO-OBS',
                captureMode='chat',capturedAt=observed,originalText='SYNTHETIC DEMO: CT age 9 years.',equipment=[dict(id='DEMO-EQ',
                type='CT',brand='Philips' if index < 2 else 'Siemens',model='DEMO',estimatedAge='9 años',reviewed=True,
                resolution='new' if index == 0 else 'existing',matchedEquipmentId=asset_id)])]))
            saved = save_visit(visit_id,payload,db)
            asset_id = saved['observations'][0]['equipment'][0]['matchedEquipmentId']
        for number, days in [(2, 2), (3, 240)]:
            demo_hospital = f'DEMO-SYNTHETIC-00{number}'
            name = f'DEMO SYNTHETIC Hospital {number}'
            with db:
                db.execute('INSERT OR IGNORE INTO hospitals(id,name,region,city,country) VALUES (?,?,?,?,?)',
                           (demo_hospital,name,'DEMO',f'DEMO City {number}','DEMO Country'))
            observed = (now-timedelta(days=days)).isoformat()
            demo_visit = f'DEMO-SYNTHETIC-EXTRA-{number}'
            payload = VisitRecord.model_validate(dict(id=demo_visit,hospitalId=demo_hospital,hospital=name,
                collaboratorId='DEMO-SYNTHETIC-USER-0',area='DEMO',startedAt=observed,completedAt=observed,
                observations=[dict(id='DEMO-OBS',captureMode='chat',capturedAt=observed,
                originalText='SYNTHETIC DEMO: Un MRI Philips DEMO de nueve años. Un CT sin marca.',equipment=[
                    dict(id='DEMO-MRI',type='MRI',brand='Philips',model='DEMO',configuration='3T',estimatedAge='9 años',status='Operativo',reviewed=True,resolution='new'),
                    dict(id='DEMO-CT',type='CT',reviewed=False,resolution='new')])]))
            save_visit(demo_visit,payload,db)
        print('SYNTHETIC seed ready: 3 demo hospitals, 5 canonical assets, 7 evidences, 3 demo collaborators. No real patient data.')
    finally:
        db.close()


if __name__ == '__main__':
    main()
