from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import InvoiceStatus, PaymentMethod
from app.schemas.patient import PatientBrief

Money = Field(max_digits=10, decimal_places=2)


class InvoiceCreate(BaseModel):
    patient_id: int
    appointment_id: int | None = None
    service: str = Field(min_length=2, max_length=160)
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    discount: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=10, decimal_places=2)
    status: InvoiceStatus = InvoiceStatus.due
    payment_method: PaymentMethod | None = None
    # defaults to today in the endpoint, the client rarely needs to set it
    issued_date: date | None = None

    @model_validator(mode="after")
    def discount_fits(self) -> "InvoiceCreate":
        if self.discount > self.amount:
            raise ValueError("discount cannot be larger than the amount")
        return self


class InvoiceUpdate(BaseModel):
    service: str | None = Field(default=None, min_length=2, max_length=160)
    amount: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    discount: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    status: InvoiceStatus | None = None
    payment_method: PaymentMethod | None = None


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: str
    service: str
    amount: Decimal
    discount: Decimal
    total: Decimal
    status: InvoiceStatus
    payment_method: PaymentMethod | None
    issued_date: date
    paid_at: datetime | None
    appointment_id: int | None
    patient: PatientBrief
