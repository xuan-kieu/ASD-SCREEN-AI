from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
import uuid

# ── AUTH ─────────────────────────────────────────────────
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
    email: Optional[str]
    phone: Optional[str]
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True

# ── CHILDREN ─────────────────────────────────────────────
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
    gender: Optional[str]
    region: Optional[str]
    primary_language: str
    age_months: Optional[int] = None

    class Config:
        from_attributes = True

# ── ASSESSMENTS ──────────────────────────────────────────
class AssessmentCreate(BaseModel):
    child_id: str

class AssessmentResponse(BaseModel):
    id: str
    child_id: str
    status: str
    overall_risk_score: Optional[float]
    risk_level: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

# ── GAMES ────────────────────────────────────────────────
class GameResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str]
    instructions: Optional[str]
    min_age_months: int
    max_age_months: int
    target_duration_seconds: Optional[int]
    is_gateway: bool

    class Config:
        from_attributes = True

# ── MESSAGES ─────────────────────────────────────────────
class MessageCreate(BaseModel):
    to_user_id: str
    child_id: str
    content: str

class MessageResponse(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    child_id: str
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True