import io
import unittest
import wave
import base64
from types import SimpleNamespace
from unittest.mock import patch
from fastapi import HTTPException
from app.services.local_media import transcribe, recognize_photo, validate_model
from app.services.follow_up import validated_questions
from app.schemas.equipment import EquipmentExtracted
from app.schemas.follow_up import FollowUpCandidate

class LocalMediaTests(unittest.TestCase):
    def test_ocr_uses_installed_languages_and_selected_layout(self):
        photo = 'data:image/png;base64,' + base64.b64encode(b'\x89PNG\r\n\x1a\nfixture').decode()
        with patch('app.services.local_media.ocr_executable', return_value='tesseract'), patch('app.services.local_media.prepare_photo_for_ocr'), patch(
            'app.services.local_media.subprocess.run', side_effect=[
                SimpleNamespace(returncode=0, stdout='Languages:\neng\nspa\n'),
                SimpleNamespace(returncode=0, stdout='Philips\nModel: ABC123'),
            ]) as run, patch.dict('os.environ', {'OCR_LANGUAGES': ''}):
            result = recognize_photo(photo, 'block')
        self.assertEqual(result['text'], 'Philips\nModel: ABC123')
        self.assertEqual(result['languages'], ['spa', 'eng'])
        self.assertTrue(result['requiresConfirmation'])
        command = run.call_args.args[0]
        self.assertEqual(command[command.index('--psm') + 1], '6')

    def test_ocr_missing_language_does_not_run_recognition(self):
        with patch('app.services.local_media.ocr_executable', return_value='tesseract'), patch(
            'app.services.local_media.subprocess.run', return_value=SimpleNamespace(returncode=0, stdout='Languages:\neng\n')) as run, patch.dict('os.environ', {'OCR_LANGUAGES': 'spa'}):
            with self.assertRaises(HTTPException) as error: recognize_photo('data:image/png;base64,AAA=')
        self.assertEqual(error.exception.status_code, 503)
        self.assertEqual(run.call_count, 1)

    def test_invalid_audio_never_reaches_model(self):
        with self.assertRaises(HTTPException) as error: transcribe(b'not audio')
        self.assertEqual(error.exception.status_code,415)
        audio=io.BytesIO()
        with wave.open(audio,'wb') as stream:
            stream.setnchannels(2);stream.setsampwidth(2);stream.setframerate(44100);stream.writeframes(b'\0'*400)
        with self.assertRaises(HTTPException) as error: transcribe(audio.getvalue())
        self.assertEqual(error.exception.status_code,415)
    def test_missing_ocr_is_explicit(self):
        with patch('app.services.local_media.ocr_executable',return_value=None):
            with self.assertRaises(HTTPException) as error: recognize_photo('data:image/png;base64,AAA=')
        self.assertEqual(error.exception.status_code,503)
        self.assertFalse(validate_model('/nonexistent/local/model'))
    def test_followup_prioritizes_quantity_and_skips_known_brand(self):
        items=[EquipmentExtracted(modality='Ultrasound',manufacturer='Philips') for _ in range(6)]
        bad=FollowUpCandidate(equipment_index=0,field='manufacturer',question='Marca?')
        questions=validated_questions(items,'Creo que hay unos seis ultrasonidos Philips.',[bad])
        self.assertGreater(len(questions),2)
        self.assertEqual(questions[0].field,'quantity')
        self.assertNotIn('manufacturer',[q.field for q in questions])
        self.assertEqual(validated_questions(items,'Dos CT Philips.',[],['0:age'])[0].field,'age')
