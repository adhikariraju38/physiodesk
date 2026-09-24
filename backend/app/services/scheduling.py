"""Turning a therapist's working pattern into the concrete slots of one day.

Everything the calendar and the booking endpoint know about availability comes
from here, so the grid and the conflict check can never drift apart.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from app.models.therapist import Therapist, TherapistOverride


@dataclass(frozen=True)
class Slot:
    start: time
    end: time


@dataclass(frozen=True)
class DayHours:
    start: time
    end: time
    slot_minutes: int


def effective_hours(
    therapist: Therapist, day: date, override: TherapistOverride | None
) -> DayHours | None:
    """The hours a therapist actually works on one date, or None if they are off.

    An override row with no times on it means the therapist is in that day even
    though it is not one of their usual working days, on their normal hours.
    """
    if not therapist.is_active:
        return None

    if override is not None:
        if override.is_day_off:
            return None
        if override.start_time and override.end_time:
            return DayHours(override.start_time, override.end_time, therapist.slot_duration_min)
        return DayHours(therapist.start_time, therapist.end_time, therapist.slot_duration_min)

    if day.weekday() not in {row.weekday for row in therapist.working_days}:
        return None

    return DayHours(therapist.start_time, therapist.end_time, therapist.slot_duration_min)


def build_slots(hours: DayHours) -> list[Slot]:
    """Cut a working day into back to back slots.

    A leftover tail shorter than one slot is dropped rather than offered as a
    short appointment.
    """
    slots: list[Slot] = []
    step = timedelta(minutes=hours.slot_minutes)

    # date.min is a throwaway, it is only here so the times can be added to
    cursor = datetime.combine(date.min, hours.start)
    closing = datetime.combine(date.min, hours.end)

    while cursor + step <= closing:
        following = cursor + step
        slots.append(Slot(cursor.time(), following.time()))
        cursor = following

    return slots


def day_slots(
    therapist: Therapist, day: date, override: TherapistOverride | None
) -> list[Slot] | None:
    """Convenience wrapper: None when the therapist is off, otherwise their slots."""
    hours = effective_hours(therapist, day, override)
    return None if hours is None else build_slots(hours)
