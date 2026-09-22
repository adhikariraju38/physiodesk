from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_refresh_token, new_refresh_token
from app.models.refresh_token import RefreshToken
from app.models.user import User


class RefreshError(Exception):
    """Raised when a refresh token cannot be exchanged for a new session."""


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


def rotate_refresh_token(db: Session, raw: str) -> tuple[User, str]:
    """Burn the token that was presented and hand back a fresh one."""
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw)))
    if row is None:
        raise RefreshError("Not authenticated")

    now = datetime.now(UTC)

    if row.revoked_at is not None:
        # this one was already swapped for a newer token, so somebody is
        # replaying an old value. assume the cookie leaked and kill every
        # session this user has rather than just refusing the request.
        revoke_all_for_user(db, row.user_id)
        raise RefreshError("Session expired, please sign in again")

    if row.expires_at <= now:
        raise RefreshError("Session expired, please sign in again")

    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        raise RefreshError("This account has been disabled")

    row.revoked_at = now
    new_raw = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(new_raw),
            expires_at=now + timedelta(days=settings.refresh_token_days),
        )
    )
    db.commit()
    return user, new_raw


def revoke_refresh_token(db: Session, raw: str) -> None:
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw)))
    if row is not None and row.revoked_at is None:
        row.revoked_at = datetime.now(UTC)
        db.commit()


def revoke_all_for_user(db: Session, user_id: int) -> None:
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    db.commit()


def revoke_family(db: Session, raw: str) -> None:
    """Sign the owner of this token out of every device. Powers logout everywhere."""
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw)))
    if row is not None:
        revoke_all_for_user(db, row.user_id)
