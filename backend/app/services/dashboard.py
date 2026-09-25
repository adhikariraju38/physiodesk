"""Everything on the dashboard is computed here, nothing is stored or cached.

The numbers have to agree with the calendar, so on duty and open slots are
worked out from the same slot builder the scheduling grid uses.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, InvoiceStatus
from app.models.invoice import Invoice
from app.models.patient import Patient
from app.models.therapist import Therapist, TherapistOverride
from app.schemas.dashboard import (
    CapacitySlot,
    DashboardStats,
    DashboardSummary,
    TherapistCapacity,
)
from app.schemas.therapist import TherapistBrief
from app.services.scheduling import day_slots


def build_summary(db: Session, recent_limit: int = 5) -> DashboardSummary:
    now = datetime.now()
    today = now.date()

    therapists = db.scalars(
        select(Therapist).where(Therapist.is_active.is_(True)).order_by(Therapist.full_name)
    ).all()

    overrides = {
        row.therapist_id: row
        for row in db.scalars(
            select(TherapistOverride).where(TherapistOverride.on_date == today)
        ).all()
    }

    todays_appointments = (
        db.scalars(
            select(Appointment).where(
                Appointment.appt_date == today,
                Appointment.status != AppointmentStatus.cancelled,
            )
        )
        .unique()
        .all()
    )
    booked = {(appt.therapist_id, appt.start_time): appt for appt in todays_appointments}

    # counted once per patient, and only for sessions that have already started
    seen_today = len({a.patient_id for a in todays_appointments if a.start_time <= now.time()})

    # follows the database timezone, which the api container shares via TZ
    revenue_today = db.scalar(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status == InvoiceStatus.paid,
            func.date(Invoice.paid_at) == today,
        )
    ) or Decimal("0.00")

    capacity: list[TherapistCapacity] = []
    open_slots = 0

    for therapist in therapists:
        slots = day_slots(therapist, today, overrides.get(therapist.id))
        if slots is None:
            continue

        rows: list[CapacitySlot] = []
        taken = 0

        for slot in slots:
            appointment = booked.get((therapist.id, slot.start))
            if appointment is not None:
                taken += 1
            elif slot.start > now.time():
                # a free slot that has already passed is not bookable any more
                open_slots += 1

            rows.append(
                CapacitySlot(
                    start_time=slot.start,
                    is_booked=appointment is not None,
                    patient_name=appointment.patient.full_name if appointment else None,
                )
            )

        capacity.append(
            TherapistCapacity(
                therapist=TherapistBrief.model_validate(therapist),
                booked=taken,
                free=len(slots) - taken,
                slots=rows,
            )
        )

    recent_patients = (
        db.scalars(select(Patient).order_by(Patient.created_at.desc()).limit(recent_limit))
        .unique()
        .all()
    )

    return DashboardSummary(
        date=today,
        stats=DashboardStats(
            patients_seen_today=seen_today,
            therapists_on_duty=len(capacity),
            revenue_today=revenue_today,
            open_slots_today=open_slots,
        ),
        capacity=capacity,
        recent_patients=list(recent_patients),
    )
