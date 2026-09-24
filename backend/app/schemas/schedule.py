from datetime import date, time

from pydantic import BaseModel, ConfigDict

from app.models.enums import AppointmentStatus, PaymentMethod
from app.schemas.patient import PatientBrief
from app.schemas.therapist import TherapistBrief


class SlotAppointment(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: AppointmentStatus
    payment_method: PaymentMethod | None
    notes: str | None
    patient: PatientBrief


class SlotOut(BaseModel):
    start_time: time
    end_time: time
    is_booked: bool
    appointment: SlotAppointment | None = None


class TherapistDay(BaseModel):
    therapist: TherapistBrief
    on_duty: bool
    slot_minutes: int
    # whatever the admin typed on the override, e.g. "back from 1pm"
    note: str | None = None
    slots: list[SlotOut]


class DaySchedule(BaseModel):
    date: date
    therapists: list[TherapistDay]
