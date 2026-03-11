from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.schemas import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.utils.security import verify_password, hash_password, create_access_token
from app.utils.deps import get_current_user
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == data.username) | (User.email == data.username)
    ).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị khóa")

    token = create_access_token({"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token, role=user.role, full_name=user.full_name)


@router.post("/register", response_model=UserResponse)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username đã tồn tại")
    if data.email and db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại")

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        email=data.email,
        phone=data.phone,
        full_name=data.full_name,
        role=data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Đổi mật khẩu ─────────────────────────────────────────
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),  # User ORM object
    db: Session = Depends(get_db)                     # sync Session
):
    # Kiểm tra mật khẩu hiện tại
    if not pwd_context.verify(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")

    # Kiểm tra mật khẩu mới
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 8 ký tự")

    if req.new_password == req.current_password:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu hiện tại")

    # Lưu mật khẩu mới
    current_user.password_hash = pwd_context.hash(req.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}