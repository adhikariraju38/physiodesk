from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, DbSession
from app.core.pagination import Page, Paging, paginate
from app.models.enums import InvoiceStatus, PatientStatus
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


def like_term(raw: str) -> str:
    """Wrap a search box value for ILIKE, escaping the wildcards first.

    Without this a patient typing % into the search box matches every row.
    """
    escaped = raw.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


@router.get("", response_model=Page[PatientOut])
def list_patients(
    db: DbSession,
    user: CurrentUser,
    paging: Paging,
    search: Annotated[str | None, Query(max_length=80)] = None,
    # aliased because `status` is already the fastapi status module in here
    status_filter: Annotated[PatientStatus | None, Query(alias="status")] = None,
) -> Page[Any]:
    stmt = select(Patient).order_by(Patient.created_at.desc())

    if search:
        term = like_term(search)
        stmt = stmt.where(or_(Patient.full_name.ilike(term), Patient.phone.ilike(term)))
    if status_filter is not None:
        stmt = stmt.where(Patient.status == status_filter)

    return paginate(db, stmt, paging)


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
