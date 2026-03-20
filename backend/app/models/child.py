from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class Child(Base):
    __tablename__ = "children"

    id               = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    full_name        = Column(String(100), nullable=False)
    birth_date       = Column(Date, nullable=False)
    gender           = Column(String(10))
    region           = Column(String(50))
    primary_language = Column(String(50), default="vi")
    notes            = Column(Text)
    parent_id        = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_by       = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now())
