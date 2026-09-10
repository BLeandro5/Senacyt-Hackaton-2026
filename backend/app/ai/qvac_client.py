import time
import httpx
from app.ai.performance import record

QVAC_URL = "http://127.0.0.1:11500/generate"

def generate_with_qvac(prompt: str) -> str:
    started = time.perf_counter()
    metrics = {}
    success = False
    try:
        response = httpx.post(QVAC_URL, json={"prompt": prompt}, timeout=httpx.Timeout(180.0, connect=5.0))
        response.raise_for_status()
        data = response.json()
        metrics = data.get('metrics') or {}
        text = data.get('output_text')
        if not isinstance(text, str) or not text.strip():
            raise ValueError('QVAC returned no text')
        success = True
        return text.strip()
    finally:
        record(metrics, success, (time.perf_counter() - started) * 1000)
