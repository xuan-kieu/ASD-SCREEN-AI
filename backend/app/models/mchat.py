from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime

class MchatResult(Base):
    __tablename__ = "mchat_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    answers = Column(JSON)
    r_score = Column(Integer)
    followup_fail_count = Column(Integer)
    risk_level = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
