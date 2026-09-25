from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.invoice import Invoice

INVOICE_PREFIX = "INV"


def next_invoice_number(db: Session, issued: date) -> str:
    """Numbers like INV-2026-0007, restarting the count every year.

    Read off the highest number already issued that year instead of keeping a
    counter somewhere, so restoring a backup cannot hand the same number out
    twice. Two invoices raised in the same instant can still collide, which is
    what the unique column and the retry in the endpoint are for.
    """
    prefix = f"{INVOICE_PREFIX}-{issued.year}-"

    latest = db.scalar(
        select(func.max(Invoice.invoice_number)).where(Invoice.invoice_number.like(f"{prefix}%"))
    )
    following = int(latest.removeprefix(prefix)) + 1 if latest else 1

    return f"{prefix}{following:04d}"


def line_total(amount: Decimal, discount: Decimal) -> Decimal:
    return amount - discount
