from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.invoice import Invoice


def next_invoice_number(db: Session) -> str:
    count = db.scalar(select(func.count()).select_from(Invoice)) or 0
    return f"INV-{count + 1:04d}"


def line_total(amount: Decimal, discount: Decimal) -> Decimal:
    return amount - discount
