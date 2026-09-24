from collections.abc import Sequence
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus
from app.models.patient import Patient
from app.models.therapist import Therapist
from app.schemas.appointment import AppointmentCreate, AppointmentOut
from app.services.scheduling import add_minutes

router = APIRouter(prefix="/appointments", tags=["appointments"])


def get_appointment_or_404(db: DbSession, appointment_id: int) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
    return appointment


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
    patient = db.get(Patient, payload.patient_id)
    if patient is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That patient does not exist")

    therapist = db.get(Therapist, payload.therapist_id)
    if therapist is None or not therapist.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That therapist is not available")

    clash = db.scalar(
        select(Appointment).where(
            Appointment.therapist_id == payload.therapist_id,
            Appointment.appt_date == payload.appt_date,
            Appointment.start_time == payload.start_time,
            Appointment.status != AppointmentStatus.cancelled,
        )
    )
    if clash:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{therapist.full_name} is already booked at that time",
        )

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
    db.commit()
    db.refresh(appointment)
    return appointment


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: int, db: DbSession, user: CurrentUser) -> Appointment:
    return get_appointment_or_404(db, appointment_id)
