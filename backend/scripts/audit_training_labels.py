"""Read-only label audit. Keep existing splits and flag ambiguity for humans."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.curate_aegis_dataset import read, review
from scripts.adapt_aegis_pack import normal, mentioned
from app.ai.extractor import ExtractionResult


def audit(root):
    cases, seen_ids, seen_texts, families = [], {}, {}, {}
    counts, hashes = {}, {}
    for split in ('train', 'validation', 'test'):
        raw_path, chat_path = root / f'{split}_raw.jsonl', root / f'{split}_chat.jsonl'
        rows, chats = read(raw_path), read(chat_path)
        counts[split] = len(rows)
        if len(rows) != len(chats):
            raise ValueError(f'{split}: raw/chat lengths differ')
        for path in (raw_path, chat_path):
            hashes[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
        for row, chat in zip(rows, chats):
            errors, warnings = [], []
            try:
                ExtractionResult.model_validate(row['expected'], strict=True)
            except ValueError as error:
                errors.append(str(error))
            messages = chat['messages']
            if [m['role'] for m in messages] != ['system', 'user', 'assistant']:
                errors.append('Unexpected chat roles')
            if messages[1]['content'] != row['input'] or json.loads(messages[2]['content']) != row['expected']:
                errors.append('Raw/chat content mismatch')
            for key, value, index in [('id', row['id'], seen_ids), ('text', normal(row['input']), seen_texts)]:
                if value in index:
                    errors.append(f'Duplicate {key}, previously in {index[value]}')
                index[value] = split
            family = row['metadata'].get('template_family')
            if family:
                if family in families and families[family] != split:
                    errors.append('Template family crosses splits')
                families[family] = split
            if row['metadata']['split'] != split:
                errors.append('Incorrect split metadata')
            decision, reasons = review(row)
            if decision != 'approved':
                warnings.extend(reasons)
            for index, item in enumerate(row['expected']['equipment']):
                for field in ('manufacturer', 'model', 'configuration', 'age_description'):
                    if item.get(field) and not mentioned(item[field], row['input']):
                        warnings.append(f'Equipment {index}: {field} lacks literal support')
            cases.append({'id': row['id'], 'split': split,
                          'classification': 'claramente incorrecto' if errors else 'sospechoso' if warnings else 'OK',
                          'reasons': errors + warnings})
    return {'dataset': str(root), 'counts': counts, 'sha256': hashes,
            'classifications': dict(Counter(c['classification'] for c in cases)), 'cases': cases,
            'limitations': ['Automatic audit, not human certification.',
                           'Literal support cannot prove correct attribution across multiple devices.',
                           'Existing synthetic labels omit some reported/observed distinctions.',
                           'No labels or splits changed. Test remains held out.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dataset', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    result = audit(args.dataset)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8') as output:
        json.dump(result, output, ensure_ascii=False, indent=2)
    print(json.dumps({k: result[k] for k in ('counts', 'classifications')}, ensure_ascii=False))
