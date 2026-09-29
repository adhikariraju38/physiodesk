"""The clinic's clock has to be configuration, not whatever the host thinks.

Docker gets a TZ, but a serverless platform usually reserves that name and runs
the process in utc. Kathmandu is utc+5:45, so a dashboard built on the host
clock reports yesterday's figures every morning until a quarter to six.
"""

import pytest

from app.core import clock
from app.core.config import settings


def test_the_clinic_date_follows_the_configured_zone(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "clinic_timezone", "Pacific/Kiritimati")  # utc+14
    ahead = clock.wall_now()

    monkeypatch.setattr(settings, "clinic_timezone", "Pacific/Midway")  # utc-11
    behind = clock.wall_now()

    # twenty five hours apart, so the two are never on the same calendar day
    assert (ahead - behind).total_seconds() == pytest.approx(25 * 3600, abs=5)
    assert ahead.date() != behind.date()


def test_today_is_the_date_of_the_clinic_wall_clock() -> None:
    assert clock.today() == clock.wall_now().date()
