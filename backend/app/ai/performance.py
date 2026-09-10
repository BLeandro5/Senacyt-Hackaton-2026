"""Operational metrics only: prompts, output and patient data are never logged."""
import json
import os
from pathlib import Path
from datetime import datetime, timezone


def record(metrics, success, elapsed):
    allowed = ('model','quantization','model_load_ms','ttft_ms','prompt_tokens','generated_tokens','tokens_per_second','backend_device')
    event = {key: metrics.get(key) for key in allowed}
    event.update(timestamp=datetime.now(timezone.utc).isoformat(), success=success, total_ms=elapsed)
    path = Path(os.environ.get('QVAC_METRICS_PATH', Path(__file__).resolve().parents[3] / 'benchmarks/results/inference.jsonl'))
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('a', encoding='utf-8') as stream:
            stream.write(json.dumps(event) + '\n')
    except OSError:
        pass  # Telemetry must not discard a successful extraction.
