from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Gender, PatientStatus
from app.schemas.therapist import TherapistBrief


class PatientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=6, max_length=32)
    age: int = Field(ge=0, le=120)
    gender: Gender
    address: str | None = Field(default=None, max_length=255)
    condition: str = Field(min_length=2, max_length=160)
    package: str | None = Field(default=None, max_length=80)
    assigned_therapist_id: int | None = None
    status: PatientStatus = PatientStatus.active


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: str
    age: int
    gender: Gender
    address: str | None
    condition: str
    package: str | None
    status: PatientStatus
    assigned_therapist: TherapistBrief | None
    created_at: datetime
