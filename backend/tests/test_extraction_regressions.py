import unittest
from unittest.mock import patch

from app.ai.count_grounding import ground_counts
from app.ai.extractor import extract_equipment, parse_extraction
from app.schemas.equipment import EquipmentExtracted


class ExtractionRegressions(unittest.TestCase):
    def test_implicit_thinking_is_not_json_output(self):
        raw = '{"equipment": []}]} reasoning... </think>\n```json\n{"equipment":[{"modality":"MRI"}]}\n```'
        self.assertEqual(len(parse_extraction(raw).equipment), 1)

    def test_unfinished_or_invalid_final_is_rejected(self):
        for raw in ('<think>{"equipment":[]}', '{"equipment":[]} </think>invalid',
                    '{"equipment":[]} trailing text', '{"equipment":[]} {"equipment":[]}'):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                parse_extraction(raw)

    @patch('app.ai.extractor.generate_with_qvac')
    def test_count_and_age_regression(self, generate):
        generate.return_value = '{"equipment":[{"modality":"MRI","manufacturer":"Siemens","estimated_age_years":7},{"modality":"CT","manufacturer":"Philips","estimated_age_years":7}]}'
        items = extract_equipment('Dos resonadores Siemens y un CT Philips de siete años.')
        self.assertEqual([(e.modality, e.estimated_age_years) for e in items], [('MRI', None), ('MRI', None), ('CT', 7)])
        self.assertIsNot(items[0], items[1])

    def test_count_already_correct_is_not_multiplied(self):
        items = [EquipmentExtracted(modality='MRI') for _ in range(2)]
        self.assertEqual(len(ground_counts('Dos resonadores.', items)), 2)

    def test_different_brands_same_modality(self):
        items = [EquipmentExtracted(modality='CT', manufacturer=brand) for brand in ('GE', 'Philips')]
        result = ground_counts('Dos CT GE y tres CT Philips.', items)
        self.assertEqual([e.manufacturer for e in result], ['GE', 'GE', 'Philips', 'Philips', 'Philips'])

    def test_distinct_attributes_cannot_be_duplicated(self):
        items = [EquipmentExtracted(modality='CT', model=name) for name in ('A', 'B')]
        with self.assertRaises(ValueError):
            ground_counts('Tres CT.', items)

    def test_unrelated_or_uncertain_numbers_do_not_expand(self):
        for text in ('Un CT de 64 cortes.', 'Hay más de tres CT.', 'Entre dos y cuatro CT.', 'CT de tres años.'):
            self.assertEqual(len(ground_counts(text, [EquipmentExtracted(modality='CT')])), 1)

    def test_large_count_is_rejected(self):
        with self.assertRaises(ValueError):
            ground_counts('10000 CT.', [EquipmentExtracted(modality='CT')])


if __name__ == '__main__':
    unittest.main()
