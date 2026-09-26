import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.core.config import settings

JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    # checkpw raises on a malformed hash, which would 500 the login endpoint
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


# pyjwt types its key parameter as a union that includes the asymmetric key
# classes from `cryptography`, which we do not install because everything here
# is HS256. that leaves one arm of the union unresolved, hence the two ignores.
def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(UTC)
    return jwt.encode(  # pyright: ignore[reportUnknownMemberType]
        {
            "sub": str(user_id),
            "role": role,
            "iat": now,
            "exp": now + timedelta(minutes=settings.access_token_minutes),
        },
        settings.secret_key,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Returns the claims, or None if the token is expired, tampered with or junk."""
    try:
        return jwt.decode(  # pyright: ignore[reportUnknownMemberType]
            token, settings.secret_key, algorithms=[JWT_ALGORITHM]
        )
    except jwt.PyJWTError:
        return None


def new_refresh_token() -> str:
    # deliberately not a jwt. we need to be able to revoke one specific token,
    # and a signed token stays valid until it expires no matter what we do.
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    # sha256 is enough here, the token is 48 random bytes so there is no
    # dictionary to run against it. bcrypt would only make every refresh slow.
    return hashlib.sha256(token.encode()).hexdigest()
