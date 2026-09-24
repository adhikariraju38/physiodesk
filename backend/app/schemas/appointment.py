from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AppointmentStatus, PaymentMethod
from app.schemas.patient import PatientBrief
from app.schemas.therapist import TherapistBrief


class AppointmentCreate(BaseModel):
    patient_id: int
    therapist_id: int
    appt_date: date
    start_time: time
    payment_method: PaymentMethod | None = None
    notes: str | None = Field(default=None, max_length=2000)


class AppointmentUpdate(BaseModel):
    """Moving any of therapist, date or time counts as a reschedule."""

    therapist_id: int | None = None
    appt_date: date | None = None
    start_time: time | None = None
    status: AppointmentStatus | None = None
    payment_method: PaymentMethod | None = None
    notes: str | None = Field(default=None, max_length=2000)


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    appt_date: date
    start_time: time
    end_time: time
    status: AppointmentStatus
    payment_method: PaymentMethod | None
    notes: str | None
    patient: PatientBrief
    therapist: TherapistBrief
    created_at: datetime
