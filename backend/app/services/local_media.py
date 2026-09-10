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
from PIL import Image, ImageEnhance, ImageOps, UnidentifiedImageError

MODEL=Path(__file__).resolve().parents[3]/'models/vosk-model-small-es-0.42'
OCR_TESSDATA=Path(os.environ.get('OCR_TESSDATA_PATH', Path(__file__).resolve().parents[3]/'models/tessdata'))
REQUIRED=('am/final.mdl','conf/model.conf','graph/Gr.fst','graph/HCLr.fst')
LOCK=threading.Lock()
Image.MAX_IMAGE_PIXELS = 20_000_000


def model_path(): return Path(os.environ.get('STT_MODEL_PATH',MODEL))


def validate_model(path):
    root=Path(path)
    try:
        manifest=json.loads((root/'local-integrity.json').read_text(encoding='utf-8'))
        return all(hashlib.sha256((root/name).read_bytes()).hexdigest()==manifest['files'][name] for name in REQUIRED)
    except (OSError,ValueError,KeyError): return False


def ocr_executable():
    configured = os.environ.get('TESSERACT_COMMAND')
    if configured:
        return shutil.which(configured)
    found = shutil.which('tesseract')
    if found:
        return found
    if os.name == 'nt':
        candidate = Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'Tesseract-OCR/tesseract.exe'
        if candidate.is_file():
            return str(candidate)
    return None


def ocr_data_args() -> list[str]:
    """Prefer project-local language packs so setup does not need admin rights."""
    return ['--tessdata-dir', str(OCR_TESSDATA)] if (OCR_TESSDATA / 'eng.traineddata').is_file() else []


def prepare_photo_for_ocr(data: bytes, destination: Path) -> None:
    """Normalize a label photo without modifying the user's saved original."""
    try:
        with Image.open(io.BytesIO(data)) as image:
            image = ImageOps.exif_transpose(image)
            if image.width * image.height > 20_000_000:
                raise ValueError('La fotografía tiene demasiados píxeles.')
            if image.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', image.size, 'white')
                background.paste(image, mask=image.getchannel('A'))
                image = background
            else:
                image = image.convert('RGB')
            longest = max(image.size)
            if longest < 1800:
                scale = min(3, 1800 / longest)
                image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
            image = ImageOps.autocontrast(image.convert('L'), cutoff=1)
            image = ImageEnhance.Contrast(image).enhance(1.25)
            image.save(destination, format='PNG', optimize=True)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(422, 'No se pudo preparar la fotografía. Usa PNG/JPEG legible y de menos de 20 megapíxeles.') from exc


def capabilities():
    speech=importlib.util.find_spec('vosk') is not None and validate_model(str(model_path()))
    ocr=bool(ocr_executable())
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


def recognize_photo(data_url: str, layout: str = 'sparse'):
    if layout not in ('sparse', 'block', 'line'):
        raise HTTPException(422, 'Selecciona placa, bloque o línea de texto.')
    executable=ocr_executable()
    if not executable: raise HTTPException(503,'OCR local no disponible. La fotografía se conserva como adjunto; instala Tesseract para leer etiquetas.')
    try:
        available = subprocess.run([executable, *ocr_data_args(), '--list-langs'], capture_output=True,
            text=True, encoding='utf-8', timeout=5,
            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        installed = set(available.stdout.splitlines()[1:])
        requested = os.environ.get('OCR_LANGUAGES', '').strip()
        languages = requested or '+'.join(lang for lang in ('spa', 'eng', 'por') if lang in installed)
        if available.returncode != 0 or not languages or any(lang not in installed for lang in languages.split('+')):
            raise HTTPException(503, 'Faltan los idiomas OCR configurados. Instala español (spa) e inglés (eng) o ajusta OCR_LANGUAGES.')
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise HTTPException(503, 'No se pudo consultar los idiomas de Tesseract local.') from exc
    try:
        header,encoded=data_url.split(',',1)
        if header not in ('data:image/png;base64','data:image/jpeg;base64'): raise ValueError()
        data=base64.b64decode(encoded,validate=True)
        if not data or len(data)>2*1024*1024: raise ValueError()
        if not (data.startswith(b'\x89PNG\r\n\x1a\n') or data.startswith(b'\xff\xd8')): raise ValueError()
    except (ValueError,TypeError) as exc: raise HTTPException(422,'Usa una fotografía PNG/JPEG de menos de 2 MB.') from exc
    with tempfile.TemporaryDirectory(prefix='inventory-ocr-') as directory:
        source=Path(directory)/'label-ocr.png'
        prepare_photo_for_ocr(data, source)
        try:
            result=subprocess.run([executable, *ocr_data_args(), str(source),'stdout','-l',languages,'--psm',{'sparse':'11','block':'6','line':'7'}[layout]],capture_output=True,text=True,encoding='utf-8',timeout=40,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        except (OSError,subprocess.TimeoutExpired) as exc: raise HTTPException(503,'OCR local no respondió; conserva el adjunto y escribe los datos.') from exc
        if result.returncode!=0: raise HTTPException(422,'No se pudo leer la fotografía con los idiomas OCR instalados.')
        text=result.stdout.strip()
        if not text: raise HTTPException(422,'No se encontró texto legible. No se inventaron datos.')
        return {'text':text[:8000],'source':'photograph','requiresConfirmation':True,'local':True,
                'languages':languages.split('+'),'layout':layout,'truncated':len(text)>8000,
                'preprocessed':True}
