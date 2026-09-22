from fastapi import APIRouter, Cookie, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.cookies import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, UserOut
from app.services.auth import (
    RefreshError,
    issue_refresh_token,
    revoke_family,
    revoke_refresh_token,
    rotate_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# the cookie name has an underscore in it, so it needs an explicit alias
RefreshCookie = Cookie(default=None, alias=REFRESH_COOKIE)


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: DbSession) -> User:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))

    # same error for an unknown email and a wrong password, otherwise the
    # response tells you which accounts exist
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been disabled")

    access = create_access_token(user.id, user.role)
    set_auth_cookies(response, access, issue_refresh_token(db, user))
    return user


@router.post("/refresh", response_model=UserOut)
def refresh(
    response: Response,
    db: DbSession,
    refresh_token: str | None = RefreshCookie,
) -> User:
    if not refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    try:
        user, new_raw = rotate_refresh_token(db, refresh_token)
    except RefreshError as exc:
        # the cookie is worthless now, clear it so the browser stops sending it
        clear_auth_cookies(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    set_auth_cookies(response, create_access_token(user.id, user.role), new_raw)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: DbSession,
    refresh_token: str | None = RefreshCookie,
) -> None:
    if refresh_token:
        revoke_refresh_token(db, refresh_token)
    clear_auth_cookies(response)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_everywhere(
    response: Response,
    db: DbSession,
    refresh_token: str | None = RefreshCookie,
) -> None:
    if refresh_token:
        revoke_family(db, refresh_token)
    clear_auth_cookies(response)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user
