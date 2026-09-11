"""Evaluate a supervised-extraction JSONL dataset against local QVAC.

Reads only the user and assistant messages. It never writes visits or SQLite.
"""
import argparse
from collections import Counter
import json
import os
from pathlib import Path
import sys
import time
import hashlib
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.ai.extractor import extract_result
from app.ai.qvac_client import generate_with_qvac


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('dataset', type=Path)
    parser.add_argument('--output', type=Path,
                        default=Path('..') / 'benchmarks' / 'results' / 'training-eval')
    return parser.parse_args()


def counts(items):
    return dict(sorted(Counter(item['modality'] for item in items).items()))


def main():
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    source = Path(__file__).resolve().parents[1] / 'app' / 'ai' / 'extractor.py'
    (args.output / 'provenance.json').write_text(json.dumps({
        'dataset': str(args.dataset.resolve()),
        'dataset_sha256': hashlib.sha256(args.dataset.read_bytes()).hexdigest(),
        'extractor_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'model_health': __import__('httpx').get('http://127.0.0.1:11500/health', timeout=5).json(),
    }, indent=2), encoding='utf-8')
    os.environ['QVAC_METRICS_PATH'] = str(args.output / 'metrics.jsonl')
    rows = [json.loads(line) for line in args.dataset.read_text(encoding='utf-8').splitlines() if line.strip()]
    summary = []
    predictions = []
    for index, row in enumerate(rows, 1):
        if 'input' in row and 'expected' in row:
            text, expected = row['input'], row['expected']
        else:
            messages = row['messages']
            text = next(message['content'] for message in messages if message['role'] == 'user')
            expected = json.loads(next(message['content'] for message in messages if message['role'] == 'assistant'))
        saved = {}
        def capture(prompt):
            saved['prompt_sha256'] = hashlib.sha256(prompt.encode()).hexdigest()
            saved['raw_output'] = generate_with_qvac(prompt)
            return saved['raw_output']
        report = {'id': row.get('id', row.get('metadata', {}).get('id', str(index))), 'expected_counts': counts(expected['equipment'])}
        started = time.perf_counter()
        try:
            with patch('app.ai.extractor.generate_with_qvac', side_effect=capture):
                actual = extract_result(text).model_dump()
            report.update(actual_counts=counts(actual['equipment']), raw_output=saved.get('raw_output'), actual=actual)
            report['counts_match'] = report['expected_counts'] == report['actual_counts']
        except Exception as error:
            report.update(error=f'{type(error).__name__}: {error}', counts_match=False)
            response = getattr(error, 'response', None)
            if response is not None:
                report['error_body'] = response.text
        report['raw_output'] = saved.get('raw_output')
        report['prompt_sha256'] = saved.get('prompt_sha256')
        report['latency_ms'] = (time.perf_counter() - started) * 1000
        (args.output / f'case-{index:03}.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        predictions.append({'id': report['id'], 'latency_ms': report['latency_ms'], **({'prediction': report['actual']} if 'actual' in report else {'error': report['error']})})
        (args.output / 'predictions.jsonl').write_text(''.join(json.dumps(p, ensure_ascii=False) + '\n' for p in predictions), encoding='utf-8')
        summary.append({key: report[key] for key in ('id', 'expected_counts', 'actual_counts', 'counts_match', 'error') if key in report})
        print(json.dumps(summary[-1], ensure_ascii=False), flush=True)
    (args.output / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
