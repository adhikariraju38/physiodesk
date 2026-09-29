from collections.abc import Sequence
from datetime import date, datetime, time
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession
from app.core import clock
from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus
from app.models.patient import Patient
from app.models.therapist import Therapist, TherapistOverride
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.services.scheduling import add_minutes, day_slots

router = APIRouter(prefix="/appointments", tags=["appointments"])

RESCHEDULE_FIELDS = {"therapist_id", "appt_date", "start_time"}


def get_appointment_or_404(db: DbSession, appointment_id: int) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
    return appointment


def get_bookable_therapist(db: DbSession, therapist_id: int) -> Therapist:
    therapist = db.get(Therapist, therapist_id)
    if therapist is None or not therapist.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That therapist is not available")
    return therapist


def taken_message(therapist: Therapist) -> str:
    return f"{therapist.full_name} is already booked at that time"


def assert_slot_free(
    db: DbSession,
    therapist: Therapist,
    appt_date: date,
    start_time: time,
    exclude_id: int | None = None,
) -> None:
    stmt = select(Appointment).where(
        Appointment.therapist_id == therapist.id,
        Appointment.appt_date == appt_date,
        Appointment.start_time == start_time,
        Appointment.status != AppointmentStatus.cancelled,
    )
    if exclude_id is not None:
        stmt = stmt.where(Appointment.id != exclude_id)

    if db.scalar(stmt) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, taken_message(therapist))


def assert_therapist_is_working(
    db: DbSession, therapist: Therapist, appt_date: date, start_time: time
) -> None:
    """Refuse anything that is not a real slot on that therapist's day.

    Without this you can book someone at 3am, or on a day they are off, just by
    posting the time straight to the api instead of clicking the grid.
    """
    override = db.scalar(
        select(TherapistOverride).where(
            TherapistOverride.therapist_id == therapist.id,
            TherapistOverride.on_date == appt_date,
        )
    )
    slots = day_slots(therapist, appt_date, override)

    if slots is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"{therapist.full_name} is not working on {appt_date:%d %b %Y}",
        )

    if not any(slot.start == start_time for slot in slots):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"{start_time:%H:%M} is not one of {therapist.full_name}'s slots that day",
        )


def assert_session_has_started(appointment: Appointment) -> None:
    """A session cannot be marked done before it has happened.

    Without this the front desk can tick off next week's diary, which then
    counts towards "patients seen today" the moment that day arrives.
    """
    starts_at = datetime.combine(appointment.appt_date, appointment.start_time)

    if starts_at > clock.wall_now():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"That session is not until {starts_at:%d %b %Y at %H:%M}, so it cannot be "
            "marked completed yet",
        )


def commit_or_conflict(db: DbSession, therapist: Therapist) -> None:
    """Commit, turning a slot collision from the unique index into a clean 409."""
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, taken_message(therapist)) from exc


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    db: DbSession,
    user: CurrentUser,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    therapist_id: Annotated[int | None, Query()] = None,
    patient_id: Annotated[int | None, Query()] = None,
    status_filter: Annotated[AppointmentStatus | None, Query(alias="status")] = None,
) -> Sequence[Appointment]:
    stmt = select(Appointment).order_by(Appointment.appt_date.desc(), Appointment.start_time.desc())

    if date_from:
        stmt = stmt.where(Appointment.appt_date >= date_from)
    if date_to:
        stmt = stmt.where(Appointment.appt_date <= date_to)
    if therapist_id:
        stmt = stmt.where(Appointment.therapist_id == therapist_id)
    if patient_id:
        stmt = stmt.where(Appointment.patient_id == patient_id)
    if status_filter is not None:
        stmt = stmt.where(Appointment.status == status_filter)

    return db.scalars(stmt).unique().all()


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def book_appointment(payload: AppointmentCreate, db: DbSession, user: CurrentUser) -> Appointment:
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That patient does not exist")

    therapist = get_bookable_therapist(db, payload.therapist_id)
    assert_therapist_is_working(db, therapist, payload.appt_date, payload.start_time)
    assert_slot_free(db, therapist, payload.appt_date, payload.start_time)

    appointment = Appointment(
        patient_id=payload.patient_id,
        therapist_id=payload.therapist_id,
        appt_date=payload.appt_date,
        start_time=payload.start_time,
        # the length comes from the therapist, the client does not get to pick it
        end_time=add_minutes(payload.start_time, therapist.slot_duration_min),
        payment_method=payload.payment_method,
        notes=payload.notes,
        created_by_user_id=user.id,
    )
    db.add(appointment)
    commit_or_conflict(db, therapist)
    db.refresh(appointment)
    return appointment


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: int, db: DbSession, user: CurrentUser) -> Appointment:
    return get_appointment_or_404(db, appointment_id)


@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int, payload: AppointmentUpdate, db: DbSession, user: CurrentUser
) -> Appointment:
    appointment = get_appointment_or_404(db, appointment_id)
    changes = payload.model_dump(exclude_unset=True)

    moving = RESCHEDULE_FIELDS & changes.keys()
    if moving and appointment.status is AppointmentStatus.cancelled:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This appointment was cancelled, book a new one instead of moving it",
        )

    for field, value in changes.items():
        setattr(appointment, field, value)

    if appointment.status is AppointmentStatus.completed:
        assert_session_has_started(appointment)

    therapist = get_bookable_therapist(db, appointment.therapist_id)

    if moving:
        # the slot length can differ between therapists, so recalculate the end
        appointment.end_time = add_minutes(appointment.start_time, therapist.slot_duration_min)
        assert_therapist_is_working(db, therapist, appointment.appt_date, appointment.start_time)
        assert_slot_free(
            db,
            therapist,
            appointment.appt_date,
            appointment.start_time,
            exclude_id=appointment.id,
        )

    commit_or_conflict(db, therapist)
    db.refresh(appointment)
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_appointment(appointment_id: int, db: DbSession, user: CurrentUser) -> None:
    """Cancel rather than delete, the session still belongs in the patient's history."""
    appointment = get_appointment_or_404(db, appointment_id)
    appointment.status = AppointmentStatus.cancelled
    db.commit()
