from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/asd_screening"
    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "asd-screen-ai-secret-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    TELEGRAM_BOT_TOKEN: str = ""
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
