import copy
import unittest
from scripts.adapt_aegis_pack import adapt, age_projection
from scripts.evaluate_aegis_predictions import evaluate


class DatasetAdaptationTests(unittest.TestCase):
    def row(self):
        return {'id': 'fixture', 'input': 'Un CT Philips de más de diez años.',
                'difficulty': 'simple', 'tags': [], 'negative': False,
                'expected': {'facility_name': None, 'city': None, 'country': 'Panamá',
                             'needs_human_review': True, 'equipment': [
                                 {'modality': 'CT', 'manufacturer': 'Philips', 'model': None,
                                  'age_min_years': 10, 'age_max_years': None, 'age_text': 'más de diez años',
                                  'condition': None, 'observation_status': 'reported',
                                  'condition_status': 'unknown', 'quantity_statement': None, 'notes': None}]}}

    def test_projection_keeps_open_age_and_original_uncertainty_without_country_inference(self):
        row = self.row()
        backup = copy.deepcopy(row)
        projected = adapt(row, 'test')
        self.assertIsNone(projected['expected']['country'])
        self.assertIsNone(projected['expected']['equipment'][0]['estimated_age_years'])
        self.assertEqual(projected['expected']['equipment'][0]['age_description'], 'más de diez años')
        self.assertEqual(projected['source_expected'], row['expected'])
        self.assertEqual(row, backup)
        self.assertEqual(projected['metadata']['review_status'], 'draft')

    def test_alternative_ages_do_not_become_single_values(self):
        self.assertEqual(age_projection({'age_min_years': 7, 'age_max_years': 8,
                                        'age_text': 'siete u ocho años'}), (None, 'siete u ocho años'))

    def test_invented_and_missing_devices_reduce_metrics(self):
        gold = adapt(self.row(), 'test')
        prediction = copy.deepcopy(gold['expected'])
        prediction['equipment'].append(copy.deepcopy(prediction['equipment'][0]))
        result = evaluate([gold], [{'id': gold['id'], 'prediction': prediction}])
        self.assertEqual(result['device_exact_precision'], 0.5)
        self.assertEqual(result['fields']['modality']['accuracy'], 0.5)
        missing = evaluate([gold], [])
        self.assertEqual(missing['device_exact_recall'], 0)
        self.assertEqual(missing['fields']['modality']['accuracy'], 0)

    def test_missing_prediction_does_not_pass_a_negative_case(self):
        gold = adapt(self.row(), 'test')
        gold['expected']['equipment'] = []
        result = evaluate([gold], [])
        self.assertEqual(result['exact_extraction_rate'], 0)
        self.assertEqual(result['modality_counts_rate'], 0)

    def test_reordered_equipment_matches_and_extra_schema_fields_fail(self):
        gold = adapt(self.row(), 'test')
        other = copy.deepcopy(gold['expected']['equipment'][0])
        other.update(modality='MRI', manufacturer='Siemens', estimated_age_years=5)
        gold['expected']['equipment'].append(other)
        prediction = copy.deepcopy(gold['expected'])
        prediction['equipment'].reverse()
        result = evaluate([gold], [{'id': gold['id'], 'prediction': prediction}])
        self.assertEqual(result['exact_extraction_rate'], 1)
        self.assertEqual(result['fields']['estimated_age_years']['accuracy'], 1)
        prediction['needs_human_review'] = True
        self.assertEqual(evaluate([gold], [{'id': gold['id'], 'prediction': prediction}])['schema_valid_rate'], 0)
