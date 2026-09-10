"""Explicitly download local Tesseract language packs; never called at startup."""
import hashlib
import json
import os
import tempfile
import urllib.request
from pathlib import Path

LANGUAGES = ('eng', 'spa')
BASE_URL = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/{language}.traineddata'
ROOT = Path(os.environ.get('OCR_TESSDATA_PATH', Path(__file__).resolve().parents[2] / 'models/tessdata'))


def download(language: str) -> dict:
    target = ROOT / f'{language}.traineddata'
    url = BASE_URL.format(language=language)
    if target.exists() and target.stat().st_size > 100_000:
        data = target.read_bytes()
        return {'language': language, 'source': url, 'sha256': hashlib.sha256(data).hexdigest(), 'existing': True}
    with tempfile.NamedTemporaryFile(prefix=f'{language}-', suffix='.download', dir=ROOT, delete=False) as temporary:
        stage = Path(temporary.name)
    try:
        print(f'Explicit download from {url}', flush=True)
        with urllib.request.urlopen(url, timeout=90) as response, stage.open('wb') as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        if stage.stat().st_size <= 100_000:
            raise RuntimeError(f'{language} language pack is unexpectedly small')
        data = stage.read_bytes()
        stage.replace(target)
        return {'language': language, 'source': url, 'sha256': hashlib.sha256(data).hexdigest(), 'existing': False}
    finally:
        stage.unlink(missing_ok=True)


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    manifest = {'languages': [download(language) for language in LANGUAGES]}
    (ROOT / 'local-integrity.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(f'Installed local OCR languages in {ROOT}')


if __name__ == '__main__':
    main()
