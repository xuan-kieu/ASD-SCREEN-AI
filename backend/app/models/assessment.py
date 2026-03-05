from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func
from app.database import Base

class Assessment(Base):
    __tablename__ = "assessments"

    id                 = Column(UNIQUEIDENTIFIER, primary_key=True, server_default=func.newid())
    child_id           = Column(UNIQUEIDENTIFIER, ForeignKey("children.id", ondelete="CASCADE"))
    started_by         = Column(UNIQUEIDENTIFIER, ForeignKey("users.id"))
    started_at         = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())
    completed_at       = Column(DateTime(timezone=True))
    status             = Column(String(20), default="in_progress")
    adaptive_flow      = Column(Text)
    overall_risk_score = Column(Numeric(5, 2))
    risk_level         = Column(String(20))
    report_json        = Column(Text)
    created_at         = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())
    updated_at         = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())


class GameSession(Base):
    __tablename__ = "game_sessions"

    id             = Column(UNIQUEIDENTIFIER, primary_key=True, server_default=func.newid())
    assessment_id  = Column(UNIQUEIDENTIFIER, ForeignKey("assessments.id", ondelete="CASCADE"))
    game_id        = Column(String(20), ForeignKey("games.id", ondelete="CASCADE"))
    sequence_order = Column(String(10), nullable=False)
    started_at     = Column(DateTime(timezone=True))
    ended_at       = Column(DateTime(timezone=True))
    status         = Column(String(20), default="completed")
    raw_data_json  = Column(Text)
    result_scores  = Column(Text)
    created_at     = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())