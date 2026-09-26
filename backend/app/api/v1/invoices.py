from datetime import UTC, date, datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.core.pagination import Page, Paging, paginate
from app.models.appointment import Appointment
from app.models.enums import InvoiceStatus
from app.models.invoice import Invoice
from app.models.patient import Patient
from app.schemas.invoice import InvoiceCreate, InvoiceOut, InvoiceUpdate
from app.services.billing import line_total, next_invoice_number

router = APIRouter(prefix="/invoices", tags=["invoices"])


def get_invoice_or_404(db: DbSession, invoice_id: int) -> Invoice:
    invoice = db.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")
    return invoice


@router.get("", response_model=Page[InvoiceOut])
def list_invoices(
    db: DbSession,
    user: CurrentUser,
    paging: Paging,
    status_filter: Annotated[InvoiceStatus | None, Query(alias="status")] = None,
    patient_id: Annotated[int | None, Query()] = None,
) -> Page[Any]:
    stmt = select(Invoice).order_by(Invoice.issued_date.desc(), Invoice.id.desc())

    if status_filter is not None:
        stmt = stmt.where(Invoice.status == status_filter)
    if patient_id:
        stmt = stmt.where(Invoice.patient_id == patient_id)

    return paginate(db, stmt, paging)


@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(payload: InvoiceCreate, db: DbSession, admin: AdminUser) -> Invoice:
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That patient does not exist")

    if payload.appointment_id is not None:
        appointment = db.get(Appointment, payload.appointment_id)
        if appointment is None or appointment.patient_id != payload.patient_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "That appointment does not belong to this patient",
            )

    invoice = Invoice(
        patient_id=payload.patient_id,
        appointment_id=payload.appointment_id,
        service=payload.service,
        amount=payload.amount,
        discount=payload.discount,
        total=line_total(payload.amount, payload.discount),
        status=payload.status,
        payment_method=payload.payment_method,
        issued_date=payload.issued_date or date.today(),
        paid_at=datetime.now(UTC) if payload.status is InvoiceStatus.paid else None,
        created_by_user_id=admin.id,
    )
    # the number is picked from what is already in the table, so two invoices
    # raised at the same moment can land on the same one. retry rather than
    # failing the request.
    for _ in range(3):
        invoice.invoice_number = next_invoice_number(db, invoice.issued_date)
        db.add(invoice)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            continue
        db.refresh(invoice)
        return invoice

    raise HTTPException(
        status.HTTP_409_CONFLICT, "Could not allocate an invoice number, please try again"
    )


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, db: DbSession, user: CurrentUser) -> Invoice:
    return get_invoice_or_404(db, invoice_id)


@router.patch("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: int, payload: InvoiceUpdate, db: DbSession, admin: AdminUser
) -> Invoice:
    invoice = get_invoice_or_404(db, invoice_id)

    if invoice.status is InvoiceStatus.void:
        raise HTTPException(status.HTTP_409_CONFLICT, "A voided invoice cannot be edited")

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(invoice, field, value)

    if invoice.discount > invoice.amount:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "discount cannot be larger than the amount"
        )
    invoice.total = line_total(invoice.amount, invoice.discount)

    # the paid timestamp follows the status rather than being set by hand, so
    # "revenue collected today" can be trusted
    if invoice.status is InvoiceStatus.paid and invoice.paid_at is None:
        invoice.paid_at = datetime.now(UTC)
    elif invoice.status is not InvoiceStatus.paid:
        invoice.paid_at = None

    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def void_invoice(invoice_id: int, db: DbSession, admin: AdminUser) -> None:
    """Void instead of delete so the invoice numbers stay unbroken."""
    invoice = get_invoice_or_404(db, invoice_id)
    invoice.status = InvoiceStatus.void
    db.commit()
