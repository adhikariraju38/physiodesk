from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.cookies import ACCESS_COOKIE
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    access_token: str | None = Cookie(default=None, alias=ACCESS_COOKIE),
) -> User:
    if not access_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    claims = decode_access_token(access_token)
    if claims is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")

    user_id = claims.get("sub")
    user = db.get(User, int(user_id)) if user_id else None

    # the token outlives changes to the account, so trust the row over the claims
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role is not UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This action is restricted to admins")
    return user


AdminUser = Annotated[User, Depends(require_admin)]
