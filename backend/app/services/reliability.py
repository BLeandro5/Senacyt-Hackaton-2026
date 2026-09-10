"""Deterministic, explainable reliability scoring; never model confidence."""
from datetime import datetime, timezone


def reliability(*, modality: str | None, quantity_status: str | None, manufacturer: str | None,
                model: str | None, age: str | None, age_estimated: bool, configuration: str | None,
                condition: str | None, reviewed: bool, observed_at: str, corroborators: int = 0,
                conflict: bool = False) -> dict:
    factors, quality = [], 0
    for value, points, label in ((modality, 10, 'modality'), (manufacturer, 8, 'manufacturer'),
                                 (model, 7, 'model'), (configuration, 3, 'configuration'), (condition, 3, 'condition')):
        if value: quality += points; factors.append(label)
    if quantity_status == 'exact': quality += 8; factors.append('exact_quantity')
    elif quantity_status == 'estimated': quality += 4; factors.append('estimated_quantity')
    if age: quality += 3 if age_estimated else 6; factors.append('estimated_age' if age_estimated else 'exact_age')
    quality = min(45, quality)
    try:
        date = datetime.fromisoformat(observed_at.replace('Z', '+00:00'))
        if date.tzinfo is None:
            date = date.replace(tzinfo=timezone.utc)
        days = (datetime.now(timezone.utc) - date).days
        if days < 0:
            days = None
    except (ValueError, TypeError):
        days = None
    freshness = 0 if days is None else 15 if days <= 30 else 10 if days <= 180 else 5 if days <= 365 else 0
    corroboration = 25 if corroborators >= 2 else 12 if corroborators == 1 else 0
    score = max(0, min(100, quality + (15 if reviewed else 5) + freshness + corroboration - (25 if conflict else 0)))
    return {'score': score, 'level': 'High' if score >= 75 else 'Medium' if score >= 50 else 'Low',
            'factors': factors, 'breakdown': {'informationQuality': quality, 'humanValidation': 15 if reviewed else 5,
                'freshness': freshness, 'corroboration': corroboration, 'conflictPenalty': -25 if conflict else 0},
            'daysSinceObservation': days,
            'freshness': 'Unknown' if days is None else 'Fresh' if days <= 180 else 'Aging' if days <= 365 else 'Stale'}
