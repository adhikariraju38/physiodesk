from datetime import time

from sqlalchemy import String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Therapist(Base, TimestampMixin):
    __tablename__ = "therapists"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    specialty: Mapped[str] = mapped_column(String(120))

    # the therapist's normal day. per date changes live in a separate table.
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    slot_duration_min: Mapped[int] = mapped_column(default=45)

    # soft delete. removing the row would take their appointment history with it
    is_active: Mapped[bool] = mapped_column(default=True)
