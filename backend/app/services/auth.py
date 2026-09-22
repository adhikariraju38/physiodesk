from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_refresh_token, new_refresh_token
from app.models.refresh_token import RefreshToken
from app.models.user import User


def issue_refresh_token(db: Session, user: User) -> str:
    """Mint a refresh token, store its hash, hand the raw value back to the caller."""
    raw = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(raw),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
        )
    )
    db.commit()
    return raw
