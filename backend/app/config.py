from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/asd_screening"
    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "asd-screen-ai-secret-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    TELEGRAM_BOT_TOKEN: str = ""
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    GEMINI_API_KEY: str = ""
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    MEDIA_ROOT: str = "/app/storage"
    ORIGINAL_MEDIA_DIR: str = "original"
    ANONYMIZED_MEDIA_DIR: str = "anonymized"
    ORIGINAL_RETENTION_DAYS: int = 90

    class Config:
        env_file = ".env"

settings = Settings()
