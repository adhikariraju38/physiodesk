from sqlalchemy import ForeignKey, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import Gender, PatientStatus, pg_enum
from app.models.therapist import Therapist


class Patient(Base, TimestampMixin):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), index=True)
    phone: Mapped[str] = mapped_column(String(32), index=True)
    age: Mapped[int] = mapped_column(SmallInteger)
    gender: Mapped[Gender] = mapped_column(pg_enum(Gender, "gender"))
    address: Mapped[str | None] = mapped_column(String(255))
    condition: Mapped[str] = mapped_column(String(160))
    package: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[PatientStatus] = mapped_column(
        pg_enum(PatientStatus, "patient_status"), default=PatientStatus.active
    )

    # keep the patient if their therapist leaves, just drop the assignment
    assigned_therapist_id: Mapped[int | None] = mapped_column(
        ForeignKey("therapists.id", ondelete="SET NULL")
    )
    assigned_therapist: Mapped[Therapist | None] = relationship(lazy="joined")
