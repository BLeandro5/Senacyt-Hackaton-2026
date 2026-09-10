import sqlite3
import unittest
import test_storage


class CatalogGeographyTests(unittest.TestCase):
    setUp = test_storage.StorageTests.setUp
    tearDown = test_storage.StorageTests.tearDown

    def test_catalog_country_is_filled_without_overwriting_existing_country(self):
        rows = self.client.get('/hospitals').json()
        self.assertEqual(next(h for h in rows if h['id'] == 'HOSP-001')['country'], 'Panamá')
        db = sqlite3.connect(self.path)
        try:
            with db:
                db.execute('UPDATE hospitals SET country=? WHERE id=?', ('Country explicitly edited', 'HOSP-001'))
        finally:
            db.close()
        rows = self.client.get('/hospitals').json()
        self.assertEqual(next(h for h in rows if h['id'] == 'HOSP-001')['country'], 'Country explicitly edited')
