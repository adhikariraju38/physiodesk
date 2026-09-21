from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# pool_pre_ping saves us from stale connections when the db container restarts
engine = create_engine(settings.database_url, pool_pre_ping=True)

# expire_on_commit=False so a model stays readable after the request commits,
# otherwise every response serialisation fires another select
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
