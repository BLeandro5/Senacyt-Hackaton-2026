import unittest
import test_storage
from scripts.seed_demo import main
from app.services.installation_year import installation_year


class InventorySummaryTests(unittest.TestCase):
    setUp = test_storage.StorageTests.setUp
    tearDown = test_storage.StorageTests.tearDown

    def test_international_seed_is_optional_and_idempotent(self):
        from scripts.seed_international import main as international
        international()
        international()
        data = self.client.get('/dashboard').json()['intelligence']
        self.assertEqual(data['summary']['assets'], 30)
        self.assertEqual(data['summary']['evidence'], 50)
        self.assertEqual(len(data['geography']['country']), 10)
        self.assertTrue(data['summary']['conflicts'] > 0)

    def test_dashboard_counts_canonical_assets_separately(self):
        main()
        response = self.client.get('/dashboard')
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()['intelligence']
        self.assertEqual(data['summary']['assets'], 5)
        self.assertEqual(data['summary']['evidence'], 7)
        self.assertEqual(data['summary']['hospitals'], 3)
        self.assertEqual(sum(x['assets'] for x in data['byModality']), 5)
        self.assertEqual(sum(x['evidence'] for x in data['geography']['country']), 7)

    def test_installation_year_is_scoped_and_estimate_is_labelled(self):
        note = 'Un MRI instalado en 2018. Un CT instalado en 2020.'
        date = '2026-09-10T00:00:00Z'
        self.assertEqual(installation_year(note, None, date, 'MRI'), (2018, 'Reported'))
        self.assertEqual(installation_year(note, None, date, 'CT', reviewed=True), (2020, 'Confirmed'))
        self.assertEqual(installation_year('', '8 años', date, 'MRI'), (2018, 'Estimated'))
        self.assertEqual(installation_year('', 0, date, 'MRI'), (2026, 'Estimated'))
        self.assertEqual(installation_year('', None, date, 'MRI'), (None, 'Unknown'))
        self.assertEqual(installation_year('MRI instalado en 2030', None, date, 'MRI'), (None, 'Unknown'))
