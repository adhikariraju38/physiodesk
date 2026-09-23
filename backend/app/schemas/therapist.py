from datetime import time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TherapistBrief(BaseModel):
    """Just enough to label a therapist inside another record."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    specialty: str


class TherapistCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    specialty: str = Field(min_length=2, max_length=120)
    start_time: time
    end_time: time
    slot_duration_min: int = Field(default=45, ge=15, le=180)

    @model_validator(mode="after")
    def check_day_makes_sense(self) -> "TherapistCreate":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be earlier than end_time")
        return self


class TherapistUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    specialty: str | None = Field(default=None, min_length=2, max_length=120)
    start_time: time | None = None
    end_time: time | None = None
    slot_duration_min: int | None = Field(default=None, ge=15, le=180)
    is_active: bool | None = None


class TherapistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    specialty: str
    start_time: time
    end_time: time
    slot_duration_min: int
    is_active: bool
