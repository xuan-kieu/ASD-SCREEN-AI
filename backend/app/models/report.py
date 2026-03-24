from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime

class Report(Base):
    __tablename__ = "reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False)
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id"), nullable=False)
    risk_level = Column(String(20))
    domain_scores = Column(JSON)
    recommendations = Column(JSON)
    ai_analysis = Column(Text)
    pdf_path = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
