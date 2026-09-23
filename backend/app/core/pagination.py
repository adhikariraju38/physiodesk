from math import ceil
from typing import Annotated, Any

from fastapi import Depends, Query
from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session


class PageParams:
    """Shared ?page= and ?page_size= pair, used as a dependency on list endpoints."""

    def __init__(
        self,
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    ) -> None:
        self.page = page
        self.page_size = page_size


Paging = Annotated[PageParams, Depends()]


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


def paginate(db: Session, stmt: Select, params: PageParams) -> Page[Any]:
    """Run a select twice: once for the count, once for the requested slice."""
    # order_by(None) because postgres will not let you order by a column that
    # is not selected once the statement is wrapped in count()
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0

    rows = (
        db.scalars(stmt.limit(params.page_size).offset((params.page - 1) * params.page_size))
        .unique()
        .all()
    )

    return Page[Any](
        items=list(rows),
        total=total,
        page=params.page,
        page_size=params.page_size,
        # always report at least one page so an empty list is not "page 1 of 0"
        pages=max(ceil(total / params.page_size), 1),
    )
