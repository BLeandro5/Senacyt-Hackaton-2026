import hashlib
import hmac
import secrets
import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.db.database import get_db
from app.schemas.user import UserLogin, UserRegistration

router = APIRouter(prefix='/users', tags=['Users'])
ITERATIONS = 210_000


def password_hash(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS).hex()


def public_user(row):
    return {
        'id': row['id'], 'firstName': row['first_name'], 'lastName': row['last_name'],
        'name': f"{row['first_name']} {row['last_name']}", 'cedula': row['cedula'],
        'email': row['email'], 'phone': row['phone'], 'role': row['role'],
    }


@router.post('/register', status_code=201)
def register(payload: UserRegistration, db=Depends(get_db)):
    salt = secrets.token_bytes(16)
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    try:
        with db:
            db.execute('''INSERT INTO users
                (id, first_name, last_name, cedula, email, phone, password_hash, password_salt, role, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'field', ?)''',
                (user_id, payload.first_name, payload.last_name, payload.cedula, payload.email,
                 payload.phone, password_hash(payload.password, salt), salt.hex(), created_at))
    except sqlite3.IntegrityError as exc:
        message = 'Ya existe un colaborador con ese correo.' if 'users.email' in str(exc) else 'Ya existe un colaborador con esa cédula.'
        raise HTTPException(409, message) from exc
    return public_user(db.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone())


@router.post('/login')
def login(payload: UserLogin, db=Depends(get_db)):
    identifier = payload.identifier.lower() if '@' in payload.identifier else payload.identifier
    field = 'email' if '@' in identifier else 'cedula'
    row = db.execute(f'SELECT * FROM users WHERE {field}=?', (identifier,)).fetchone()
    if row is None or not hmac.compare_digest(password_hash(payload.password, bytes.fromhex(row['password_salt'])), row['password_hash']):
        raise HTTPException(401, 'Correo/cédula o contraseña incorrectos.')
    return public_user(row)
