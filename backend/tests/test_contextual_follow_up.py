import unittest
from app.schemas.equipment import EquipmentExtracted
from app.schemas.follow_up import FollowUpCandidate
from app.services.follow_up import validated_questions


class ContextualFollowUpTests(unittest.TestCase):
    def proposal(self, field, index=0):
        return FollowUpCandidate(equipment_index=index, field=field, question=f'¿Puedes aclarar {field}?')

    def test_known_answers_invalid_indices_and_duplicates_are_rejected(self):
        item = EquipmentExtracted(modality='CT', manufacturer='Philips', estimated_age_years=10, condition='Operativo')
        proposals = [self.proposal('manufacturer'), self.proposal('age'), self.proposal('condition'),
                     self.proposal('model', 4), self.proposal('model'), self.proposal('model')]
        result = validated_questions([item], 'Un CT Philips de diez años operativo.', proposals)
        self.assertEqual([p.field for p in result], ['model'])
        self.assertEqual(result[0].question, proposals[-1].question)

    def test_no_rigid_fallback_and_maximum_two(self):
        equipment = [EquipmentExtracted(modality='CT')]
        self.assertEqual(validated_questions(equipment, 'Un CT.'), [])
        proposals = [self.proposal(field) for field in ('model', 'manufacturer', 'condition')]
        self.assertEqual([p.field for p in validated_questions(equipment, 'Un CT.', proposals)], ['model', 'manufacturer'])
        self.assertEqual([p.field for p in validated_questions(equipment, 'Un CT.', proposals, ['0:model'])], ['manufacturer', 'condition'])

    def test_age_range_is_not_missing(self):
        item = EquipmentExtracted(modality='MRI', age_description='5–6 años')
        self.assertEqual(validated_questions([item], 'Un MRI de cinco a seis años.', [self.proposal('age')]), [])

    def test_question_about_another_device_is_rejected(self):
        item = EquipmentExtracted(modality='CT', manufacturer='Philips')
        proposal = FollowUpCandidate(equipment_index=0, field='model', question='¿Cuál es el modelo del resonador Siemens?')
        self.assertEqual(validated_questions([item], 'Un CT Philips y un resonador Siemens.', [proposal]), [])
