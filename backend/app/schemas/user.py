from pydantic import BaseModel, Field, field_validator


class UserRegistration(BaseModel):
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
    cedula: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3, max_length=254)
    phone: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=3, max_length=256)

    @field_validator('first_name', 'last_name', 'cedula', 'phone', 'email')
    @classmethod
    def required_trimmed(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('Este campo es obligatorio')
        return value.lower() if value == value and '@' in value else value

    @field_validator('email')
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.lower()
        local, _, domain = value.partition('@')
        if not local or not domain or '.' not in domain or domain.startswith('.') or domain.endswith('.'):
            raise ValueError('Correo electrónico inválido')
        return value


class UserLogin(BaseModel):
    identifier: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=256)

    @field_validator('identifier')
    @classmethod
    def trimmed_identifier(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('Correo o cédula requerido')
        return value
