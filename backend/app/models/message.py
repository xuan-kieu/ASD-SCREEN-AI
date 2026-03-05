from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func
from app.database import Base

class Message(Base):
    __tablename__ = "messages"

    id           = Column(UNIQUEIDENTIFIER, primary_key=True, server_default=func.newid())
    from_user_id = Column(UNIQUEIDENTIFIER, ForeignKey("users.id"))
    to_user_id   = Column(UNIQUEIDENTIFIER, ForeignKey("users.id"))
    child_id     = Column(UNIQUEIDENTIFIER, ForeignKey("children.id", ondelete="CASCADE"))
    content      = Column(Text, nullable=False)
    is_read      = Column(Boolean, default=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())
    read_at      = Column(DateTime(timezone=True))