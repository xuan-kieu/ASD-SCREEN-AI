from sqlalchemy import Column, String, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id               = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    username         = Column(String(50), unique=True, nullable=False)
    password_hash    = Column(String(255), nullable=False)
    email            = Column(String(100), unique=True)
    phone            = Column(String(20), unique=True)
    full_name        = Column(String(100), nullable=False)
    role             = Column(String(20), nullable=False)
    is_active        = Column(Boolean, default=True)
    city             = Column(String(100))           # thành phố để gợi ý specialist
    telegram_chat_id = Column(String(50))
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now())