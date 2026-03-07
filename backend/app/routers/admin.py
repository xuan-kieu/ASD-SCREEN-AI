from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.utils.security import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    return current_user

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = db.query(User).all()
    return [
        {
            "id":        str(u.id),
            "username":  u.username,
            "full_name": u.full_name,
            "email":     u.email or "",
            "role":      u.role,
            "is_active": u.is_active,
        }
        for u in users
    ]

@router.patch("/users/{user_id}/toggle")
def toggle_user_active(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Không thể vô hiệu hóa chính mình")
    user.is_active = not user.is_active
    db.commit()
    return {"id": str(user.id), "is_active": user.is_active}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Không thể xóa chính mình")
    db.delete(user)
    db.commit()
    return {"message": "Đã xóa user"}

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from sqlalchemy import text
    rows = db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM users)       AS total_users,
            (SELECT COUNT(*) FROM children)    AS total_children,
            (SELECT COUNT(*) FROM assessments) AS total_assessments,
            (SELECT COUNT(*) FROM assessments WHERE status = 'completed') AS completed,
            (SELECT COUNT(*) FROM assessments WHERE risk_level = 'RẤT CAO') AS very_high_risk,
            (SELECT COUNT(*) FROM assessments WHERE risk_level = 'CAO')     AS high_risk
    """)).fetchone()

    return {
        "total_users":        rows[0],
        "total_children":     rows[1],
        "total_assessments":  rows[2],
        "completed":          rows[3],
        "very_high_risk":     rows[4],
        "high_risk":          rows[5],
    }