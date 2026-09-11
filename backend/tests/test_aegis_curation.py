import copy
import json
from pathlib import Path
import tempfile
import unittest

from scripts.adapt_aegis_pack import adapt, convert, SYSTEM
from scripts.curate_aegis_dataset import build, family_key, review
from zipfile import ZipFile


def fixture(condition=None, note=None):
    return {'id': 'fixture', 'input': 'En Clínica Azul vi un CT GE apagado; no se confirmó su estado.',
        'difficulty': 'adversarial', 'tags': ['condition_uncertain'], 'negative': False,
        'expected': {'facility_name': 'Clínica Azul', 'city': None, 'country': None,
            'needs_human_review': True, 'equipment': [{'modality': 'CT', 'manufacturer': 'GE',
                'model': None, 'age_min_years': None, 'age_max_years': None, 'age_text': None,
                'condition': condition, 'condition_status': 'uncertain',
                'observation_status': 'observed', 'quantity_statement': None, 'notes': note}]}}


class AegisCurationTests(unittest.TestCase):
    def test_unknown_condition_is_useful_and_does_not_mean_label_is_wrong(self):
        row = adapt(fixture(note='Apagado; condición desconocida'), 'train')
        self.assertEqual(review(row)[0], 'approved')
        self.assertIsNone(row['expected']['equipment'][0]['condition'])

    def test_unsupported_state_excludes_case_without_altering_source(self):
        source = fixture(condition='limited_use')
        original = copy.deepcopy(source)
        row = adapt(source, 'train')
        self.assertEqual(review(row)[0], 'exclude')
        self.assertIsNone(row['expected']['equipment'][0]['condition'])
        self.assertEqual(source, original)

    def test_reported_presence_is_not_silently_approved_as_observed(self):
        source = fixture()
        source['expected']['equipment'][0]['observation_status'] = 'reported'
        self.assertEqual(review(adapt(source, 'train'))[0], 'exclude')

    def test_template_matching_ignores_variable_slots(self):
        entities = ['clinica azul', 'clinica roja', 'philips', 'ge']
        self.assertEqual(family_key('En Clínica Azul vi un CT GE de 5 años.', entities),
                         family_key('En Clínica Roja vi un CT Philips de 8 años.', entities))

    def test_v2_archive_to_reviewed_jsonl_with_traceability(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive_path = root / 'pack.zip'
            with ZipFile(archive_path, 'w') as archive:
                archive.writestr('aegis_finetune_v2/dataset_summary_v2.json', json.dumps({'split': {'train': 1, 'validation': 0, 'test': 0}}))
                row = fixture()
                for split in ('train', 'validation', 'test'):
                    raw = [row] if split == 'train' else []
                    chat = [{'messages': [{'role': 'user', 'content': r['input']},
                            {'role': 'assistant', 'content': json.dumps(r['expected'])}]} for r in raw]
                    for kind, data in [('raw', raw), ('chat', chat)]:
                        archive.writestr(f'aegis_finetune_v2/{split}_{kind}_v2.jsonl',
                            ''.join(json.dumps(r) + '\n' for r in data))
            draft, curated = root / 'draft', root / 'curated'
            self.assertEqual(convert(archive_path, draft)['total'], 1)
            report = build([draft], curated)
            self.assertEqual(report['decisions'], {'approved': 1})
            saved = json.loads((curated / 'train_raw.jsonl').read_text(encoding='utf8'))
            self.assertFalse(saved['metadata']['human_reviewed'])
            self.assertEqual(saved['metadata']['original_split'], 'train')
            chat = json.loads((curated / 'train_chat.jsonl').read_text(encoding='utf8'))
            self.assertEqual(chat['messages'][0]['content'], SYSTEM)
            self.assertEqual(json.loads(chat['messages'][2]['content']), saved['expected'])
            with self.assertRaises(ValueError):
                build([draft], curated)
