import unittest

from app.ai.age_grounding import ground_ages
from app.schemas.equipment import EquipmentExtracted


class AgeGroundingTests(unittest.TestCase):
    def check_ages(self, text, specs, expected):
        items = [EquipmentExtracted(modality=m, manufacturer=b, estimated_age_years=99)
                 for m, b in specs]
        ground_ages(text, items)
        self.assertEqual([e.estimated_age_years for e in items], expected)

    def test_age_only_on_last_device(self):
        self.check_ages('Dos resonadores Siemens y un CT Philips de siete años.',
                        [('MRI', 'Siemens'), ('MRI', 'Siemens'), ('CT', 'Philips')], [None, None, 7])

    def test_distinct_ages_and_output_order(self):
        self.check_ages('Un CT GE de cinco años y un resonador Philips de nueve años.',
                        [('MRI', 'Philips'), ('CT', 'GE')], [9, 5])

    def test_plural_group(self):
        self.check_ages('Dos resonadores de diez años y un ultrasonido.',
                        [('MRI', None), ('MRI', None), ('Ultrasound', None)], [10, 10, None])

    def test_explicit_shared_age(self):
        self.check_ages('Un MRI y un CT, ambos de tres años.',
                        [('MRI', None), ('CT', None)], [3, 3])

    def test_unknown_and_unrelated_age(self):
        self.check_ages('Un MRI. El hospital tiene siete años.', [('MRI', None)], [None])

    def test_same_modality_different_brands(self):
        self.check_ages('Un CT GE de cinco años y un CT Philips de ocho años.',
                        [('CT', 'Philips'), ('CT', 'GE')], [8, 5])

    def test_ambiguous_same_modality(self):
        self.check_ages('Un CT de cinco años y otro CT de ocho años.',
                        [('CT', None), ('CT', None)], [None, None])

    def test_uncertain_age(self):
        self.check_ages('Un MRI de más de veinte años.', [('MRI', None)], [None])

    def test_decimal_age(self):
        self.check_ages('Un CT de 2.5 años y un MRI de veintidós años.',
                        [('CT', None), ('MRI', None)], [2.5, 22])

    def test_warranty_is_not_age(self):
        self.check_ages('Un MRI con garantía de cinco años.', [('MRI', None)], [None])

    def test_shared_age_does_not_cross_sentence(self):
        self.check_ages('Un ultrasonido. Un CT y un MRI, ambos de dos años.',
                        [('Ultrasound', None), ('CT', None), ('MRI', None)], [None, 2, 2])


if __name__ == '__main__':
    unittest.main()
