"""Fill an empty database with a believable clinic week.

Run it after the migrations, with `python -m app.seed`. It wipes the app tables
first, so it can be run again whenever the data gets messy from clicking around.

The week is built around today unless `--date` says otherwise. That matters
because a dump seeded last week leaves today with an empty diary and a dashboard
full of zeros, which looks broken rather than quiet.

Appointments are placed by asking the scheduling service for each therapist's
real slots, which means the seeded diary can never contain a booking the app
would refuse to make itself.
"""

import argparse
import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import clock
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.appointment import Appointment
from app.models.enums import (
    AppointmentStatus,
    Gender,
    InvoiceStatus,
    PatientStatus,
    PaymentMethod,
    UserRole,
)
from app.models.invoice import Invoice
from app.models.patient import Patient
from app.models.therapist import Therapist, TherapistOverride, TherapistWorkingDay
from app.models.user import User
from app.services.billing import line_total
from app.services.scheduling import day_slots

# fixed so two people seeding the same checkout get the same clinic
RANDOM_SEED = 20260921

# order matters, children before parents
TABLES = (
    "invoices",
    "appointments",
    "therapist_overrides",
    "therapist_working_days",
    "patients",
    "therapists",
    "refresh_tokens",
    "users",
)

USERS = [
    ("admin@physiodesk.com", "Ramesh Adhikari", "admin123", UserRole.admin),
    ("staff@physiodesk.com", "Sujata Basnet", "staff123", UserRole.staff),
]

THERAPISTS = [
    ("Dr Anjali Gurung", "Musculoskeletal physio", time(9), time(17), 45, [0, 1, 2, 3, 4]),
    ("Dr Prakash Thapa", "Neurological rehab", time(10), time(18), 60, [0, 2, 4, 5]),
    ("Sabina Maharjan", "Sports injury", time(8), time(14), 30, [0, 1, 2, 3, 4, 5]),
    ("Rajen Shakya", "Paediatric physio", time(11), time(16), 45, [1, 3, 5]),
]

PATIENTS = [
    ("Anita Shrestha", "9841002211", 41, Gender.female, "Frozen shoulder", "10 sessions"),
    ("Bikash Rai", "9807334455", 29, Gender.male, "ACL reconstruction rehab", "16 sessions"),
    ("Chandra Lama", "9841778899", 55, Gender.male, "Sciatica", "8 sessions"),
    ("Deepa Karki", "9808112233", 34, Gender.female, "Postnatal back pain", "6 sessions"),
    ("Eliza Tamang", "9841556677", 23, Gender.female, "Ankle sprain", "4 sessions"),
    ("Gopal Neupane", "9802445566", 62, Gender.male, "Knee osteoarthritis", "12 sessions"),
    ("Hari Bhandari", "9841889900", 47, Gender.male, "Cervical spondylosis", "10 sessions"),
    ("Ishani Joshi", "9803667788", 31, Gender.female, "Plantar fasciitis", "6 sessions"),
    ("Kiran Magar", "9841223344", 19, Gender.male, "Hamstring strain", "4 sessions"),
    ("Laxmi Poudel", "9806990011", 68, Gender.female, "Stroke rehabilitation", "20 sessions"),
]

ADDRESSES = [
    "Baluwatar, Kathmandu",
    "Lagankhel, Lalitpur",
    "Maharajgunj, Kathmandu",
    "Jhamsikhel, Lalitpur",
    "Baneshwor, Kathmandu",
    "Suryabinayak, Bhaktapur",
]

SERVICES = [
    ("Initial assessment", Decimal("1500.00")),
    ("Manual therapy session", Decimal("1200.00")),
    ("Dry needling session", Decimal("1800.00")),
    ("Exercise therapy block", Decimal("2400.00")),
    ("Electrotherapy session", Decimal("900.00")),
]


def wipe(db: Session) -> None:
    db.execute(text(f"truncate {', '.join(TABLES)} restart identity cascade"))
    db.commit()


def create_users(db: Session) -> list[User]:
    users = [
        User(email=email, full_name=name, password_hash=hash_password(password), role=role)
        for email, name, password, role in USERS
    ]
    db.add_all(users)
    db.commit()
    return users


def create_therapists(db: Session, today: date) -> list[Therapist]:
    therapists: list[Therapist] = []
    for name, specialty, opens, closes, slot, weekdays in THERAPISTS:
        therapist = Therapist(
            full_name=name,
            specialty=specialty,
            start_time=opens,
            end_time=closes,
            slot_duration_min=slot,
            working_days=[TherapistWorkingDay(weekday=day) for day in weekdays],
        )
        therapists.append(therapist)
    db.add_all(therapists)
    db.commit()

    # one day off and one late start, so the override handling is visible
    # without having to create them by hand first
    db.add_all(
        [
            TherapistOverride(
                therapist_id=therapists[1].id,
                on_date=today + timedelta(days=3),
                is_day_off=True,
                note="Conference in Pokhara",
            ),
            TherapistOverride(
                therapist_id=therapists[2].id,
                on_date=today + timedelta(days=1),
                start_time=time(11),
                end_time=time(14),
                note="Clinic meeting in the morning",
            ),
        ]
    )
    db.commit()
    return therapists


