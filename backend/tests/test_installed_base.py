import unittest
import test_storage


class InstalledBaseTests(unittest.TestCase):
    setUp = test_storage.StorageTests.setUp
    tearDown = test_storage.StorageTests.tearDown
    def test_same_asset_two_evidences_and_retry(self):
        self.payload['observations'][0]['equipment'] = [dict(id='e1', type='CT', brand='Philips', model='Incisive', resolution='new', reviewed=True)]
        first = self.client.put('/visits/v1', json=self.payload)
        self.assertEqual(first.status_code, 200, first.text)
        asset_id = first.json()['observations'][0]['equipment'][0]['matchedEquipmentId']
        self.client.put('/visits/v1', json=self.payload)
        self.assertEqual(len(self.client.get('/installed-equipment').json()), 1)
        self.payload['id'] = 'v2'
        self.payload['observations'][0]['equipment'][0].update(resolution='existing', matchedEquipmentId=asset_id)
        self.assertEqual(self.client.put('/visits/v2', json=self.payload).status_code, 200)
        assets = self.client.get('/installed-equipment').json()
        self.assertEqual(len(assets), 1)
        self.assertEqual(assets[0]['evidenceCount'], 2)
        self.assertEqual(assets[0]['independentCollaborators'], 0)
        self.assertFalse(assets[0]['hasConflict'])
        self.payload['id'] = 'v3'
        self.payload['observations'][0]['equipment'][0]['brand'] = 'Siemens'
        self.assertEqual(self.client.put('/visits/v3', json=self.payload).status_code, 200)
        conflict = self.client.get('/installed-equipment').json()[0]
        self.assertTrue(conflict['hasConflict'])
        self.assertEqual(conflict['manufacturer'], 'Philips')
        self.assertLess(conflict['reliability']['score'], assets[0]['reliability']['score'])
        self.payload['id'] = 'v4'
        self.payload['hospitalId'] = 'HOSP-002'
        self.assertEqual(self.client.put('/visits/v4', json=self.payload).status_code, 422)
        self.assertEqual(self.client.get('/visits/v4').status_code, 404)
