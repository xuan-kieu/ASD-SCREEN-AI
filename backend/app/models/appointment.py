from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Date, Time
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime

class SpecialistSlot(Base):
    __tablename__ = "specialist_slots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    specialist_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    slot_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    location = Column(String(100), default="Online")
    notes = Column(Text)
    is_available = Column(Boolean, default=True)

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slot_id = Column(UUID(as_uuid=True), ForeignKey("specialist_slots.id"), nullable=False)
    specialist_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    child_id = Column(UUID(as_uuid=True), ForeignKey("children.id"))
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"))
    status = Column(String(20), default="pending")
    reason = Column(Text)
    reject_reason = Column(Text)
    specialist_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
