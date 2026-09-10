import unittest
from unittest.mock import patch
import httpx
import test_storage


class IntelligenceTests(unittest.TestCase):
    setUp = test_storage.StorageTests.setUp
    tearDown = test_storage.StorageTests.tearDown

    def test_local_filters_use_persisted_assets(self):
        self.payload['observations'][0]['equipment'] = [dict(
            id='e1', type='CT', brand='Philips', estimatedAge='9 years', resolution='new')]
        self.assertEqual(self.client.put('/visits/v1', json=self.payload).status_code, 200)
        with patch('app.api.intelligence.generate_with_qvac', return_value='{"modality":"CT","min_age":7}'):
            response = self.client.post('/analytics/query', json={'text': 'CT older than seven years'})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(response.json()['equipment']), 1)
        self.assertEqual(response.json()['equipment'][0]['manufacturer'], 'Philips')
        with patch('app.api.intelligence.generate_with_qvac', return_value='{"manufacturer":"Siemens"}'):
            self.assertEqual(self.client.post('/analytics/query', json={'text': 'Siemens only'}).json()['equipment'], [])

    def test_invalid_output_and_timeout_are_explicit(self):
        for output in ['DROP TABLE visits', '{"reliability_level":"perfect"}', '{"unsupported_filter":"ignored"}']:
            with patch('app.api.intelligence.generate_with_qvac', return_value=output):
                self.assertEqual(self.client.post('/analytics/query', json={'text': 'Inventory query'}).status_code, 502)
        with patch('app.api.intelligence.generate_with_qvac', side_effect=httpx.ReadTimeout('timeout')):
            self.assertEqual(self.client.post('/analytics/query', json={'text': 'Inventory query'}).status_code, 504)
        self.assertEqual(self.client.get('/visits').status_code, 200)
