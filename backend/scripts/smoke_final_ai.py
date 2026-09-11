"""Three local inference cases, saved outside SQLite. No training or seeding."""
import json
from pathlib import Path
import sys
import time
import argparse
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.ai.qvac_client import generate_with_qvac
from app.services.observation_service import analyze_observation

root = Path(__file__).resolve().parents[2]
cases = ['Vi un tomógrafo Philips.', 'Vi dos tomógrafos Philips y uno Siemens.',
         (root / 'backend/tests/fixtures/demo_final_es.txt').read_text(encoding='utf-8')]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--case', type=int, choices=[1,2,3])
parser.add_argument('--output', type=Path, default=root / 'benchmarks/results/final-ai-smoke.jsonl')
parser.add_argument('--replay', type=Path, help='Reconcile a saved raw response without another inference')
args = parser.parse_args()
output = args.output
with output.open('x', encoding='utf-8') as stream:
    for index, text in enumerate(cases):
        if args.case and args.case != index + 1:
            continue
        started = time.perf_counter()
        captured = {}
        def capture(prompt):
            captured['raw_output'] = json.loads(args.replay.read_text(encoding='utf-8').splitlines()[0])['raw_output'] if args.replay else generate_with_qvac(prompt)
            return captured['raw_output']
        try:
            with patch('app.ai.extractor.generate_with_qvac', side_effect=capture):
                result = {'result': analyze_observation(text).model_dump()}
        except Exception as error:
            result = {'error': f'{type(error).__name__}: {error}'}
        result.update(case=index + 1, latency_ms=(time.perf_counter() - started) * 1000)
        result.update(captured)
        if args.replay:
            result['replay_source'] = str(args.replay)
        stream.write(json.dumps(result, ensure_ascii=False) + '\n')
        stream.flush()
        print(json.dumps(result, ensure_ascii=False), flush=True)
