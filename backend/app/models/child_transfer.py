from sqlalchemy import Column, String, DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class ChildTransfer(Base):
    __tablename__ = "child_transfers"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    from_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    to_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    transfer_type = Column(String(20), nullable=False, server_default=text("'specialist'"))
    reason = Column(Text)
    transferred_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    transferred_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
