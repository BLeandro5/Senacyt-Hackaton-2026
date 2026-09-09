import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import app


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.temp.name) / 'test.sqlite3')
        self.env = patch.dict(os.environ, APP_DATABASE_PATH=self.path)
        self.env.start()
        self.client = TestClient(app)
        self.payload = dict(id='v1', hospitalId='HOSP-001', hospital='Hospital Santo Tomás',
                            area='Radiología', region='Panamá', startedAt='2026-09-09T12:00:00Z',
                            completedAt='2026-09-09T13:00:00Z', observations=[dict(
                                id='o1', captureMode='chat', originalText='Dos MRI Siemens.',
                                equipment=[dict(id='e1', type='Resonador', brand='Siemens', estimatedAge='7 años'),
                                           dict(id='e2', type='Resonador', brand='Siemens')])])

    def tearDown(self):
        self.client.close()
        self.env.stop()
        self.temp.cleanup()

    def test_persistence_and_idempotent_retry(self):
        for _ in range(2):
            r = self.client.put('/visits/v1', json=self.payload)
            self.assertEqual(r.status_code, 200, r.text)
        with closing(sqlite3.connect(self.path)) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM visits').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM equipment').fetchone()[0], 2)
        with TestClient(app) as restarted:
            record = restarted.get('/visits/v1').json()
            self.assertEqual(record['observations'][0]['equipment'][0]['estimatedAge'], '7 años')
            self.assertEqual(record['syncStatus'], 'synced')
            self.assertEqual(len(restarted.get('/visits').json()), 1)
            self.assertEqual(restarted.get('/visits?hospital_id=other').json(), [])

    def test_failed_validation_preserves_existing_data(self):
        self.client.put('/visits/v1', json=self.payload)
        self.payload['observations'][0]['equipment'].append(self.payload['observations'][0]['equipment'][0])
        self.assertEqual(self.client.put('/visits/v1', json=self.payload).status_code, 422)
        self.assertEqual(len(self.client.get('/visits/v1').json()['observations'][0]['equipment']), 2)

    def test_ongoing_then_finished_and_multiple_observations(self):
        self.payload['completedAt'] = ''
        self.assertEqual(self.client.put('/visits/v1', json=self.payload).status_code, 200)
        self.assertEqual(self.client.get('/visits').json(), [])
        self.payload['observations'].append(dict(id='o2', captureMode='voice', originalText='Un CT.', equipment=[dict(id='e1', type='CT')]))
        self.payload['completedAt'] = '2026-09-09T13:00:00Z'
        self.assertEqual(self.client.put('/visits/v1', json=self.payload).status_code, 200)
        self.assertEqual(len(self.client.get('/visits/v1').json()['observations']), 2)
        self.payload['completedAt'] = ''
        self.assertEqual(self.client.put('/visits/v1', json=self.payload).status_code, 409)

    def test_hospital_identity_and_missing_record(self):
        self.assertGreater(len(self.client.get('/hospitals').json()), 0)
        self.client.put('/visits/v1', json=self.payload)
        self.payload['hospitalId'] = 'other'
        self.assertEqual(self.client.put('/visits/v1', json=self.payload).status_code, 409)
        self.assertEqual(self.client.get('/visits/missing').status_code, 404)

    def test_transaction_rolls_back_when_equipment_write_fails(self):
        self.client.put('/visits/v1', json=self.payload)
        with closing(sqlite3.connect(self.path)) as db:
            db.execute("CREATE TRIGGER reject_write BEFORE INSERT ON equipment BEGIN SELECT RAISE(ABORT, 'test'); END")
            db.commit()
        self.payload['observations'][0]['originalText'] = 'changed'
        self.assertEqual(self.client.put('/visits/v1', json=self.payload).status_code, 503)
        saved = self.client.get('/visits/v1').json()
        self.assertEqual(saved['observations'][0]['originalText'], 'Dos MRI Siemens.')
        self.assertEqual(len(saved['observations'][0]['equipment']), 2)

    def test_hospital_overview_combines_visits_without_counting_other_hospitals(self):
        import copy
        self.client.put('/visits/v1', json=self.payload)
        second = copy.deepcopy(self.payload)
        second['id'] = 'v2'
        second['area'] = 'Urgencias'
        self.client.put('/visits/v2', json=second)
        other = copy.deepcopy(second)
        other.update(id='v3', hospitalId='HOSP-002')
        self.client.put('/visits/v3', json=other)
        ongoing = copy.deepcopy(second)
        ongoing.update(id='v4', completedAt='')
        self.client.put('/visits/v4', json=ongoing)
        data = self.client.get('/hospitals/HOSP-001/overview').json()
        self.assertEqual(data['summary']['visits'], 2)
        self.assertEqual(data['summary']['observations'], 2)
        self.assertEqual(data['summary']['equipmentRecords'], 4)
        self.assertEqual({e['visitId'] for e in data['equipment']}, {'v1', 'v2'})
        self.assertEqual({e['area'] for e in data['equipment']}, {self.payload['area'], 'Urgencias'})
        self.assertTrue(all(e['originalText'] == 'Dos MRI Siemens.' for e in data['equipment']))
        # Same equipment IDs in different visits must remain distinct observations.
        self.assertEqual(sum(e['id'] == 'e1' for e in data['equipment']), 2)

    def test_empty_hospital_overview_and_unknown_hospital(self):
        data = self.client.get('/hospitals/HOSP-001/overview').json()
        self.assertEqual(data['equipment'], [])
        self.assertEqual(data['summary']['equipmentRecords'], 0)
        self.assertIsNone(data['summary']['lastVisit'])
        self.assertEqual(self.client.get('/hospitals/missing/overview').status_code, 404)

    def test_dashboard_totals_regions_and_modalities(self):
        import copy
        self.client.put('/visits/v1', json=self.payload)
        second = copy.deepcopy(self.payload)
        second.update(id='v2', hospitalId='new-hospital', hospital='Otro hospital', region='Chiriquí')
        second['observations'][0]['equipment'] = [dict(id='a', type='MRI'), dict(id='b', type='CT')]
        self.client.put('/visits/v2', json=second)
        ongoing = copy.deepcopy(second)
        ongoing.update(id='v3', completedAt='')
        self.client.put('/visits/v3', json=ongoing)
        data = self.client.get('/dashboard').json()
        self.assertEqual(data['summary']['equipmentRecords'], 4)
        self.assertEqual(data['summary']['visits'], 2)
        self.assertEqual(data['summary']['observations'], 2)
        self.assertEqual(data['summary']['hospitals'], 2)
        self.assertEqual({g['label']: g['equipmentRecords'] for g in data['byModality']}, {'MRI': 3, 'CT': 1})
        self.assertEqual(sum(g['equipmentRecords'] for g in data['byRegion']), 4)
        self.assertEqual(sum(g['visits'] for g in data['byHospital']), 2)

    def test_empty_dashboard(self):
        data = self.client.get('/dashboard').json()
        self.assertEqual(data['summary']['equipmentRecords'], 0)
        self.assertEqual(data['byHospital'], [])
        self.assertEqual(data['byRegion'], [])
        self.assertEqual(data['byModality'], [])
