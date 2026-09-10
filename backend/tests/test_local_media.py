import io
import unittest
import wave
from unittest.mock import patch
from fastapi import HTTPException
from app.services.local_media import transcribe, recognize_photo, validate_model
from app.services.follow_up import validated_questions
from app.schemas.equipment import EquipmentExtracted
from app.schemas.follow_up import FollowUpCandidate

class LocalMediaTests(unittest.TestCase):
    def test_invalid_audio_never_reaches_model(self):
        with self.assertRaises(HTTPException) as error: transcribe(b'not audio')
        self.assertEqual(error.exception.status_code,415)
        audio=io.BytesIO()
        with wave.open(audio,'wb') as stream:
            stream.setnchannels(2);stream.setsampwidth(2);stream.setframerate(44100);stream.writeframes(b'\0'*400)
        with self.assertRaises(HTTPException) as error: transcribe(audio.getvalue())
        self.assertEqual(error.exception.status_code,415)
    def test_missing_ocr_is_explicit(self):
        with patch('app.services.local_media.shutil.which',return_value=None):
            with self.assertRaises(HTTPException) as error: recognize_photo('data:image/png;base64,AAA=')
        self.assertEqual(error.exception.status_code,503)
        self.assertFalse(validate_model('/nonexistent/local/model'))
    def test_followup_prioritizes_quantity_and_skips_known_brand(self):
        items=[EquipmentExtracted(modality='Ultrasound',manufacturer='Philips') for _ in range(6)]
        bad=FollowUpCandidate(equipment_index=0,field='manufacturer',question='Marca?')
        questions=validated_questions(items,'Creo que hay unos seis ultrasonidos Philips.',[bad])
        self.assertEqual(len(questions),2)
        self.assertEqual(questions[0].field,'quantity')
        self.assertNotIn('manufacturer',[q.field for q in questions])
        self.assertEqual(validated_questions(items,'Dos CT Philips.',[],['0:age'])[0].field,'age')
