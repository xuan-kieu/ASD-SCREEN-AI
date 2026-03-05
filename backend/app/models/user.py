from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id            = Column(UNIQUEIDENTIFIER, primary_key=True, server_default=func.newid())
    username      = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email         = Column(String(100), unique=True)
    phone         = Column(String(20), unique=True)
    full_name     = Column(String(100), nullable=False)
    role          = Column(String(20), nullable=False)  # parent|teacher|specialist|admin
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())
    updated_at    = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())