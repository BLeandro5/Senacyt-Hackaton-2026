import json
import os
from pathlib import Path
import sqlite3


SCHEMA = '''
CREATE TABLE IF NOT EXISTS hospitals (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT NOT NULL, city TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS visits (
 id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL REFERENCES hospitals(id),
 area TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT NOT NULL,
 collaborator_id TEXT REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
 cedula TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL,
 password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'field', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS observations (
 visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
 id TEXT NOT NULL, title TEXT NOT NULL, capture_mode TEXT NOT NULL,
 captured_at TEXT NOT NULL, original_text TEXT NOT NULL,
 photo_name TEXT, photo_data TEXT, position INTEGER NOT NULL,
 PRIMARY KEY(visit_id, id)
);
CREATE TABLE IF NOT EXISTS equipment (
 visit_id TEXT NOT NULL, observation_id TEXT NOT NULL, id TEXT NOT NULL,
 modality TEXT NOT NULL, manufacturer TEXT NOT NULL, model TEXT NOT NULL,
 configuration TEXT NOT NULL, estimated_age TEXT NOT NULL, condition TEXT NOT NULL,
 resolution TEXT, matched_equipment_id TEXT, position INTEGER NOT NULL,
 PRIMARY KEY(visit_id, observation_id, id),
 FOREIGN KEY(visit_id, observation_id) REFERENCES observations(visit_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS visits_hospital ON visits(hospital_id);
'''


def connect():
    target = Path(os.environ.get('APP_DATABASE_PATH', Path(__file__).resolve().parents[2] / 'data' / 'inventory.sqlite3'))
    target.parent.mkdir(parents=True, exist_ok=True)
    # FastAPI can execute a synchronous dependency and its handler on different
    # pool threads. Each request still owns and closes its own connection.
    db = sqlite3.connect(target, timeout=15, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    db.executescript(SCHEMA)
    visit_columns = {row['name'] for row in db.execute('PRAGMA table_info(visits)')}
    if 'collaborator_id' not in visit_columns:
        db.execute('ALTER TABLE visits ADD COLUMN collaborator_id TEXT')
    db.execute('CREATE INDEX IF NOT EXISTS visits_collaborator ON visits(collaborator_id)')
    catalog = json.loads(Path(__file__).with_name('hospitals.json').read_text(encoding='utf-8'))
    db.executemany('INSERT OR IGNORE INTO hospitals(id,name,region,city) VALUES (:id,:name,:region,:city)', catalog)
    db.commit()
    return db


def get_db():
    db = connect()
    try:
        yield db
    finally:
        db.close()
