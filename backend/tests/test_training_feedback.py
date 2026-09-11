import sqlite3
import unittest
from app.db.database import SCHEMA
from app.schemas.visit import ObservationRecord
from app.services.training_feedback import save_training_feedback


class TrainingFeedbackTests(unittest.TestCase):
    def test_review_packets_are_idempotent_and_preserve_versions(self):
        with sqlite3.connect(':memory:') as db:
            db.executescript(SCHEMA)
            observation = ObservationRecord(id='o', captureMode='chat', originalText='Un CT Philips.',
                analysis={'original_text': 'Un CT Philips.', 'equipment': [{'modality':'CT', 'manufacturer':'Siemens'}]},
                equipment=[{'id':'e', 'type':'CT', 'brand':'Philips', 'reviewed': False}])
            save_training_feedback(db, observation)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM training_feedback').fetchone()[0], 0)
            observation.equipment[0].reviewed = True
            save_training_feedback(db, observation)
            save_training_feedback(db, observation)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM training_feedback').fetchone()[0], 1)
            observation.equipment[0].model = 'Incisive'
            save_training_feedback(db, observation)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM training_feedback').fetchone()[0], 2)
            self.assertEqual(db.execute('SELECT DISTINCT review_status FROM training_feedback').fetchone()[0], 'pending')
