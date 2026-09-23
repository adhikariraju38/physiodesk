from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TherapistBrief(BaseModel):
    """Just enough to label a therapist inside another record."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    specialty: str


def clean_weekdays(value: list[int]) -> list[int]:
    for day in value:
        if not 0 <= day <= 6:
            raise ValueError("weekdays run 0 (monday) to 6 (sunday)")
    return sorted(set(value))


class TherapistCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    specialty: str = Field(min_length=2, max_length=120)
    start_time: time
    end_time: time
    slot_duration_min: int = Field(default=45, ge=15, le=180)
    working_days: list[int] = Field(default=[0, 1, 2, 3, 4])

    _tidy_days = field_validator("working_days")(clean_weekdays)

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
    working_days: list[int] | None = None
    is_active: bool | None = None

    _tidy_days = field_validator("working_days")(
        lambda v: clean_weekdays(v) if v is not None else v
    )


class TherapistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    specialty: str
    start_time: time
    end_time: time
    slot_duration_min: int
    is_active: bool
    working_days: list[int]

    @field_validator("working_days", mode="before")
    @classmethod
    def flatten_working_days(cls, value: object) -> object:
        # the orm hands over TherapistWorkingDay rows, the api only wants numbers
        if isinstance(value, list) and value and not isinstance(value[0], int):
            return sorted(row.weekday for row in value)
        return value


class OverrideUpsert(BaseModel):
    on_date: date
    is_day_off: bool = False
    start_time: time | None = None
    end_time: time | None = None
    note: str | None = Field(default=None, max_length=160)

    @model_validator(mode="after")
    def check_combination(self) -> "OverrideUpsert":
        if self.is_day_off and (self.start_time or self.end_time):
            raise ValueError("a day off cannot also carry custom hours")
        if (self.start_time is None) != (self.end_time is None):
            raise ValueError("custom hours need both a start and an end")
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValueError("start_time must be earlier than end_time")
        return self


class OverrideOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    therapist_id: int
    on_date: date
    is_day_off: bool
    start_time: time | None
    end_time: time | None
    note: str | None
