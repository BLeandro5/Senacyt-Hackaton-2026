import copy
import unittest

import test_storage


class VisitSimilarityTests(unittest.TestCase):
    setUp = test_storage.StorageTests.setUp
    tearDown = test_storage.StorageTests.tearDown

    def test_exact_finalized_observation_is_reported_as_duplicate(self):
        self.assertEqual(self.client.put('/visits/v1', json=self.payload).status_code, 200)
        response = self.client.post('/visits/similarity', json={
            'hospitalId': 'HOSP-001', 'text': 'Dos MRI Siemens.',
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['isDuplicate'])
        self.assertEqual(data['highestSimilarity'], 100)
        self.assertEqual(data['matches'][0]['visitId'], 'v1')

    def test_other_hospital_and_open_visit_are_not_matches(self):
        other = copy.deepcopy(self.payload)
        other.update(id='v2', hospitalId='HOSP-002', completedAt='')
        self.assertEqual(self.client.put('/visits/v2', json=other).status_code, 200)
        data = self.client.post('/visits/similarity', json={
            'hospitalId': 'HOSP-001', 'text': 'Dos MRI Siemens.',
        }).json()
        self.assertFalse(data['matches'])
