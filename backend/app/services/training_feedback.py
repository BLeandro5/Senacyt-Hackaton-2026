"""Append review packets locally; no inference, network, or online learning."""
import hashlib
import json
from datetime import datetime, timezone


def save_training_feedback(db, observation):
    if (not observation.analysis or observation.analysis.original_text != observation.originalText
            or not all(item.reviewed for item in observation.equipment)):
        return
    prediction = [item.model_dump() for item in observation.analysis.equipment]
    corrected = [item.model_dump(include={'type', 'brand', 'model', 'configuration',
                                          'estimatedAge', 'status', 'fieldStatuses', 'quantityStatus'})
                 for item in observation.equipment]
    packet = [observation.originalText, prediction, corrected]
    encoded = json.dumps(packet, ensure_ascii=False, sort_keys=True)
    # Retry-safe and independent of visit IDs. Retain distinct correction versions.
    identifier = hashlib.sha256(encoded.encode('utf-8')).hexdigest()
    db.execute('''INSERT OR IGNORE INTO training_feedback
        (id,observation_text,original_prediction,human_corrected_output,created_at)
        VALUES (?,?,?,?,?)''', (identifier, observation.originalText,
        json.dumps(prediction, ensure_ascii=False), json.dumps(corrected, ensure_ascii=False),
        datetime.now(timezone.utc).isoformat()))