def create_patients(db: Session, therapists: list[Therapist], rng: random.Random) -> list[Patient]:
    statuses = (
        [PatientStatus.active] * 6 + [PatientStatus.completed] * 2 + [PatientStatus.on_hold] * 2
    )
    rng.shuffle(statuses)

    patients = [
        Patient(
            full_name=name,
            phone=phone,
            age=age,
            gender=gender,
            address=rng.choice(ADDRESSES),
            condition=condition,
            package=package,
            status=status,
            assigned_therapist_id=rng.choice(therapists).id,
        )
        for (name, phone, age, gender, condition, package), status in zip(
            PATIENTS, statuses, strict=True
        )
    ]
    db.add_all(patients)
    db.commit()
    return patients


def create_appointments(
    db: Session,
    therapists: list[Therapist],
    patients: list[Patient],
    now: datetime,
    rng: random.Random,
) -> list[Appointment]:
    overrides: dict[tuple[int, date], TherapistOverride] = {
        (row.therapist_id, row.on_date): row for row in db.query(TherapistOverride).all()
    }
    appointments: list[Appointment] = []
    today = now.date()

    for offset in range(-7, 8):
        day = today + timedelta(days=offset)

        for therapist in therapists:
            slots = day_slots(therapist, day, overrides.get((therapist.id, day)))
            if not slots:
                continue

            # the odd quiet day, and never a full diary, so there is always
            # somewhere to book a new appointment from the calendar
            if rng.random() < 0.15:
                continue

            taken = max(1, round(len(slots) * rng.uniform(0.25, 0.5)))
            for slot in rng.sample(slots, k=taken):
                if offset < 0:
                    status = rng.choices(
                        [
                            AppointmentStatus.completed,
                            AppointmentStatus.no_show,
                            AppointmentStatus.cancelled,
                        ],
                        weights=[8, 1, 1],
                    )[0]
                elif offset == 0 and slot.start < now.time():
                    # a session earlier today has already happened, which is what
                    # puts numbers behind "patients seen" and "revenue collected"
                    status = rng.choices(
                        [AppointmentStatus.completed, AppointmentStatus.no_show],
                        weights=[9, 1],
                    )[0]
                else:
                    status = AppointmentStatus.booked

                appointments.append(
                    Appointment(
                        patient_id=rng.choice(patients).id,
                        therapist_id=therapist.id,
                        appt_date=day,
                        start_time=slot.start,
                        end_time=slot.end,
                        status=status,
                        payment_method=rng.choice(list(PaymentMethod)),
                    )
                )

    db.add_all(appointments)
    db.commit()
    return appointments


def create_invoices(db: Session, appointments: list[Appointment], rng: random.Random) -> int:
    billable = [a for a in appointments if a.status is AppointmentStatus.completed]
    issued = 0

    for index, appointment in enumerate(billable, start=1):
        # a few sessions are left unbilled, which is what the due filter is for
        if rng.random() < 0.15:
            continue

        service, amount = rng.choice(SERVICES)
        discount = Decimal("200.00") if rng.random() < 0.2 else Decimal("0.00")
        paid = rng.random() < 0.7

        issued += 1
        db.add(
            Invoice(
                invoice_number=f"INV-{appointment.appt_date.year}-{index:04d}",
                patient_id=appointment.patient_id,
                appointment_id=appointment.id,
                service=service,
                amount=amount,
                discount=discount,
                total=line_total(amount, discount),
                status=InvoiceStatus.paid if paid else InvoiceStatus.due,
                payment_method=appointment.payment_method if paid else None,
                issued_date=appointment.appt_date,
                paid_at=(
                    datetime.combine(appointment.appt_date, appointment.end_time).astimezone()
                    if paid
                    else None
                ),
            )
        )

    db.commit()
    return issued


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m app.seed",
        description="Wipe the app tables and fill them with a clinic week around a given day.",
    )
    parser.add_argument(
        "--date",
        dest="anchor",
        type=date.fromisoformat,
        metavar="YYYY-MM-DD",
        help="the day the week is built around, defaults to today",
    )
    return parser.parse_args(argv)


def run(anchor: date | None = None) -> None:
    rng = random.Random(RANDOM_SEED)

    # keep the wall clock time, so "the sessions earlier today are finished"
    # still holds whichever day the week is anchored to
    now = datetime.combine(anchor, clock.wall_now().time()) if anchor else clock.wall_now()

    with SessionLocal() as db:
        wipe(db)
        users = create_users(db)
        therapists = create_therapists(db, now.date())
        patients = create_patients(db, therapists, rng)
        appointments = create_appointments(db, therapists, patients, now, rng)
        invoices = create_invoices(db, appointments, rng)

    print(f"seeded a clinic week around {now:%d %b %Y}")
    print(f"        {len(users)} users, {len(therapists)} therapists, {len(patients)} patients")
    print(f"        {len(appointments)} appointments, {invoices} invoices")
    print()
    for email, _, password, role in USERS:
        print(f"  {role.value:<6} {email}  /  {password}")


if __name__ == "__main__":
    run(parse_args().anchor)
