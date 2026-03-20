from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class Message(Base):
    __tablename__ = "messages"

    id           = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    from_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    to_user_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    child_id     = Column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"))
    content      = Column(Text, nullable=False)
    is_read      = Column(Boolean, default=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    read_at      = Column(DateTime(timezone=True))
