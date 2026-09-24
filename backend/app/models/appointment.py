from datetime import date, time

from sqlalchemy import Date, ForeignKey, Index, Text, Time, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AppointmentStatus, PaymentMethod, pg_enum
from app.models.patient import Patient
from app.models.therapist import Therapist


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"
    __table_args__ = (
        # the service layer checks for a clash first, but two requests can both
        # pass that check before either one commits. this is the backstop.
        # cancelled rows are excluded so a freed slot can be booked again.
        Index(
            "uq_appointment_slot",
            "therapist_id",
            "appt_date",
            "start_time",
            unique=True,
            postgresql_where=text("status <> 'cancelled'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    therapist_id: Mapped[int] = mapped_column(ForeignKey("therapists.id", ondelete="RESTRICT"))

    appt_date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)

    status: Mapped[AppointmentStatus] = mapped_column(
        pg_enum(AppointmentStatus, "appointment_status"), default=AppointmentStatus.booked
    )
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        pg_enum(PaymentMethod, "payment_method")
    )
    notes: Mapped[str | None] = mapped_column(Text)

    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    patient: Mapped[Patient] = relationship(lazy="joined")
    therapist: Mapped[Therapist] = relationship(lazy="joined")
