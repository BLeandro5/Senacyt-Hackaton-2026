import unittest
from pathlib import Path

from app.ai.narrative_grounding import ground_narrative
from app.schemas.equipment import EquipmentExtracted
from app.services.evidence import preliminary_evidence_metadata


class NarrativeGroundingTests(unittest.TestCase):
    def items(self):
        return [EquipmentExtracted(modality=m, manufacturer=b, configuration=c)
                for m, b, c in [('CT','Philips',None), ('CT','Siemens',None),
                                 ('CT','Siemens',None), ('MRI','GE','1.5T'),
                                 ('MRI','Siemens',None), ('MRI','Siemens','3T')]]

    def test_user_note_keeps_ages_and_unknown_brands_separate(self):
        text = Path(__file__).with_name('fixtures').joinpath('uncertain_inventory_es.txt').read_text(encoding='utf-8')
        for reverse in (False, True):
            items = self.items()[::-1] if reverse else self.items()
            ground_narrative(text, items)
            philips = next(e for e in items if e.manufacturer == 'Philips')
            self.assertEqual(philips.estimated_age_years, 8)
            self.assertIn('fallas intermitentes', philips.condition)
            ge = next(e for e in items if e.manufacturer == 'GE')
            self.assertEqual(ge.age_description, '10–12 años')
            self.assertIsNone(ge.estimated_age_years)
            unknown = [e for e in items if e.manufacturer is None]
            self.assertEqual({e.modality for e in unknown}, {'CT', 'MRI'})
            self.assertTrue(all(e.estimated_age_years is None for e in unknown))
            scanner = next(e for e in items if e.configuration == '3T')
            self.assertEqual(scanner.manufacturer, 'Siemens')
            self.assertIn('No inspeccionado', scanner.condition)
            statuses, _ = preliminary_evidence_metadata(ge, text, '2026-09-10T00:00:00+00:00')
            self.assertEqual(statuses['age'], 'Estimated')

    def test_count_mismatch_does_not_guess_missing_devices(self):
        items = [EquipmentExtracted(modality='CT', manufacturer='Philips')]
        self.assertEqual(ground_narrative('Dos tomógrafos. El primero es Philips de ocho años. El segundo es Siemens.', items), items)
        self.assertIsNone(items[0].estimated_age_years)

    def test_maintenance_duration_does_not_become_device_age(self):
        items = [EquipmentExtracted(modality='CT', manufacturer=b) for b in ('Philips', 'Siemens')]
        ground_narrative('Dos tomógrafos. El primero es Philips con mantenimiento de ocho años. El segundo es Siemens.', items)
        self.assertTrue(all(e.estimated_age_years is None for e in items))
