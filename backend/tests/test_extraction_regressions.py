import unittest
from pathlib import Path
from unittest.mock import patch

from app.ai.count_grounding import complete_explicit_mentions, ground_counts
from app.ai.extractor import extract_equipment, parse_extraction, explicit_span_inventory, literal_short_inventory
from app.schemas.equipment import EquipmentExtracted


class ExtractionRegressions(unittest.TestCase):
    def test_short_multilingual_notes_ground_counts_brands_models_and_absence(self):
        cases = {
            'Two MRI systems from Siemens and one Philips CT aged seven years.': [('MRI', 'Siemens', None), ('MRI', 'Siemens', None), ('CT', 'Philips', None)],
            'Dois equipamentos MRI Siemens e um CT Philips com sete anos.': [('MRI', 'Siemens', None), ('MRI', 'Siemens', None), ('CT', 'Philips', None)],
            'Un CT Philips Incisive.': [('CT', 'Philips', 'Incisive')],
            'No hay equipos en esta sala.': [],
        }
        for note, expected in cases.items():
            with self.subTest(note=note):
                self.assertEqual([(item.modality, item.manufacturer, item.model) for item in literal_short_inventory(note)], expected)

    @patch('app.ai.extractor.generate_with_qvac')
    def test_full_user_note_corrects_wrong_brands_even_with_equal_count(self, generate):
        import json
        generate.return_value = json.dumps({'equipment': [{'modality':'CT', 'manufacturer':'Philips'} for _ in range(9)]})
        text = Path(__file__).with_name('fixtures').joinpath('long_inventory.txt').read_text(encoding='utf-8').strip()
        items = extract_equipment(text)
        self.assertEqual([(e.modality, e.manufacturer, e.estimated_age_years) for e in items], [
            ('CT','Philips',8), ('CT','Siemens',None), ('MRI','GE',None), ('MRI',None,None),
            ('Ultrasound','Mindray',4), ('Ultrasound','Mindray',4), ('Ultrasound',None,None),
            ('Mammography','Hologic',6), ('X-ray','Philips',None)])
        self.assertEqual(items[2].age_description, '10–12 años')
        self.assertEqual(items[2].configuration, '1.5T')
        self.assertEqual(items[6].configuration, 'Portátil')
        self.assertIsNone(items[4].configuration)
        self.assertIn('fallas intermitentes', items[0].condition)
        self.assertTrue(all(item.condition is None for item in items[1:]))
        self.assertTrue(all(item.model is None for item in items))

    def test_implicit_thinking_is_not_json_output(self):
        raw = '{"equipment": []}]} reasoning... </think>\n```json\n{"equipment":[{"modality":"MRI"}]}\n```'
        self.assertEqual(len(parse_extraction(raw).equipment), 1)

    def test_unfinished_or_invalid_final_is_rejected(self):
        for raw in ('<think>{"equipment":[]}', '{"equipment":[]} </think>invalid',
                    '{"equipment":[]} trailing text', '{"equipment":[]} {"equipment":[]}'):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                parse_extraction(raw)

    def test_repeated_wrappers_recover_complete_device_objects(self):
        raw = ('{"equipment":[{"modality":"tomography","manufacturer":"Philips","model":null,'
               '"configuration":null,"estimated_age_years":8,"condition":null}],'
               '{"equipment":[{"modality":"MRI","manufacturer":"GE","model":null,'
               '"configuration":"1.5T","estimated_age_years":10,"condition":null}]}')
        result = parse_extraction(raw)
        self.assertEqual([(item.modality, item.manufacturer) for item in result.equipment],
                         [('tomography', 'Philips'), ('MRI', 'GE')])

    def test_long_span_note_keeps_literal_equipment_facts(self):
        text = ('Hay dos tomógrafos: uno Philips fue instalado hace unos ocho años y sigue operativo; '
                'el segundo es un Siemens. En resonancia magnética hay un equipo GE de 1.5T y otro resonador. '
                'Se observaron tres ecógrafos: dos Mindray con unos cuatro años de uso y un equipo portátil. '
                'En mamografía hay un sistema Hologic que tiene seis años. Existe un equipo de rayos X móvil Philips.')
        items = explicit_span_inventory(text)
        self.assertEqual([item.modality for item in items], ['CT', 'CT', 'MRI', 'MRI', 'Ultrasound', 'Ultrasound', 'Ultrasound', 'Mammography', 'X-ray'])
        self.assertEqual((items[0].manufacturer, items[0].estimated_age_years, items[0].condition), ('Philips', 8, 'Operativo'))
        self.assertEqual((items[4].manufacturer, items[4].estimated_age_years), ('Mindray', 4))
        self.assertEqual((items[7].manufacturer, items[7].estimated_age_years), ('Hologic', 6))
        self.assertEqual(items[8].configuration, 'Móvil')

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

    def test_explicit_missed_modality_is_kept_unknown_for_human_review(self):
        result = complete_explicit_mentions('En mamografía hay un sistema Hologic.', [])
        self.assertEqual([(item.modality, item.manufacturer, item.model) for item in result],
                         [('Mammography', 'Hologic', None)])


if __name__ == '__main__':
    unittest.main()
