"""Staff may read billing and the therapist roster, but may not change either."""

import pytest
from starlette.testclient import TestClient

from app.models.therapist import Therapist
from app.models.user import User
from tests.conftest import sign_in

THERAPIST_PAYLOAD = {
    "full_name": "Rajen Shakya",
    "specialty": "Paediatric physio",
    "start_time": "11:00:00",
    "end_time": "16:00:00",
}


def test_staff_can_read_but_not_write_therapists(
    client: TestClient, staff: User, therapist: Therapist
) -> None:
    sign_in(client, staff.email, "staff123")

    assert client.get("/api/v1/therapists").status_code == 200
    assert client.post("/api/v1/therapists", json=THERAPIST_PAYLOAD).status_code == 403
    assert (
        client.patch(f"/api/v1/therapists/{therapist.id}", json={"specialty": "x"}).status_code
        == 403
    )
    assert client.delete(f"/api/v1/therapists/{therapist.id}").status_code == 403


def test_staff_can_read_but_not_write_billing(client: TestClient, staff: User, patient) -> None:
    sign_in(client, staff.email, "staff123")
    invoice = {"patient_id": patient.id, "service": "Initial assessment", "amount": "1500.00"}

    assert client.get("/api/v1/invoices").status_code == 200
    assert client.post("/api/v1/invoices", json=invoice).status_code == 403


def test_staff_still_runs_the_front_desk(
    client: TestClient, staff: User, therapist: Therapist
) -> None:
    sign_in(client, staff.email, "staff123")

    created = client.post(
        "/api/v1/patients",
        json={
            "full_name": "Kiran Magar",
            "phone": "9841223344",
            "age": 19,
            "gender": "male",
            "condition": "Hamstring strain",
        },
    )
    assert created.status_code == 201
    assert client.get("/api/v1/dashboard/summary").status_code == 200


@pytest.mark.parametrize("path", ["/api/v1/therapists", "/api/v1/invoices"])
def test_admin_may_write_where_staff_may_not(
    client: TestClient, admin: User, patient, path: str
) -> None:
    sign_in(client, admin.email, "admin123")

    payload = (
        THERAPIST_PAYLOAD
        if path.endswith("therapists")
        else {"patient_id": patient.id, "service": "Initial assessment", "amount": "1500.00"}
    )
    assert client.post(path, json=payload).status_code == 201
