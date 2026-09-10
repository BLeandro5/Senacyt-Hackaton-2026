import unittest
from datetime import datetime, timezone
from app.services.reliability import reliability


class ReliabilityTests(unittest.TestCase):
    def score(self, **changes):
        params = dict(modality='CT',quantity_status=None,manufacturer='Philips',model=None,age=None,
                      age_estimated=False,configuration=None,condition=None,reviewed=False,
                      observed_at=datetime.now(timezone.utc).isoformat())
        return reliability(**(params | changes))

    def test_quality_review_corroboration_and_conflict(self):
        baseline = self.score()['score']
        self.assertGreater(self.score(model='Incisive',age='5',quantity_status='exact')['score'], baseline)
        self.assertGreater(self.score(reviewed=True)['score'], baseline)
        self.assertGreater(self.score(corroborators=1)['score'], baseline)
        self.assertLess(self.score(conflict=True)['score'], baseline)
        self.assertLess(self.score(quantity_status='estimated')['score'], self.score(quantity_status='exact')['score'])

    def test_unknown_and_future_dates_do_not_earn_freshness(self):
        for date in ('', 'bad', '2999-01-01T00:00:00Z'):
            result = self.score(observed_at=date)
            self.assertEqual(result['breakdown']['freshness'], 0)
            self.assertEqual(result['freshness'], 'Unknown')
