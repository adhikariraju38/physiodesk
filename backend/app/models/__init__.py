# imported for the side effect of registering every table on Base.metadata,
# which is what alembic autogenerate walks
from app.models.appointment import Appointment
from app.models.invoice import Invoice
from app.models.patient import Patient
from app.models.refresh_token import RefreshToken
from app.models.therapist import Therapist
from app.models.user import User

__all__ = ["Appointment", "Invoice", "Patient", "RefreshToken", "Therapist", "User"]
