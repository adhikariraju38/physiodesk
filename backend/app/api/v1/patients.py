from collections.abc import Sequence

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.patient import Patient
from app.schemas.patient import PatientOut

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=list[PatientOut])
def list_patients(db: DbSession, user: CurrentUser) -> Sequence[Patient]:
    stmt = select(Patient).order_by(Patient.created_at.desc())
    # unique() because the assigned therapist is joined eagerly and would
    # otherwise duplicate rows
    return db.scalars(stmt).unique().all()
