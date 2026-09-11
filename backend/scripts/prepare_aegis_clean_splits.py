"""Remove exact normalized duplicate observations across fixed AEGIS splits.

Priority is test, then validation, then train: an evaluation sentence never
appears in a lower-priority training split. This creates a new directory and
does not change the source draft.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import unicodedata

SPLITS = ('test', 'validation', 'train')


def key(value):
    value = ''.join(c for c in unicodedata.normalize('NFD', value.casefold())
                    if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', value).strip()


def read(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]


def write(path, rows):
    path.write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in rows), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit(f'Output already exists: {args.output}')
    source = {split: read(args.source / f'{split}_raw.jsonl') for split in SPLITS}
    retained, removed, seen = {}, [], {}
    for split in SPLITS:
        retained[split] = []
        for row in source[split]:
            normalized = key(row['input'])
            if normalized in seen:
                removed.append({'id': row['id'], 'removed_from': split, 'retained_id': seen[normalized]['id'],
                                'retained_split': seen[normalized]['split'], 'reason': 'Exact normalized duplicate'})
                continue
            seen[normalized] = {'id': row['id'], 'split': split}
            retained[split].append(row)
    args.output.mkdir(parents=True)
    for split, rows in retained.items():
        write(args.output / f'{split}_raw.jsonl', rows)
        write(args.output / f'{split}_chat.jsonl', [
            {'messages': [{'role': 'system', 'content': 'Use the provided inventory extraction schema.'},
                          {'role': 'user', 'content': row['input']},
                          {'role': 'assistant', 'content': json.dumps(row['expected'], ensure_ascii=False)}]} for row in rows])
    report = {'source': str(args.source), 'policy': 'test > validation > train',
              'before': {split: len(rows) for split, rows in source.items()},
              'after': {split: len(rows) for split, rows in retained.items()},
              'removed': removed,
              'remaining_difficulty': {split: dict(Counter(row['difficulty'] for row in rows)) for split, rows in retained.items()},
              'limitations': ['Only exact normalized duplicates are removed.',
                              'Template-family or semantic near-duplicates need human review.']}
    (args.output / 'deduplication_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in ('before', 'after')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
