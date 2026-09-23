from collections.abc import Sequence

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.models.enums import InvoiceStatus
from app.models.invoice import Invoice
from app.models.patient import Patient
from app.models.therapist import Therapist
from app.schemas.patient import PatientCreate, PatientOut, PatientUpdate

router = APIRouter(prefix="/patients", tags=["patients"])


def get_patient_or_404(db: DbSession, patient_id: int) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    return patient


def check_therapist(db: DbSession, therapist_id: int | None) -> None:
    if therapist_id is None:
        return
    therapist = db.get(Therapist, therapist_id)
    if therapist is None or not therapist.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That therapist does not exist")


@router.get("", response_model=list[PatientOut])
def list_patients(db: DbSession, user: CurrentUser) -> Sequence[Patient]:
    stmt = select(Patient).order_by(Patient.created_at.desc())
    # unique() because the assigned therapist is joined eagerly and would
    # otherwise duplicate rows
    return db.scalars(stmt).unique().all()


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, db: DbSession, user: CurrentUser) -> Patient:
    check_therapist(db, payload.assigned_therapist_id)
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, db: DbSession, user: CurrentUser) -> Patient:
    return get_patient_or_404(db, patient_id)


@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: int, payload: PatientUpdate, db: DbSession, user: CurrentUser
) -> Patient:
    patient = get_patient_or_404(db, patient_id)

    # exclude_unset so an omitted field is left alone rather than nulled out
    changes = payload.model_dump(exclude_unset=True)
    if "assigned_therapist_id" in changes:
        check_therapist(db, changes["assigned_therapist_id"])

    for field, value in changes.items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: int, db: DbSession, user: CurrentUser) -> None:
    patient = get_patient_or_404(db, patient_id)

    # appointments go with the patient, but a real invoice must not be orphaned.
    # void ones are dead paperwork so they do not block the delete.
    billed = db.scalar(
        select(func.count())
        .select_from(Invoice)
        .where(Invoice.patient_id == patient_id, Invoice.status != InvoiceStatus.void)
    )
    if billed:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This patient has {billed} invoice(s) on record and cannot be deleted",
        )

    db.delete(patient)
    db.commit()
