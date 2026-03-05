from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class Game(Base):
    __tablename__ = "games"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    code                    = Column(String(20), unique=True, nullable=False)
    name                    = Column(String(100), nullable=False)
    description             = Column(Text)
    instructions            = Column(Text)
    min_age_months          = Column(Integer, nullable=False)
    max_age_months          = Column(Integer, nullable=False)
    target_duration_seconds = Column(Integer)
    media_url               = Column(Text)
    is_gateway              = Column(Boolean, default=False)
    created_at              = Column(DateTime(timezone=True), server_default=func.sysdatetimeoffset())