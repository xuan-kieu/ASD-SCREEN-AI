from sqlalchemy import Column, String, DateTime, DECIMAL, Integer, Text
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func
from app.database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id                = Column(UNIQUEIDENTIFIER, primary_key=True, default=func.newid())
    child_id          = Column(UNIQUEIDENTIFIER, nullable=False)
    started_by        = Column(UNIQUEIDENTIFIER)
    started_at        = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())
    completed_at      = Column(DateTime(timezone=True))
    status            = Column(String(20), default='in_progress')
    adaptive_flow     = Column(Text)
    overall_risk_score= Column(DECIMAL(5, 2))
    risk_level        = Column(String(20))
    report_json       = Column(Text)
    created_at        = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())
    updated_at        = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())


class GameSession(Base):
    __tablename__ = "game_sessions"

    id             = Column(UNIQUEIDENTIFIER, primary_key=True, default=func.newid())
    assessment_id  = Column(UNIQUEIDENTIFIER, nullable=False)
    game_id        = Column(Integer, nullable=True)
    game_code      = Column(String(20), nullable=True)
    sequence_order = Column(Integer, nullable=False)
    started_at     = Column(DateTime(timezone=True))
    ended_at       = Column(DateTime(timezone=True))
    status         = Column(String(20), default='completed')
    raw_features   = Column(Text)
    result_scores  = Column(Text)
    created_at     = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())