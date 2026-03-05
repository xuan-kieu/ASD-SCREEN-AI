from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func
from app.database import Base

class Child(Base):
    __tablename__ = "children"

    id               = Column(UNIQUEIDENTIFIER, primary_key=True, server_default=func.newid())
    full_name        = Column(String(100), nullable=False)
    birth_date       = Column(Date, nullable=False)
    gender           = Column(String(10))
    region           = Column(String(50))
    primary_language = Column(String(50), default="vi")
    notes            = Column(Text)
    parent_id        = Column(UNIQUEIDENTIFIER, ForeignKey("users.id", ondelete="SET NULL"))
    created_by       = Column(UNIQUEIDENTIFIER, ForeignKey("users.id"))
    created_at       = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())
    updated_at       = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())