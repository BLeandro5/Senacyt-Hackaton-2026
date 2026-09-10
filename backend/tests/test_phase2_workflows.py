import unittest
from unittest.mock import patch
import test_storage
from app.ai.extractor import extract_result
from app.ai.age_grounding import ground_ages
from app.schemas.equipment import EquipmentExtracted
from app.services.evidence import evidence_metadata
from app.schemas.visit import EquipmentRecord, ObservationRecord
from app.ai.language import detect_language


class EvidenceTests(unittest.TestCase):
    def test_local_language_hints(self):
        self.assertEqual(detect_language('Hay un tomógrafo Philips de ocho años.'),'es')
        self.assertEqual(detect_language('There is an eight-year-old Philips CT system.'),'en')
        self.assertEqual(detect_language('Há um tomógrafo Philips com cerca de oito anos.'),'pt')
        self.assertEqual(detect_language('Philips CT'),'other')

    def test_estimates_survive_review_and_unknown_is_unknown(self):
        item = EquipmentRecord(id='e',type='CT',brand='Philips',estimatedAge='8 años',reviewed=True)
        observation = ObservationRecord(id='o',captureMode='chat',originalText='Un CT Philips de unos ocho años',equipment=[item])
        statuses, score = evidence_metadata(item,observation)
        self.assertEqual(statuses['age'],'Estimated')
        self.assertEqual(statuses['model'],'Unknown')
        self.assertEqual(score['breakdown']['humanValidation'],15)

    def test_multilingual_ages(self):
        for text in ['Hay un tomógrafo Philips de ocho años.', 'There is an eight-year-old Philips CT system.', 'Há um tomógrafo Philips com cerca de oito anos.']:
            item=EquipmentExtracted(modality='CT',manufacturer='Philips')
            ground_ages(text,[item])
            self.assertEqual(item.estimated_age_years,8,text)

    def test_model_location_must_occur_in_note(self):
        raw='{"equipment":[],"facility":"Invented Hospital","city":"Madrid","country":"Spain"}'
        with patch('app.ai.extractor.generate_with_qvac',return_value=raw):
            result=extract_result('No equipment in this room.')
        self.assertIsNone(result.facility)
        self.assertIsNone(result.city)
        self.assertIsNone(result.country)


class SupervisorWorkflowTests(unittest.TestCase):
    setUp=test_storage.StorageTests.setUp
    tearDown=test_storage.StorageTests.tearDown

    def test_propose_and_confirm_hospital(self):
        response=self.client.post('/hospitals',json={'name':'DEMO Hospital','city':'DEMO City','country':'DEMO Country'})
        self.assertEqual(response.status_code,201)
        hospital=response.json()
        self.assertEqual(hospital['verification_status'],'Reported')
        self.assertEqual(self.client.put(f"/hospitals/{hospital['id']}/decision",json={'actorId':'test-supervisor','status':'Confirmed'}).status_code,200)
        saved=next(h for h in self.client.get('/hospitals').json() if h['id']==hospital['id'])
        self.assertEqual(saved['verification_status'],'Confirmed')

    def test_review_evidence_requires_explicit_decision(self):
        self.assertEqual(self.client.put('/visits/v1',json=self.payload).status_code,200)
        self.assertEqual(self.client.get('/installed-equipment').json(),[])
        evidence=self.client.get('/review/evidence').json()
        self.assertEqual(len(evidence),2)
        request=dict(actorId='test-supervisor',visitId='v1',observationId='o1',equipmentId='e1')
        response=self.client.put('/review/evidence',json=request)
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(len(self.client.get('/installed-equipment').json()),1)
        self.assertEqual(len(self.client.get('/review/evidence').json()),1)
        self.assertEqual(self.client.put('/review/evidence',json=request).status_code,409)

    def test_separation_keeps_original_evidence(self):
        self.payload['observations'][0]['equipment']=[dict(id='e1',type='CT',brand='Philips',resolution='new')]
        saved=self.client.put('/visits/v1',json=self.payload).json()
        asset=saved['observations'][0]['equipment'][0]['matchedEquipmentId']
        self.payload['id']='v2'
        self.payload['observations'][0]['equipment'][0].update(brand='Siemens',resolution='existing',matchedEquipmentId=asset)
        self.assertEqual(self.client.put('/visits/v2',json=self.payload).status_code,200)
        response=self.client.put(f'/installed-equipment/{asset}/decision',json=dict(actorId='supervisor-test',action='separate',visitId='v2',observationId='o1',equipmentId='e1'))
        self.assertEqual(response.status_code,200,response.text)
        assets=self.client.get('/installed-equipment').json()
        self.assertEqual(len(assets),2)
        self.assertTrue(all(not a['hasConflict'] for a in assets))
        self.assertEqual(self.client.get('/visits/v1').json()['observations'][0]['originalText'],self.payload['observations'][0]['originalText'])

    def test_same_asset_cannot_represent_two_devices_in_one_observation(self):
        for item in self.payload['observations'][0]['equipment']:
            item.update(resolution='existing',matchedEquipmentId='same-id')
        self.assertEqual(self.client.put('/visits/v1',json=self.payload).status_code,422)
