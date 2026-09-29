from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://physiodesk:physiodesk@localhost:5433/physiodesk"
    secret_key: str = "dev-only-secret-not-for-anything-real-0000"

    access_token_minutes: int = 15
    refresh_token_days: int = 14

    # local dev is plain http, turn this on once there is tls in front
    cookie_secure: bool = False

    # the clinic's own timezone. not taken from the host clock, see core/clock.py
    clinic_timezone: str = "Asia/Kathmandu"

    # where the next.js app runs, needed for credentialed CORS
    frontend_origin: str = "http://localhost:3000"


settings = Settings()
