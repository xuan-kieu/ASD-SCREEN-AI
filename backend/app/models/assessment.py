from sqlalchemy import Column, String, DateTime, DECIMAL, Integer, Text, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id                 = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    child_id           = Column(UUID(as_uuid=True), nullable=False)
    started_by         = Column(UUID(as_uuid=True))
    started_at         = Column(DateTime(timezone=True), server_default=func.now())
    completed_at       = Column(DateTime(timezone=True))
    status             = Column(String(20), default='in_progress')
    adaptive_flow      = Column(Text)
    overall_risk_score = Column(DECIMAL(5, 2))
    risk_level         = Column(String(20))
    report_json        = Column(Text)
    ai_training_consent = Column(Boolean)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), server_default=func.now())


class GameSession(Base):
    __tablename__ = "game_sessions"

    id             = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    assessment_id  = Column(UUID(as_uuid=True), nullable=False)
    game_id        = Column(Integer, nullable=True)
    game_code      = Column(String(20), nullable=True)
    sequence_order = Column(Integer, nullable=False)
    started_at     = Column(DateTime(timezone=True))
    ended_at       = Column(DateTime(timezone=True))
    status         = Column(String(20), default='completed')
    raw_features   = Column(Text)
    result_scores  = Column(Text)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
