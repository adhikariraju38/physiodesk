from starlette.testclient import TestClient

from app.core.cookies import ACCESS_COOKIE, REFRESH_COOKIE
from app.models.user import User
from tests.conftest import sign_in


def test_login_sets_both_cookies(client: TestClient, admin: User) -> None:
    response = client.post(
        "/api/v1/auth/login", json={"email": admin.email, "password": "admin123"}
    )

    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    assert ACCESS_COOKIE in response.cookies
    assert REFRESH_COOKIE in response.cookies


def test_wrong_password_and_unknown_email_look_identical(client: TestClient, admin: User) -> None:
    wrong = client.post("/api/v1/auth/login", json={"email": admin.email, "password": "nope123"})
    missing = client.post(
        "/api/v1/auth/login", json={"email": "ghost@physiodesk.com", "password": "admin123"}
    )

    assert wrong.status_code == missing.status_code == 401
    assert wrong.json() == missing.json()


def test_me_needs_a_session(client: TestClient, admin: User) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401

    sign_in(client, admin.email, "admin123")
    assert client.get("/api/v1/auth/me").json()["email"] == admin.email


def test_refresh_rotates_the_token(client: TestClient, admin: User) -> None:
    sign_in(client, admin.email, "admin123")
    first = client.cookies[REFRESH_COOKIE]

    assert client.post("/api/v1/auth/refresh").status_code == 200
    assert client.cookies[REFRESH_COOKIE] != first


def test_replaying_a_spent_token_kills_the_whole_session(client: TestClient, admin: User) -> None:
    sign_in(client, admin.email, "admin123")
    spent = client.cookies[REFRESH_COOKIE]
    client.post("/api/v1/auth/refresh")

    replay = client.post("/api/v1/auth/refresh", cookies={REFRESH_COOKIE: spent})
    assert replay.status_code == 401

    # the token handed out a moment ago is gone too, not just the replayed one
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_logout_revokes_the_refresh_token(client: TestClient, admin: User) -> None:
    sign_in(client, admin.email, "admin123")
    assert client.post("/api/v1/auth/logout").status_code == 204
    assert client.post("/api/v1/auth/refresh").status_code == 401
