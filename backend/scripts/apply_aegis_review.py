"""Apply human AEGIS review decisions into a new immutable dataset directory."""
import argparse
import json
from pathlib import Path


def read(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]


def write(path, rows):
    path.write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in rows), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('dataset', type=Path)
    parser.add_argument('decisions', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists(): raise SystemExit(f'Output already exists: {args.output}')
    review = json.loads(args.decisions.read_text(encoding='utf-8'))
    if review.get('format') != 'aegis-label-review-v1': raise SystemExit('Unsupported review decision format')
    decisions = review.get('decisions', {})
    source = {split: read(args.dataset / f'{split}_raw.jsonl') for split in ('train', 'validation', 'test')}
    ids = {row['id'] for rows in source.values() for row in rows}
    if set(decisions) - ids: raise SystemExit('Review contains IDs outside dataset')
    if any(value.get('decision') not in ('approved', 'exclude', 'needs_edit', 'unreviewed') for value in decisions.values()):
        raise SystemExit('Invalid decision value')
    blocked = [identifier for identifier, value in decisions.items() if value.get('decision') in ('needs_edit', 'unreviewed')]
    if blocked: raise SystemExit(f'{len(blocked)} labels still need review or editing')
    args.output.mkdir(parents=True)
    report = {'source': str(args.dataset), 'review_file': str(args.decisions), 'splits': {}, 'excluded': []}
    for split, rows in source.items():
        retained = []
        for row in rows:
            decision = decisions.get(row['id'], {}).get('decision')
            if decision != 'approved':
                report['excluded'].append({'id': row['id'], 'split': split, 'reason': decisions.get(row['id'], {}).get('note') or 'Not approved'})
                continue
            row['metadata']['review_status'] = 'approved'
            row['metadata']['review_note'] = decisions[row['id']].get('note', '')
            retained.append(row)
        report['splits'][split] = len(retained)
        write(args.output / f'{split}_raw.jsonl', retained)
        write(args.output / f'{split}_chat.jsonl', [{'messages': [
            {'role': 'system', 'content': 'Use the provided inventory extraction schema.'},
            {'role': 'user', 'content': row['input']},
            {'role': 'assistant', 'content': json.dumps(row['expected'], ensure_ascii=False)}]} for row in retained])
    (args.output / 'review_application_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report['splits'], ensure_ascii=False))


if __name__ == '__main__':
    main()
