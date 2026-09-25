from starlette.testclient import TestClient


def test_health_is_open(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_everything_else_needs_a_session(client: TestClient) -> None:
    assert client.get("/api/v1/patients").status_code == 401
    assert client.get("/api/v1/dashboard/summary").status_code == 401
