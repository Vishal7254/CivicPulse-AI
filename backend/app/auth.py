from .database import SessionLocal
from . import models

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


SECRET_KEY = "change-this-to-a-random-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(
        plain_password,
        hashed_password
    )


def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


def decode_access_token(token: str):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("user_id")

        if user_id is None:
            return None

        return user_id

    except JWTError:
        return None


def get_current_user(token: str = Depends(oauth2_scheme)):
    user_id = decode_access_token(token)

    if user_id is None:
        return None

    db = SessionLocal()

    user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    db.close()

    return user