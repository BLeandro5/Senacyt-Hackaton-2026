import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from app.main import app


class AnalysisTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def analyze(self):
        return self.client.post('/observations/analyze', json={
            'hospital_id': 'HOSP-001', 'text': 'Un resonador Siemens.',
        })

    @patch('app.ai.extractor.generate_with_qvac')
    def test_structured_output_and_original_text(self, generate):
        generate.return_value = '```json\n{"equipment":[{"modality":"MRI","manufacturer":"Siemens"}]}\n```'
        response = self.analyze()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['original_text'], 'Un resonador Siemens.')
        self.assertIsNone(response.json()['equipment'][0]['estimated_age_years'])
        self.assertIn('Un resonador Siemens.', generate.call_args.args[0])

    @patch('app.ai.extractor.generate_with_qvac')
    def test_age_from_ct_does_not_leak_to_mri(self, generate):
        generate.return_value = '{"equipment":[{"modality":"MRI","manufacturer":"Siemens","estimated_age_years":7},{"modality":"MRI","manufacturer":"Siemens","estimated_age_years":7},{"modality":"CT","manufacturer":"Philips","estimated_age_years":7}]}'
        response = self.client.post('/observations/analyze', json={
            'hospital_id': 'HOSP-001', 'text': 'Dos resonadores Siemens y un CT Philips de siete años.',
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual([e['estimated_age_years'] for e in response.json()['equipment']],
                         [None, None, 7])

    @patch('app.ai.extractor.generate_with_qvac')
    def test_spanish_modality_normalization(self, generate):
        generate.return_value = '{"equipment":[{"modality":"resonancia"}]}'
        response = self.analyze()
        self.assertEqual(response.json()['equipment'][0]['modality'], 'MRI')
        self.assertIsNone(response.json()['equipment'][0]['manufacturer'])

    @patch('app.ai.extractor.generate_with_qvac')
    def test_empty_and_invalid_output(self, generate):
        generate.return_value = '{"equipment":[]}'
        self.assertEqual(self.analyze().json()['equipment'], [])
        for raw in ('not JSON', '{}', '{"equipment":[{}]}'):
            generate.return_value = raw
            self.assertEqual(self.analyze().status_code, 502)

    @patch('app.ai.extractor.generate_with_qvac')
    def test_qvac_unavailable_and_timeout(self, generate):
        generate.side_effect = httpx.ConnectError('offline')
        self.assertEqual(self.analyze().status_code, 503)
        generate.side_effect = httpx.ReadTimeout('timeout')
        self.assertEqual(self.analyze().status_code, 504)

    def test_cors(self):
        for origin in ('http://localhost:5173', 'http://127.0.0.1:5173'):
            response = self.client.options('/observations/analyze', headers={
                'Origin': origin, 'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type',
            })
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers['access-control-allow-origin'], origin)


if __name__ == '__main__':
    unittest.main()
