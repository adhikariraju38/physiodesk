from pydantic import BaseModel, ConfigDict


class TherapistBrief(BaseModel):
    """Just enough to label a therapist inside another record."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    specialty: str
