"""Compare saved predictions to the projected AEGIS raw JSONL, without inference.

Prediction rows: {"id": "AEGIS-0001", "prediction": {...}} or {"id": ..., "error": ...}.
Strict string equality after case/whitespace normalization is NOT semantic accuracy.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import sys
import statistics

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.ai.extractor import ExtractionResult
from app.schemas.equipment import EquipmentExtracted

FIELDS = tuple(EquipmentExtracted.model_fields)


def load_rows(path):
    rows = [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]
    ids = [row['id'] for row in rows]
    if len(set(ids)) != len(ids):
        raise ValueError(f'Duplicate prediction/gold IDs in {path}')
    return rows


def normalized(value):
    return ' '.join(value.casefold().split()) if isinstance(value, str) else value


def signature(item):
    return tuple(normalized(item.get(field)) for field in FIELDS)


def assignment(expected, actual):
    """Minimum-cost one-to-one matching with dummy devices (Hungarian algorithm)."""
    size = max(len(expected), len(actual))
    if not size:
        return []
    def cost(i, j):
        if i >= len(expected) or j >= len(actual):
            return 20
        left, right = expected[i], actual[j]
        return sum((8 if field == 'modality' else 3 if field == 'manufacturer' else 1)
                   for field in FIELDS if normalized(left.get(field)) != normalized(right.get(field)))
    u, v, p, way = [[0] * (size + 1) for _ in range(4)]
    for i in range(1, size + 1):
        p[0] = i
        j0 = 0
        minimum, used = [float('inf')] * (size + 1), [False] * (size + 1)
        while True:
            used[j0] = True
            i0, delta, j1 = p[j0], float('inf'), 0
            for j in range(1, size + 1):
                if not used[j]:
                    current = cost(i0 - 1, j - 1) - u[i0] - v[j]
                    if current < minimum[j]:
                        minimum[j], way[j] = current, j0
                    if minimum[j] < delta:
                        delta, j1 = minimum[j], j
            for j in range(size + 1):
                if used[j]:
                    u[p[j]] += delta
                    v[j] -= delta
                else:
                    minimum[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break
        while True:
            j1 = way[j0]
            p[j0] = p[j1]
            j0 = j1
            if j0 == 0:
                break
    return [(p[j] - 1, j - 1) for j in range(1, size + 1)]


def valid_prediction(value):
    if isinstance(value, str):
        value = json.loads(value)
    if not isinstance(value, dict) or 'equipment' not in value:
        raise ValueError('Prediction must have equipment')
    if set(value) - set(ExtractionResult.model_fields):
        raise ValueError('Unsupported top-level fields')
    if not isinstance(value['equipment'], list):
        raise ValueError('equipment must be an array')
    for item in value['equipment']:
        if not isinstance(item, dict) or set(item) - set(FIELDS):
            raise ValueError('Unsupported equipment fields')
    return ExtractionResult.model_validate(value, strict=True).model_dump()


def evaluate(gold, predictions):
    if not gold:
        raise ValueError('Empty evaluation set')
    indexed = {r['id']: r for r in predictions}
    if len(indexed) != len(predictions):
        raise ValueError('Duplicate prediction IDs')
    known_ids = {r['id'] for r in gold}
    if len(known_ids) != len(gold):
        raise ValueError('Duplicate gold IDs')
    if set(indexed) - known_ids:
        raise ValueError('Prediction IDs outside evaluation set')
    fields = {field: {'correct': 0, 'slots': 0, 'invented': 0, 'omitted': 0} for field in FIELDS}
    totals = Counter()
    cases = []
    latencies = []
    for row in gold:
        expected = valid_prediction(row['expected'])
        prediction = indexed.get(row['id'])
        actual, error = None, None
        try:
            if prediction is None or prediction.get('error') or 'prediction' not in prediction:
                raise ValueError((prediction or {}).get('error') or 'Missing prediction')
            actual = valid_prediction(prediction['prediction'])
            totals['schema_valid'] += 1
        except (ValueError, TypeError) as exc:
            error = str(exc)
        left, right = expected['equipment'], actual['equipment'] if actual else []
        left_counts, right_counts = Counter(e['modality'] for e in left), Counter(e['modality'] for e in right)
        omitted = sum((left_counts - right_counts).values())
        invented = sum((right_counts - left_counts).values())
        totals['omitted_devices'] += omitted
        totals['invented_devices'] += invented
        if prediction and isinstance(prediction.get('latency_ms'), (int, float)):
            latencies.append(prediction['latency_ms'])
        totals['expected_devices'] += len(left)
        totals['predicted_devices'] += len(right)
        exact_devices = sum((Counter(map(signature, left)) & Counter(map(signature, right))).values())
        totals['exact_devices'] += exact_devices
        count_ok = actual is not None and Counter(e['modality'] for e in left) == Counter(e['modality'] for e in right)
        totals['counts_match'] += count_ok
        # Missing/error responses cannot pass negative examples with an empty gold list.
        full_ok = actual is not None and Counter(map(signature, left)) == Counter(map(signature, right)) and all(
            normalized(expected[k]) == normalized(actual[k]) for k in ('facility', 'city', 'country'))
        totals['exact_extraction'] += full_ok
        for i, j in assignment(left, right):
            e = left[i] if i < len(left) else None
            a = right[j] if j < len(right) else None
            for field in FIELDS:
                ev, av = e.get(field) if e else None, a.get(field) if a else None
                fields[field]['slots'] += 1
                fields[field]['correct'] += e is not None and a is not None and normalized(ev) == normalized(av)
                fields[field]['invented'] += av is not None and ev is None
                fields[field]['omitted'] += ev is not None and av is None
        cases.append({'id': row['id'], 'counts_match': bool(count_ok), 'exact_extraction': bool(full_ok),
                      'omitted_devices': omitted, 'invented_devices': invented,
                      'multiple_modalities': len(left_counts) > 1,
                      'multiple_same_modality': any(count > 1 for count in left_counts.values()),
                      'expected_count': len(left), 'actual_count': len(right) if actual is not None else None, 'error': error})
    for values in fields.values():
        values['accuracy'] = values['correct'] / values['slots'] if values['slots'] else None
    return {
        'examples': len(gold), 'schema_valid_rate': totals['schema_valid'] / len(gold),
        'schema_valid': totals['schema_valid'], 'counts_match': totals['counts_match'],
        'omitted_devices': totals['omitted_devices'], 'invented_devices': totals['invented_devices'],
        'median_latency_ms': statistics.median(latencies) if latencies else None,
        'mean_latency_ms': statistics.mean(latencies) if latencies else None,
        'modality_counts_rate': totals['counts_match'] / len(gold),
        'exact_extraction_rate': totals['exact_extraction'] / len(gold),
        'device_exact_precision': totals['exact_devices'] / totals['predicted_devices'] if totals['predicted_devices'] else None,
        'device_exact_recall': totals['exact_devices'] / totals['expected_devices'] if totals['expected_devices'] else None,
        'fields': fields, 'cases': cases,
        'limitations': ['Text matching is normalized exact equality, not semantic grading.',
                        'Observation status, condition certainty, quantity statements and human review are outside the production schema.',
                        'Scores use draft synthetic labels; consult adaptation_report.json for split leakage.'],
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('gold', type=Path)
    parser.add_argument('predictions', type=Path)
    parser.add_argument('--before', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    gold = load_rows(args.gold)
    report = {'after': evaluate(gold, load_rows(args.predictions))}
    if args.before:
        report['before'] = evaluate(gold, load_rows(args.before))
        report['delta'] = {k: report['after'][k] - report['before'][k]
                           for k in ('schema_valid_rate', 'modality_counts_rate', 'exact_extraction_rate')}
    with args.output.open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report['after'].items() if k not in ('cases', 'fields')}, ensure_ascii=False, indent=2))
