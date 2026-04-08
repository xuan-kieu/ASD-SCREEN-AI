from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class AssessmentMedia(Base):
    __tablename__ = "assessment_media"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    original_video_path = Column(String(1024), nullable=False)
    anonymized_video_path = Column(String(1024))
    anonymization_status = Column(String(30), server_default=text("'pending'"))
    anonymized_at = Column(DateTime(timezone=True))
    delete_original_after = Column(DateTime(timezone=True))
    original_deleted = Column(Boolean, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
