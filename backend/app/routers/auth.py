from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.schemas import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.utils.security import (
    verify_password, hash_password,
    create_access_token, create_refresh_token, decode_token
)
from app.utils.deps import get_current_user
from passlib.context import CryptContext
from typing import Optional
import random, string, os

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Email hoặc mật khẩu không đúng")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị khóa")

    payload       = {"sub": user.username, "role": user.role}
    access_token  = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    return {"access_token": access_token, "refresh_token": refresh_token,
            "token_type": "bearer", "role": user.role, "full_name": user.full_name}

@router.post("/refresh")
def refresh_token(body: dict, db: Session = Depends(get_db)):
    token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="Thiếu refresh_token")
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Refresh token không hợp lệ hoặc đã hết hạn")
    user = db.query(User).filter(User.username == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc bị khóa")
    return {"access_token": create_access_token({"sub": user.username, "role": user.role}),
            "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username đã tồn tại")
    if data.email and db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại")
    user = User(username=data.username, password_hash=hash_password(data.password),
                email=data.email, phone=data.phone, full_name=data.full_name, role=data.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Đổi mật khẩu ─────────────────────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
def change_password(req: ChangePasswordRequest,
                    current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not pwd_context.verify(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 8 ký tự")
    if req.new_password == req.current_password:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu hiện tại")
    current_user.password_hash = pwd_context.hash(req.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}


# ── Quên mật khẩu — Helper ───────────────────────────────────────────────────

def _generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

def _get_redis():
    try:
        import redis as redis_lib
        from app.config import settings
        r = redis_lib.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        r.ping()
        return r
    except Exception:
        return None

def _send_otp_email(to_email: str, otp: str, full_name: str):
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        smtp_user = os.getenv("SMTP_USER", "")
        smtp_pass = os.getenv("SMTP_PASS", "")
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "465"))

        if not smtp_user or not smtp_pass:
            print(f"[OTP DEV] {to_email}: {otp}")
            return True

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Mã xác nhận đặt lại mật khẩu — ASD-SCREEN AI"
        msg["From"]    = smtp_user
        msg["To"]      = to_email

        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#4f46e5">🧩 ASD-SCREEN AI</h2>
          <p>Xin chào <strong>{full_name}</strong>,</p>
          <p>Mã xác nhận đặt lại mật khẩu:</p>
          <div style="background:#f0f4ff;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f46e5">{otp}</span>
          </div>
          <p style="color:#6b7280;font-size:14px">Mã có hiệu lực trong <strong>10 phút</strong>.</p>
        </div>"""

        msg.attach(MIMEText(html, "html"))

        # Dùng SMTP_SSL với port 465 (Gmail)
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())

        print(f"[SMTP] OTP sent to {to_email}")
        return True

    except Exception as e:
        print(f"[SMTP] Error: {e}")
        return False

# ── Quên mật khẩu — Endpoints ────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Bước 1 — Gửi OTP về email"""
    user = db.query(User).filter(User.email == data.email).first()
    # Luôn trả về success để tránh email enumeration attack
    if user:
        otp = _generate_otp()
        r   = _get_redis()
        if r:
            r.setex(f"otp:{data.email}", 600, otp)  # TTL 10 phút
        background_tasks.add_task(          # ← gửi nền, không block
            _send_otp_email, data.email, otp, user.full_name
        )
    return {"message": "Nếu email tồn tại, mã xác nhận đã được gửi"}


@router.post("/verify-otp")
def verify_otp(data: VerifyOTPRequest):
    """Bước 2 — Xác nhận OTP"""
    r = _get_redis()
    if not r:
        raise HTTPException(status_code=503, detail="Dịch vụ không khả dụng, thử lại sau")
    stored = r.get(f"otp:{data.email}")
    if not stored:
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn, vui lòng thử lại")
    if stored != data.otp:
        raise HTTPException(status_code=400, detail="Mã OTP không đúng")
    r.setex(f"otp_verified:{data.email}", 300, "1")  # 5 phút để đặt lại MK
    return {"message": "Xác nhận thành công"}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Bước 3 — Đặt lại mật khẩu"""
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Mật khẩu phải có ít nhất 8 ký tự")
    r = _get_redis()
    if not r:
        raise HTTPException(status_code=503, detail="Dịch vụ không khả dụng")
    if not r.get(f"otp_verified:{data.email}"):
        raise HTTPException(status_code=400, detail="Phiên xác nhận đã hết hạn, vui lòng thử lại")
    stored = r.get(f"otp:{data.email}")
    if not stored or stored != data.otp:
        raise HTTPException(status_code=400, detail="Xác thực không hợp lệ")
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    user.password_hash = pwd_context.hash(data.new_password)
    db.commit()
    r.delete(f"otp:{data.email}")
    r.delete(f"otp_verified:{data.email}")
    return {"message": "Đặt lại mật khẩu thành công"}

class UpdateProfileRequest(BaseModel):
    city: Optional[str] = None

@router.patch("/update-profile")
def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.city is not None:
        current_user.city = req.city
    db.commit()
    return {"message": "Cập nhật thành công"}

@router.get("/test-smtp")
def test_smtp():
    import socket
    results = {}
    for port in [465, 587, 25]:
        try:
            socket.setdefaulttimeout(5)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect(("smtp.gmail.com", port))
            s.close()
            results[port] = "OK"
        except Exception as e:
            results[port] = str(e)
    return results