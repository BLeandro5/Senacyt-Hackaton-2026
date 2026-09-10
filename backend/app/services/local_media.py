"""Optional local speech/OCR. No remote calls and no automatic model downloads."""
import base64
import hashlib
import importlib.util
import io
import json
import os
import shutil
import subprocess
import tempfile
import threading
import wave
from functools import lru_cache
from pathlib import Path
from fastapi import HTTPException

MODEL=Path(__file__).resolve().parents[3]/'models/vosk-model-small-es-0.42'
REQUIRED=('am/final.mdl','conf/model.conf','graph/Gr.fst','graph/HCLr.fst')
LOCK=threading.Lock()


def model_path(): return Path(os.environ.get('STT_MODEL_PATH',MODEL))


def validate_model(path):
    root=Path(path)
    try:
        manifest=json.loads((root/'local-integrity.json').read_text(encoding='utf-8'))
        return all(hashlib.sha256((root/name).read_bytes()).hexdigest()==manifest['files'][name] for name in REQUIRED)
    except (OSError,ValueError,KeyError): return False


def capabilities():
    speech=importlib.util.find_spec('vosk') is not None and validate_model(str(model_path()))
    ocr=bool(shutil.which(os.environ.get('TESSERACT_COMMAND','tesseract')))
    return {'stt':{'status':'ready' if speech else 'unavailable','engine':'Vosk','language':'es','local':True},
            'ocr':{'status':'ready' if ocr else 'unavailable','engine':'Tesseract','local':True}}


@lru_cache(maxsize=1)
def loaded_model(path):
    if not validate_model(path): raise HTTPException(503,'Modelo STT ausente o no verificado. Ejecuta la instalación explícita de voz local.')
    try:
        from vosk import Model, SetLogLevel
        SetLogLevel(-1)
        return Model(path)
    except Exception as exc:
        raise HTTPException(503,'No se pudo cargar Vosk local. Comprueba dependencia y modelo.') from exc


def transcribe(data: bytes):
    if not data or len(data)>12*1024*1024: raise HTTPException(413,'Audio vacío o demasiado grande (máximo 12 MB).')
    try:
        stream=wave.open(io.BytesIO(data),'rb')
        if stream.getnchannels()!=1 or stream.getsampwidth()!=2 or stream.getframerate()!=16000 or stream.getcomptype()!='NONE':
            stream.close()
            raise HTTPException(415,'Se requiere WAV PCM mono, 16 bits y 16000 Hz.')
        if stream.getnframes()==0 or stream.getnframes()>16000*180:
            stream.close()
            raise HTTPException(422,'Graba entre un instante y tres minutos de audio.')
    except (wave.Error,EOFError) as exc: raise HTTPException(415,'Formato de audio incompatible; usa WAV PCM.') from exc
    if not LOCK.acquire(blocking=False):
        stream.close()
        raise HTTPException(409,'Ya hay una transcripción en curso. Reintenta cuando termine.')
    try:
        from vosk import KaldiRecognizer
        recognizer=KaldiRecognizer(loaded_model(str(model_path())),16000)
        parts=[]
        with stream:
            while chunk:=stream.readframes(4000):
                if recognizer.AcceptWaveform(chunk): parts.append(json.loads(recognizer.Result()).get('text',''))
        parts.append(json.loads(recognizer.FinalResult()).get('text',''))
        text=' '.join(filter(None,parts)).strip()
        if not text: raise HTTPException(422,'No se reconoció voz. Acerca el micrófono y vuelve a intentarlo.')
        return {'text':text,'engine':'Vosk','language':'es','local':True,'audioStored':False}
    except ImportError as exc: raise HTTPException(503,'Vosk no está instalado. La captura escrita sigue disponible.') from exc
    finally: LOCK.release(); stream.close()


def recognize_photo(data_url: str):
    executable=shutil.which(os.environ.get('TESSERACT_COMMAND','tesseract'))
    if not executable: raise HTTPException(503,'OCR local no disponible. La fotografía se conserva como adjunto; instala Tesseract para leer etiquetas.')
    try:
        header,encoded=data_url.split(',',1)
        if header not in ('data:image/png;base64','data:image/jpeg;base64'): raise ValueError()
        data=base64.b64decode(encoded,validate=True)
        if not data or len(data)>2*1024*1024: raise ValueError()
        if not (data.startswith(b'\x89PNG\r\n\x1a\n') or data.startswith(b'\xff\xd8')): raise ValueError()
    except (ValueError,TypeError) as exc: raise HTTPException(422,'Usa una fotografía PNG/JPEG de menos de 2 MB.') from exc
    with tempfile.TemporaryDirectory(prefix='inventory-ocr-') as directory:
        source=Path(directory)/('label.png' if 'png' in header else 'label.jpg')
        source.write_bytes(data)
        try:
            result=subprocess.run([executable,str(source),'stdout','-l',os.environ.get('OCR_LANGUAGES','eng'),'--psm','11'],capture_output=True,text=True,encoding='utf-8',timeout=45,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        except (OSError,subprocess.TimeoutExpired) as exc: raise HTTPException(503,'OCR local no respondió; conserva el adjunto y escribe los datos.') from exc
        if result.returncode!=0: raise HTTPException(422,'No se pudo leer la fotografía con los idiomas OCR instalados.')
        text=result.stdout.strip()
        if not text: raise HTTPException(422,'No se encontró texto legible. No se inventaron datos.')
        return {'text':text[:8000],'source':'photograph','requiresConfirmation':True,'local':True}
