from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus
from app.models.therapist import Therapist, TherapistOverride
from app.schemas.schedule import DaySchedule, SlotAppointment, SlotOut, TherapistDay
from app.schemas.therapist import TherapistBrief
from app.services.scheduling import day_slots

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("", response_model=DaySchedule)
def get_day_schedule(
    db: DbSession,
    user: CurrentUser,
    on_date: Annotated[date | None, Query(alias="date")] = None,
) -> DaySchedule:
    """One column per active therapist, with their slots for the chosen day."""
    day = on_date or date.today()

    therapists = db.scalars(
        select(Therapist).where(Therapist.is_active.is_(True)).order_by(Therapist.full_name)
    ).all()

    overrides = {
        row.therapist_id: row
        for row in db.scalars(
            select(TherapistOverride).where(TherapistOverride.on_date == day)
        ).all()
    }

    booked = {
        (appt.therapist_id, appt.start_time): appt
        for appt in db.scalars(
            select(Appointment).where(
                Appointment.appt_date == day,
                Appointment.status != AppointmentStatus.cancelled,
            )
        )
        .unique()
        .all()
    }

    columns: list[TherapistDay] = []

    for therapist in therapists:
        override = overrides.get(therapist.id)
        brief = TherapistBrief.model_validate(therapist)
        slots = day_slots(therapist, day, override)

        if slots is None:
            columns.append(
                TherapistDay(
                    therapist=brief,
                    on_duty=False,
                    slot_minutes=therapist.slot_duration_min,
                    note=override.note if override else None,
                    slots=[],
                )
            )
            continue

        rendered: list[SlotOut] = []
        for slot in slots:
            appt = booked.pop((therapist.id, slot.start), None)
            rendered.append(
                SlotOut(
                    start_time=slot.start,
                    end_time=slot.end,
                    is_booked=appt is not None,
                    appointment=SlotAppointment.model_validate(appt) if appt else None,
                )
            )

        # anything still booked for this therapist sits outside today's slot grid,
        # usually because their hours were changed after the booking was made.
        # show it anyway, an appointment that disappears from the calendar is worse
        # than one that sits slightly off the grid.
        stragglers = [key for key in booked if key[0] == therapist.id]
        for key in stragglers:
            appt = booked.pop(key)
            rendered.append(
                SlotOut(
                    start_time=appt.start_time,
                    end_time=appt.end_time,
                    is_booked=True,
                    appointment=SlotAppointment.model_validate(appt),
                )
            )
        rendered.sort(key=lambda s: s.start_time)

        columns.append(
            TherapistDay(
                therapist=brief,
                on_duty=True,
                slot_minutes=therapist.slot_duration_min,
                note=override.note if override else None,
                slots=rendered,
            )
        )

    return DaySchedule(date=day, therapists=columns)
