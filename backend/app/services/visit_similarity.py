"""Deterministic comparison of a new note with finalized visit evidence."""
import re
from difflib import SequenceMatcher

from app.ai.age_grounding import normalize


STOP_WORDS = {
    'al', 'ante', 'bajo', 'con', 'contra', 'desde', 'durante', 'el', 'en', 'entre', 'es',
    'esta', 'este', 'fue', 'ha', 'hay', 'la', 'las', 'lo', 'los', 'para', 'por', 'que',
    'se', 'sin', 'un', 'una', 'unos', 'unas', 'y',
}


def tokens(text: str) -> set[str]:
    return {word for word in re.findall(r'\b[\w-]{2,}\b', normalize(text)) if word not in STOP_WORDS}


def similarity_percent(left: str, right: str) -> int:
    left_tokens, right_tokens = tokens(left), tokens(right)
    if not left_tokens or not right_tokens:
        return 0
    overlap = len(left_tokens & right_tokens) / len(left_tokens | right_tokens)
    sequence = SequenceMatcher(None, ' '.join(sorted(left_tokens)), ' '.join(sorted(right_tokens))).ratio()
    return round(100 * (0.7 * overlap + 0.3 * sequence))


def similar_visits(db, hospital_id: str, text: str, minimum: int = 35) -> list[dict]:
    best_by_visit: dict[str, dict] = {}
    rows = db.execute('''
        SELECT v.id AS visit_id, v.completed_at, o.id AS observation_id, o.original_text
        FROM visits v JOIN observations o ON o.visit_id=v.id
        WHERE v.hospital_id=? AND v.completed_at != ''
    ''', (hospital_id,))
    for row in rows:
        score = similarity_percent(text, row['original_text'])
        if score < minimum:
            continue
        candidate = dict(visitId=row['visit_id'], observationId=row['observation_id'],
                         completedAt=row['completed_at'], originalText=row['original_text'], similarity=score)
        existing = best_by_visit.get(row['visit_id'])
        if existing is None or candidate['similarity'] > existing['similarity']:
            best_by_visit[row['visit_id']] = candidate
    return sorted(best_by_visit.values(), key=lambda item: (-item['similarity'], item['completedAt']), reverse=False)
