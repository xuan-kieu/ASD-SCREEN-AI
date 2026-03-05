from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "mssql+pyodbc://sa:MatKhau@123456!@db:1433/ASD_Screening?driver=ODBC+Driver+17+for+SQL+Server"
    REDIS_URL: str = "redis://redis:6379"
    SECRET_KEY: str = "asd-screen-ai-secret-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()