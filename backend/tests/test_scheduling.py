from datetime import date, time, timedelta

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus
from app.models.patient import Patient
from app.models.therapist import Therapist, TherapistOverride
from app.models.user import User
from app.services.scheduling import DayHours, build_slots, effective_hours
from tests.conftest import sign_in

TOMORROW = date.today() + timedelta(days=1)


def booking(patient: Patient, therapist: Therapist, at: str = "09:00:00") -> dict[str, str | int]:
    return {
        "patient_id": patient.id,
        "therapist_id": therapist.id,
        "appt_date": TOMORROW.isoformat(),
        "start_time": at,
    }


def test_slots_fill_the_day_and_drop_a_short_tail() -> None:
    assert [s.start for s in build_slots(DayHours(time(9), time(12), 60))] == [
        time(9),
        time(10),
        time(11),
    ]
    # 09:00 to 11:30 only fits two whole hours, the last half hour is not offered
    assert len(build_slots(DayHours(time(9), time(11, 30), 60))) == 2


def test_a_day_off_override_beats_the_weekly_pattern(therapist: Therapist) -> None:
    assert effective_hours(therapist, TOMORROW, None) is not None

    off = TherapistOverride(is_day_off=True)
    assert effective_hours(therapist, TOMORROW, off) is None


def test_custom_hours_override_narrows_the_day(therapist: Therapist) -> None:
    late = TherapistOverride(is_day_off=False, start_time=time(11), end_time=time(12))
    hours = effective_hours(therapist, TOMORROW, late)

    assert hours is not None
    assert (hours.start, hours.end) == (time(11), time(12))


def test_booking_a_taken_slot_is_rejected(
    client: TestClient, admin: User, patient: Patient, therapist: Therapist
) -> None:
    sign_in(client, admin.email, "admin123")

    assert client.post("/api/v1/appointments", json=booking(patient, therapist)).status_code == 201

    clash = client.post("/api/v1/appointments", json=booking(patient, therapist))
    assert clash.status_code == 409
    assert therapist.full_name in clash.json()["detail"]


def test_cancelling_frees_the_slot_again(
    client: TestClient, admin: User, patient: Patient, therapist: Therapist
) -> None:
    sign_in(client, admin.email, "admin123")
    first = client.post("/api/v1/appointments", json=booking(patient, therapist)).json()

    assert client.delete(f"/api/v1/appointments/{first['id']}").status_code == 204
    assert client.post("/api/v1/appointments", json=booking(patient, therapist)).status_code == 201


@pytest.mark.parametrize("at", ["03:00:00", "09:30:00", "12:00:00"])
def test_times_outside_the_grid_are_refused(
    client: TestClient, admin: User, patient: Patient, therapist: Therapist, at: str
) -> None:
    sign_in(client, admin.email, "admin123")

    response = client.post("/api/v1/appointments", json=booking(patient, therapist, at))
    assert response.status_code == 422


def test_cannot_book_onto_a_day_off(
    client: TestClient, db: Session, admin: User, patient: Patient, therapist: Therapist
) -> None:
    db.add(TherapistOverride(therapist_id=therapist.id, on_date=TOMORROW, is_day_off=True))
    db.commit()
    sign_in(client, admin.email, "admin123")

    response = client.post("/api/v1/appointments", json=booking(patient, therapist))
    assert response.status_code == 422
    assert "not working" in response.json()["detail"]


def test_the_database_refuses_a_double_booking_on_its_own(
    db: Session, patient: Patient, therapist: Therapist
) -> None:
    """The api check can be raced, so the partial unique index is the real guard."""
    for _ in range(2):
        db.add(
            Appointment(
                patient_id=patient.id,
                therapist_id=therapist.id,
                appt_date=TOMORROW,
                start_time=time(9),
                end_time=time(10),
                status=AppointmentStatus.booked,
            )
        )

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_the_grid_shows_who_is_booked(
    client: TestClient, admin: User, patient: Patient, therapist: Therapist
) -> None:
    sign_in(client, admin.email, "admin123")
    client.post("/api/v1/appointments", json=booking(patient, therapist))

    column = client.get(f"/api/v1/schedule?date={TOMORROW}").json()["therapists"][0]
    booked = [slot for slot in column["slots"] if slot["is_booked"]]

    assert column["on_duty"] is True
    assert len(booked) == 1
    assert booked[0]["appointment"]["patient"]["full_name"] == patient.full_name


def test_a_session_cannot_be_completed_before_it_happens(
    client: TestClient, admin: User, patient: Patient, therapist: Therapist
) -> None:
    sign_in(client, admin.email, "admin123")
    booked = client.post("/api/v1/appointments", json=booking(patient, therapist)).json()

    early = client.patch(f"/api/v1/appointments/{booked['id']}", json={"status": "completed"})
    assert early.status_code == 422
    assert "not until" in early.json()["detail"]


def test_a_session_that_has_started_can_be_completed(
    client: TestClient, db: Session, admin: User, patient: Patient, therapist: Therapist
) -> None:
    sign_in(client, admin.email, "admin123")
    yesterday = date.today() - timedelta(days=1)

    db.add(
        Appointment(
            patient_id=patient.id,
            therapist_id=therapist.id,
            appt_date=yesterday,
            start_time=time(9),
            end_time=time(10),
            status=AppointmentStatus.booked,
        )
    )
    db.commit()
    existing = client.get(f"/api/v1/appointments?date_from={yesterday}").json()[0]

    done = client.patch(f"/api/v1/appointments/{existing['id']}", json={"status": "completed"})
    assert done.status_code == 200
    assert done.json()["status"] == "completed"
