"""Real local inference + isolated SQLite acceptance test. No production data writes."""
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from datetime import datetime, timezone
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app


def main():
    started = time.perf_counter()
    report = {'inference': 'real local QVAC / MedPsy', 'database': 'temporary', 'checks': []}
    def check(name, condition):
        report['checks'].append({'name': name, 'passed': bool(condition)})
        print(f'{name}: {"PASS" if condition else "FAIL"}', flush=True)
        if not condition:
            raise AssertionError(name)
    prior = os.environ.get('APP_DATABASE_PATH')
    try:
        with tempfile.TemporaryDirectory() as directory:
            os.environ['APP_DATABASE_PATH'] = str(Path(directory) / 'acceptance.sqlite3')
            with TestClient(app) as client:
                users = []
                for i in range(3):
                    account = dict(first_name='Synthetic',last_name=f'Tester {i}',cedula=f'QA-{i}',email=f'qa-{i}@example.invalid',phone='60000000',password='qa-test-123')
                    response = client.post('/users/register', json=account)
                    check(f'register_{i}', response.status_code == 201)
                    user = response.json(); users.append(user)
                    check(f'login_{i}', client.post('/users/login', json={'identifier': account['email'], 'password': account['password']}).status_code == 200)
                note = 'Dos resonadores Siemens y un tomógrafo Philips de siete años.'
                response = client.post('/observations/analyze', json={'hospital_id':'HOSP-001','text':note})
                check('real_extraction_http', response.status_code == 200)
                analysis = response.json()
                report['synthetic_analysis'] = analysis
                expected = [('MRI','Siemens',None),('MRI','Siemens',None),('CT','Philips',7)]
                actual = [(e['modality'],e['manufacturer'],e['estimated_age_years']) for e in analysis['equipment']]
                check('real_extraction_values', sorted(actual,key=str) == sorted(expected,key=str))
                check('no_invented_location', all(analysis[k] is None for k in ('facility','city','country')))
                now = datetime.now(timezone.utc).isoformat()
                equipment = [dict(id=f'e{i}',type=e['modality'],brand=e['manufacturer'] or '',model=e['model'] or '',
                    estimatedAge='' if e['estimated_age_years'] is None else str(e['estimated_age_years'])+' años',reviewed=True,resolution='new') for i,e in enumerate(analysis['equipment'])]
                payload = dict(id='QA-v1',hospitalId='HOSP-001',hospital='Hospital Santo Tomás',area='QA Radiología',startedAt=now,
                    completedAt=now,collaboratorId=users[0]['id'],observations=[dict(id='o1',captureMode='chat',capturedAt=now,originalText=note,
                    analysis=analysis,detectedLanguage=analysis['detected_language'],equipment=equipment)])
                response = client.put('/visits/QA-v1',json=payload)
                check('review_match_save', response.status_code == 200)
                check('idempotent_retry', client.put('/visits/QA-v1',json=payload).status_code == 200)
                records = client.get('/installed-equipment').json()
                check('three_canonical_assets', len(records) == 3)
                asset = next(a for a in records if a['modality']=='CT')
                payload.update(id='QA-v2',collaboratorId=users[1]['id'])
                payload['observations'][0]['equipment'] = [dict(id='e1',type='CT',brand='Philips',estimatedAge='7 años',reviewed=True,resolution='existing',matchedEquipmentId=asset['id'])]
                check('corroboration_save', client.put('/visits/QA-v2',json=payload).status_code == 200)
                corroborated = next(a for a in client.get('/installed-equipment').json() if a['id']==asset['id'])
                check('corroboration_increases_score', corroborated['evidenceCount']==2 and corroborated['independentCollaborators']==2 and corroborated['reliability']['score']>asset['reliability']['score'])
                payload.update(id='QA-v3',collaboratorId=users[2]['id'])
                payload['observations'][0]['equipment'][0]['brand']='Siemens'
                check('conflict_save', client.put('/visits/QA-v3',json=payload).status_code==200)
                conflicted = next(a for a in client.get('/installed-equipment').json() if a['id']==asset['id'])
                check('conflict_no_overwrite', conflicted['hasConflict'] and conflicted['manufacturer']=='Philips' and conflicted['reliability']['score']<corroborated['reliability']['score'])
                check('my_visits', len(client.get('/visits').json())==3)
                check('original_note_preserved', client.get('/visits/QA-v1').json()['observations'][0]['originalText']==note)
                check('customer_360', client.get('/hospitals/HOSP-001/overview').status_code==200)
                response=client.post('/analytics/query',json={'text':'Show MRI equipment older than seven years. All other filters must be null.'})
                check('real_analytics_http',response.status_code==200)
                if response.status_code==200:
                    report['analytics_filters']=response.json()['filters']
                    check('real_analytics_filters',response.json()['filters']['modality']=='MRI' and response.json()['filters']['min_age']==7)
                    check('real_analytics_results',response.json()['equipment']==[])
    except Exception as exc:
        report['error']=str(exc)
    finally:
        if prior is None: os.environ.pop('APP_DATABASE_PATH',None)
        else: os.environ['APP_DATABASE_PATH']=prior
        report['elapsed_seconds']=round(time.perf_counter()-started,2)
        target=Path(__file__).resolve().parents[2]/'benchmarks/results/system-smoke.json'
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(target,flush=True)
    return 1 if 'error' in report else 0


if __name__=='__main__':
    raise SystemExit(main())
