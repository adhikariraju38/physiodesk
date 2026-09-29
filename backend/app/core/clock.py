"""What time it is at the clinic.

The host clock is not to be trusted. In docker it is whatever TZ says, and on a
serverless platform TZ is usually reserved and the process runs in UTC. Either
way, a clinic in Kathmandu would find its dashboard rolling over to "tomorrow"
at a quarter to six in the evening, and reporting yesterday's numbers all
morning. So the timezone is configuration, not an accident of where this runs.

Times that are genuinely instants, like a token expiry, stay in UTC and do not
belong here.
"""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.config import settings


def wall_now() -> datetime:
    """Local wall clock, naive, to sit alongside the naive date and time columns."""
    return datetime.now(ZoneInfo(settings.clinic_timezone)).replace(tzinfo=None)


def today() -> date:
    return wall_now().date()
