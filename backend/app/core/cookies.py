from fastapi import Response

from app.core.config import settings

ACCESS_COOKIE = "pd_access"
REFRESH_COOKIE = "pd_refresh"
SESSION_FLAG_COOKIE = "pd_session"

# the refresh token never needs to leave the auth endpoints
REFRESH_COOKIE_PATH = "/api/v1/auth"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=settings.access_token_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=settings.refresh_token_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
    )
    # readable by javascript on purpose. it carries no authority at all, it only
    # lets next middleware redirect without a round trip to the api. every real
    # check still runs against the httponly cookies above.
    response.set_cookie(
        SESSION_FLAG_COOKIE,
        "1",
        max_age=settings.refresh_token_days * 86400,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)
    response.delete_cookie(SESSION_FLAG_COOKIE, path="/")
