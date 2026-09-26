from collections.abc import Sequence
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus
from app.models.therapist import Therapist, TherapistOverride, TherapistWorkingDay
from app.schemas.therapist import (
    OverrideOut,
    OverrideUpsert,
    TherapistCreate,
    TherapistOut,
    TherapistUpdate,
)

router = APIRouter(prefix="/therapists", tags=["therapists"])


def get_therapist_or_404(db: DbSession, therapist_id: int) -> Therapist:
    therapist = db.get(Therapist, therapist_id)
    if therapist is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Therapist not found")
    return therapist


def set_working_days(therapist: Therapist, weekdays: list[int]) -> None:
    """Replace the whole set rather than diffing it, there are at most seven rows."""
    therapist.working_days = [TherapistWorkingDay(weekday=day) for day in weekdays]


@router.get("", response_model=list[TherapistOut])
def list_therapists(
    db: DbSession,
    user: CurrentUser,
    active: Annotated[bool | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=80)] = None,
) -> Sequence[Therapist]:
    stmt = select(Therapist).order_by(Therapist.full_name)
    if active is not None:
        stmt = stmt.where(Therapist.is_active.is_(active))
    if search:
        stmt = stmt.where(Therapist.full_name.ilike(f"%{search.strip()}%"))
    return db.scalars(stmt).all()


@router.post("", response_model=TherapistOut, status_code=status.HTTP_201_CREATED)
def create_therapist(payload: TherapistCreate, db: DbSession, admin: AdminUser) -> Therapist:
    fields = payload.model_dump()
    weekdays = fields.pop("working_days")

    therapist = Therapist(**fields)
    set_working_days(therapist, weekdays)
    db.add(therapist)
    db.commit()
    db.refresh(therapist)
    return therapist


@router.get("/{therapist_id}", response_model=TherapistOut)
def get_therapist(therapist_id: int, db: DbSession, user: CurrentUser) -> Therapist:
    return get_therapist_or_404(db, therapist_id)


@router.patch("/{therapist_id}", response_model=TherapistOut)
def update_therapist(
    therapist_id: int, payload: TherapistUpdate, db: DbSession, admin: AdminUser
) -> Therapist:
    therapist = get_therapist_or_404(db, therapist_id)
    changes = payload.model_dump(exclude_unset=True)

    if "working_days" in changes:
        set_working_days(therapist, changes.pop("working_days"))

    for field, value in changes.items():
        setattr(therapist, field, value)

    # only one side of the working day may have been sent, so the check has to
    # run against the merged values rather than the payload
    if therapist.start_time >= therapist.end_time:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "start_time must be earlier than end_time"
        )

    db.commit()
    db.refresh(therapist)
    return therapist


@router.delete("/{therapist_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_therapist(therapist_id: int, db: DbSession, admin: AdminUser) -> None:
    """Soft delete.

    Dropping the row would take their appointment history with it, so a removed
    therapist is only taken off the roster and out of the scheduling grid. Their
    diary has to be cleared first, otherwise patients silently lose a session.
    """
    therapist = get_therapist_or_404(db, therapist_id)

    upcoming = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.therapist_id == therapist_id,
            Appointment.status != AppointmentStatus.cancelled,
            Appointment.appt_date >= date.today(),
        )
    )
    if upcoming:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{therapist.full_name} still has {upcoming} upcoming appointment(s). "
            "Reschedule or cancel them first.",
        )

    therapist.is_active = False
    db.commit()


@router.get("/{therapist_id}/overrides", response_model=list[OverrideOut])
def list_overrides(
    therapist_id: int,
    db: DbSession,
    user: CurrentUser,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> Sequence[TherapistOverride]:
    get_therapist_or_404(db, therapist_id)

    stmt = (
        select(TherapistOverride)
        .where(TherapistOverride.therapist_id == therapist_id)
        .order_by(TherapistOverride.on_date)
    )
    if date_from:
        stmt = stmt.where(TherapistOverride.on_date >= date_from)
    if date_to:
        stmt = stmt.where(TherapistOverride.on_date <= date_to)
    return db.scalars(stmt).all()


@router.put("/{therapist_id}/overrides", response_model=OverrideOut)
def upsert_override(
    therapist_id: int, payload: OverrideUpsert, db: DbSession, admin: AdminUser
) -> TherapistOverride:
    """One override per therapist per date, so setting the same day twice edits it."""
    get_therapist_or_404(db, therapist_id)

    override = db.scalar(
        select(TherapistOverride).where(
            TherapistOverride.therapist_id == therapist_id,
            TherapistOverride.on_date == payload.on_date,
        )
    )
    if override is None:
        override = TherapistOverride(therapist_id=therapist_id, on_date=payload.on_date)
        db.add(override)

    override.is_day_off = payload.is_day_off
    override.start_time = payload.start_time
    override.end_time = payload.end_time
    override.note = payload.note

    db.commit()
    db.refresh(override)
    return override


@router.delete("/{therapist_id}/overrides/{on_date}", status_code=status.HTTP_204_NO_CONTENT)
def clear_override(therapist_id: int, on_date: date, db: DbSession, admin: AdminUser) -> None:
    override = db.scalar(
        select(TherapistOverride).where(
            TherapistOverride.therapist_id == therapist_id,
            TherapistOverride.on_date == on_date,
        )
    )
    if override is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No override set for that date")
    db.delete(override)
    db.commit()
