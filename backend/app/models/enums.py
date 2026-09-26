import enum

from sqlalchemy import Enum as SAEnum


class UserRole(enum.StrEnum):
    admin = "admin"
    staff = "staff"


class Gender(enum.StrEnum):
    male = "male"
    female = "female"
    other = "other"


class PatientStatus(enum.StrEnum):
    active = "active"
    completed = "completed"
    on_hold = "on_hold"


class AppointmentStatus(enum.StrEnum):
    booked = "booked"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class PaymentMethod(enum.StrEnum):
    cash = "cash"
    card = "card"
    online = "online"
    insurance = "insurance"


class InvoiceStatus(enum.StrEnum):
    paid = "paid"
    due = "due"
    void = "void"


def member_values(enum_cls: type[enum.Enum]) -> list[str]:
    return [str(member.value) for member in enum_cls]


def pg_enum(enum_cls: type[enum.Enum], name: str) -> SAEnum:
    """Postgres enum that stores the member value.

    Without values_callable sqlalchemy persists the member *name*, which only
    happens to work here because our names and values match. Being explicit
    means renaming a member later does not silently change what is in the db.
    """
    return SAEnum(enum_cls, name=name, values_callable=member_values)
