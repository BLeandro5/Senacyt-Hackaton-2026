import unittest
import test_storage
from scripts.seed_demo import main


class SeedTests(unittest.TestCase):
    setUp=test_storage.StorageTests.setUp
    tearDown=test_storage.StorageTests.tearDown

    def test_seed_is_explicit_and_idempotent(self):
        self.assertEqual(self.client.get('/installed-equipment').json(), [])
        main()
        main()
        assets=self.client.get('/installed-equipment').json()
        self.assertEqual(len(assets),5)
        self.assertEqual(sum(a['evidenceCount'] for a in assets),7)
        self.assertEqual(len({a['hospital_id'] for a in assets}),3)
        self.assertTrue(any(a['hasConflict'] for a in assets))
        self.assertTrue(any(a['reliability']['freshness']=='Fresh' for a in assets))
        self.assertTrue(any(a['reliability']['freshness']=='Stale' for a in assets))
