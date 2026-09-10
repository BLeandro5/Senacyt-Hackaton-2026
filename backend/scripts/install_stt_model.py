"""Explicit model download; never imported by application startup."""
import hashlib
import json
import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path

NAME='vosk-model-small-es-0.42'
URL=f'https://alphacephei.com/vosk/models/{NAME}.zip'
ROOT=Path(__file__).resolve().parents[2]/'models'
REQUIRED=['am/final.mdl','conf/model.conf','graph/Gr.fst','graph/HCLr.fst']


def main():
    ROOT.mkdir(exist_ok=True)
    target=ROOT/NAME
    if target.exists():
        if not all((target/p).is_file() for p in REQUIRED): raise RuntimeError('Existing model is incomplete; not overwriting it.')
        print(f'Model already present: {target}'); return
    with tempfile.TemporaryDirectory(prefix='stt-install-',dir=ROOT) as directory:
        stage=Path(directory)
        archive=stage/'model.zip'
        print(f'Explicit download from {URL}',flush=True)
        with urllib.request.urlopen(URL,timeout=90) as response, archive.open('wb') as output:
            count=0
            while chunk:=response.read(1024*1024):
                count+=len(chunk)
                if count>100*1024*1024: raise RuntimeError('Unexpected archive size')
                output.write(chunk)
        digest=hashlib.sha256(archive.read_bytes()).hexdigest()
        with zipfile.ZipFile(archive) as zipped:
            if sum(i.file_size for i in zipped.infolist())>300*1024*1024: raise RuntimeError('Unexpected extracted size')
            for member in zipped.infolist():
                destination=(stage/member.filename).resolve()
                if not destination.is_relative_to(stage.resolve()) or not member.filename.startswith(NAME+'/'):
                    raise RuntimeError('Unsafe archive path')
            if zipped.testzip(): raise RuntimeError('Corrupt archive')
            zipped.extractall(stage)
        source=stage/NAME
        if not all((source/p).is_file() for p in REQUIRED): raise RuntimeError('Missing model files')
        manifest={'source':URL,'archive_sha256':digest,'license':'Apache-2.0',
            'files':{p:hashlib.sha256((source/p).read_bytes()).hexdigest() for p in REQUIRED}}
        (source/'local-integrity.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
        shutil.move(str(source),str(target))
        print(f'Installed {target}; SHA256 {digest}',flush=True)


if __name__=='__main__': main()
