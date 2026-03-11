from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime
import uuid

# ── AUTH ──────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: str
    role: str = "parent"

class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: str
    role: str
    is_active: bool = True

    @field_validator('id', mode='before')
    @classmethod
    def uuid_to_str(cls, v):
        return str(v) if v else v

    class Config:
        from_attributes = True

# ── CHILDREN ──────────────────────────────────────────────────
class ChildCreate(BaseModel):
    full_name: str
    birth_date: date
    gender: Optional[str] = None
    region: Optional[str] = None
    primary_language: str = "vi"
    notes: Optional[str] = None

class ChildResponse(BaseModel):
    id: str
    full_name: str
    birth_date: date
    gender: Optional[str] = None
    region: Optional[str] = None
    primary_language: str
    age_months: Optional[int] = None
    notes: Optional[str] = None

    @field_validator('id', mode='before')
    @classmethod
    def uuid_to_str(cls, v):
        return str(v) if v else v

    class Config:
        from_attributes = True

# ── ASSESSMENTS ───────────────────────────────────────────────
class AssessmentCreate(BaseModel):
    child_id: str

class AssessmentResponse(BaseModel):
    id: str
    child_id: str
    status: str
    overall_risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    @field_validator('id', 'child_id', mode='before')
    @classmethod
    def uuid_to_str(cls, v):
        return str(v) if v else v

    class Config:
        from_attributes = True

# ── GAMES ─────────────────────────────────────────────────────
class GameResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    min_age_months: int
    max_age_months: int
    target_duration_seconds: Optional[int] = None
    is_gateway: bool

    class Config:
        from_attributes = True

# ── MESSAGES ──────────────────────────────────────────────────
class MessageCreate(BaseModel):
    to_user_id: str
    child_id: Optional[str] = None
    content: str

class MessageResponse(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    child_id: Optional[str] = None
    content: str
    is_read: bool
    created_at: datetime

    @field_validator('id', 'from_user_id', 'to_user_id', mode='before')
    @classmethod
    def uuid_to_str(cls, v):
        return str(v) if v else v

    class Config:
        from_attributes = True