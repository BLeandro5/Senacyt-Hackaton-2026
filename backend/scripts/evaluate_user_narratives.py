"""Run supplied paragraphs through local extraction without saving visits."""
import argparse
from collections import Counter
import json
import os
from pathlib import Path
import sys
import time
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.ai.extractor import extract_result
from app.ai.qvac_client import generate_with_qvac


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    os.environ['QVAC_METRICS_PATH'] = str(args.output / 'metrics.jsonl')
    notes = [line.strip() for line in args.source.read_text(encoding='utf-8-sig').splitlines() if line.strip()]
    for index, note in enumerate(notes, 1):
        record = {'case': index, 'text': note}
        def capture(prompt):
            raw = generate_with_qvac(prompt)
            record['raw_output'] = raw
            return raw
        started = time.monotonic()
        try:
            with patch('app.ai.extractor.generate_with_qvac', side_effect=capture):
                result = extract_result(note)
            record['result'] = result.model_dump()
            record['counts'] = dict(Counter(item.modality for item in result.equipment))
        except Exception as error:
            record['error'] = f'{type(error).__name__}: {error}'
            response = getattr(error, 'response', None)
            if response is not None:
                record['error_body'] = response.text
        record['seconds'] = round(time.monotonic() - started, 2)
        (args.output / f'case-{index:02}.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({key: value for key, value in record.items() if key not in ('text', 'raw_output', 'result')}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
