"""Run synthetic observations through FastAPI and the live local SDK service."""
import json
import platform
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from datetime import datetime, timezone
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from app.main import app

CASES = [
    ('Dos resonadores Siemens y un CT Philips de siete años.', [
        ('MRI', 'Siemens', None), ('MRI', 'Siemens', None), ('CT', 'Philips', 7),
    ]),
    ('Un ultrasonido GE.', [('Ultrasound', 'GE', None)]),
    ('No hay equipos en esta sala.', []),
    ('Un resonador de fabricante desconocido.', [('MRI', None, None)]),
    ('Un CT Philips de ocho años y un resonador Siemens.', [
        ('CT', 'Philips', 8), ('MRI', 'Siemens', None),
    ]),
    ('Un CT GE de cinco años y un resonador Philips de nueve años.', [
        ('CT', 'GE', 5), ('MRI', 'Philips', 9),
    ]),
    ('Dos resonadores Siemens de diez años y un ultrasonido GE.', [
        ('MRI', 'Siemens', 10), ('MRI', 'Siemens', 10), ('Ultrasound', 'GE', None),
    ]),
    ('Un resonador Siemens y un CT Philips, ambos de tres años.', [
        ('MRI', 'Siemens', 3), ('CT', 'Philips', 3),
    ]),
]


def main():
    results = []
    client = TestClient(app)
    health = httpx.get('http://127.0.0.1:11500/health', timeout=10).json()
    if health.get('model') != 'MedPsy-1.7B':
        raise RuntimeError('The benchmark requires the real MedPsy service; restart qvac:start.')
    for text, expected in CASES:
        evidence = {}

        def generate(prompt):
            response = httpx.post('http://127.0.0.1:11500/generate',
                                  json={'prompt': prompt}, timeout=180)
            response.raise_for_status()
            data = response.json()
            if data.get('metrics', {}).get('model') != 'MedPsy-1.7B':
                raise ValueError('Unexpected inference model')
            evidence.update(prompt=prompt, metrics=data.get('metrics'), raw_output=data['output_text'])
            return data['output_text']

        with patch('app.ai.extractor.generate_with_qvac', side_effect=generate):
            response = client.post('/observations/analyze', json={'hospital_id': 'HOSP-001', 'text': text})
        data = response.json()
        actual = [(e['modality'], e['manufacturer'], e['estimated_age_years'])
                  for e in data.get('equipment', [])]
        passed = response.status_code == 200 and sorted(actual, key=str) == sorted(expected, key=str)
        results.append(dict(input=text, expected=expected, response=data,
                            status=response.status_code, passed=passed, **evidence))
        print(f'{response.status_code}: {passed} - {text}')
    output = Path(__file__).resolve().parents[2] / 'benchmarks' / 'results'
    output.mkdir(parents=True, exist_ok=True)
    report = {'created_at': datetime.now(timezone.utc).isoformat(),
              'platform': platform.platform(), 'processor': platform.processor(),
              'scope': 'Synthetic regression cases: count, modality, manufacturer and age only; not clinical validation.',
              'passed': sum(r['passed'] for r in results), 'total': len(results), 'results': results}
    target = output / 'medpsy-baseline.json'
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(target)
    return 0 if all(r['passed'] for r in results) else 1


if __name__ == '__main__':
    raise SystemExit(main())
