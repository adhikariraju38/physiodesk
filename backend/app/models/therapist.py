from datetime import date, time

from sqlalchemy import Date, ForeignKey, SmallInteger, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

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

    working_days: Mapped[list["TherapistWorkingDay"]] = relationship(
        back_populates="therapist",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="TherapistWorkingDay.weekday",
    )
    overrides: Mapped[list["TherapistOverride"]] = relationship(
        back_populates="therapist",
        cascade="all, delete-orphan",
    )

    @property
    def weekday_numbers(self) -> list[int]:
        """Working days as plain ints, which is the shape the api hands out."""
        return sorted(row.weekday for row in self.working_days)


class TherapistWorkingDay(Base):
    """Which days of the week a therapist normally comes in."""

    __tablename__ = "therapist_working_days"
    __table_args__ = (UniqueConstraint("therapist_id", "weekday", name="uq_working_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    therapist_id: Mapped[int] = mapped_column(
        ForeignKey("therapists.id", ondelete="CASCADE"), index=True
    )
    # 0 is monday, so it lines up with date.weekday() and needs no translation
    weekday: Mapped[int] = mapped_column(SmallInteger)

    therapist: Mapped[Therapist] = relationship(back_populates="working_days")


class TherapistOverride(Base):
    """A one off change to a therapist's day: taken off, or different hours."""

    __tablename__ = "therapist_overrides"
    __table_args__ = (UniqueConstraint("therapist_id", "on_date", name="uq_override_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    therapist_id: Mapped[int] = mapped_column(
        ForeignKey("therapists.id", ondelete="CASCADE"), index=True
    )
    on_date: Mapped[date] = mapped_column(Date, index=True)
    is_day_off: Mapped[bool] = mapped_column(default=False)

    # null on both means "keep the therapist's usual hours for that day"
    start_time: Mapped[time | None] = mapped_column(Time)
    end_time: Mapped[time | None] = mapped_column(Time)
    note: Mapped[str | None] = mapped_column(String(160))

    therapist: Mapped[Therapist] = relationship(back_populates="overrides")
