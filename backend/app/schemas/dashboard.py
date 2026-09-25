from datetime import date, time
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.patient import PatientOut
from app.schemas.therapist import TherapistBrief


class DashboardStats(BaseModel):
    patients_seen_today: int
    therapists_on_duty: int
    revenue_today: Decimal
    open_slots_today: int


class CapacitySlot(BaseModel):
    start_time: time
    is_booked: bool
    patient_name: str | None = None


class TherapistCapacity(BaseModel):
    therapist: TherapistBrief
    booked: int
    free: int
    slots: list[CapacitySlot]


class DashboardSummary(BaseModel):
    date: date
    stats: DashboardStats
    capacity: list[TherapistCapacity]
    recent_patients: list[PatientOut]
