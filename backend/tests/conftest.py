"""Test harness.

Every run builds a throwaway database next to the real one and migrates it with
alembic, so the tests exercise the same schema a deployment would get rather
than whatever create_all happens to produce. Tables are emptied between tests.
"""

from collections.abc import Iterator

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker
from starlette.testclient import TestClient

from alembic import command
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import get_db
from app.main import app
from app.models.enums import UserRole
from app.models.user import User
from app.seed import TABLES

TEST_DB_NAME = "physiodesk_test"


def test_database_url() -> str:
    # render_as_string, because str() on a URL masks the password with ***
    url = make_url(settings.database_url).set(database=TEST_DB_NAME)
    return url.render_as_string(hide_password=False)


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    # dropping and creating a database cannot run inside a transaction
    admin_url = make_url(settings.database_url).set(database="postgres")
    admin = create_engine(admin_url, isolation_level="AUTOCOMMIT")

    with admin.connect() as conn:
        conn.execute(text(f'drop database if exists "{TEST_DB_NAME}" with (force)'))
        conn.execute(text(f'create database "{TEST_DB_NAME}"'))

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", test_database_url())
    command.upgrade(alembic_cfg, "head")

    test_engine = create_engine(test_database_url())
    yield test_engine

    test_engine.dispose()
    with admin.connect() as conn:
        conn.execute(text(f'drop database if exists "{TEST_DB_NAME}" with (force)'))
    admin.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    with engine.begin() as conn:
        conn.execute(text(f"truncate {', '.join(TABLES)} restart identity cascade"))

    with factory() as session:
        yield session


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    # hand the app the same session the test is holding, so anything the test
    # writes is visible to the endpoint without a commit dance
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin(db: Session) -> User:
    return make_user(db, "admin@physiodesk.com", "admin123", UserRole.admin)


@pytest.fixture
def staff(db: Session) -> User:
    return make_user(db, "staff@physiodesk.com", "staff123", UserRole.staff)


def make_user(db: Session, email: str, password: str, role: UserRole) -> User:
    user = User(
        email=email,
        full_name=email.split("@")[0].title(),
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    return user


def sign_in(client: TestClient, email: str, password: str) -> None:
    """Log in and leave the cookies on the client for the rest of the test."""
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
