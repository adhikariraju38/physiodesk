from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard import build_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    db: DbSession,
    user: CurrentUser,
    recent: Annotated[int, Query(ge=1, le=20)] = 5,
) -> DashboardSummary:
    return build_summary(db, recent_limit=recent)
