import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import app


class UserTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, APP_DATABASE_PATH=str(Path(self.temp.name) / 'inventory.sqlite3'))
        self.env.start()
        self.client = TestClient(app)
        self.payload = {'first_name': 'Aramys', 'last_name': 'Cedeno', 'cedula': '8-123-456', 'email': 'aramys@example.com', 'phone': '6000-0000', 'password': '123'}

    def tearDown(self):
        self.client.close(); self.env.stop(); self.temp.cleanup()

    def test_register_hash_login_and_visit_collaborator(self):
        response = self.client.post('/users/register', json=self.payload)
        self.assertEqual(response.status_code, 201, response.text)
        user = response.json()
        self.assertEqual(user['role'], 'field')
        self.assertNotIn('password_hash', user); self.assertNotIn('password_salt', user)
        with closing(sqlite3.connect(os.environ['APP_DATABASE_PATH'])) as db:
            password_hash, salt = db.execute('SELECT password_hash,password_salt FROM users').fetchone()
        self.assertNotEqual(password_hash, '123'); self.assertTrue(salt)
        self.assertEqual(self.client.post('/users/login', json={'identifier': self.payload['email'], 'password': '123'}).status_code, 200)
        self.assertEqual(self.client.post('/users/login', json={'identifier': self.payload['cedula'], 'password': '123'}).status_code, 200)
        self.assertEqual(self.client.post('/users/login', json={'identifier': self.payload['email'], 'password': 'bad'}).status_code, 401)
        self.assertEqual(self.client.post('/users/register', json=self.payload).status_code, 409)
        alternate = {**self.payload, 'email': 'other@example.com'}
        self.assertEqual(self.client.post('/users/register', json=alternate).status_code, 409)
        visit = {'id': 'visit-user', 'hospitalId': 'HOSP-001', 'hospital': 'Hospital Santo Tomás', 'area': '', 'region': 'Panamá', 'startedAt': '2026-01-01T00:00:00Z', 'completedAt': '2026-01-01T01:00:00Z', 'collaboratorId': user['id'], 'observations': [{'id': 'obs', 'captureMode': 'chat', 'originalText': 'Equipo', 'equipment': [{'id': 'eq', 'type': 'MRI'}]}]}
        saved = self.client.put('/visits/visit-user', json=visit)
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()['collaborator']['name'], 'Aramys Cedeno')
        legacy = {**visit, 'id': 'visit-legacy', 'collaboratorId': None}
        self.assertIsNone(self.client.put('/visits/visit-legacy', json=legacy).json()['collaborator'])
