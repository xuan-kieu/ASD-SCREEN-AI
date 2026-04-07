from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from app.database import get_db
from app.models.user import User
from app.models.child import Child
from app.utils.deps import get_current_user
from pydantic import BaseModel
from typing import Optional
import random, string
import logging

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    return current_user


# ── Users ──────────────────────────────────────────────────────────────────

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
            "city":      u.city or "",
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


# backend/app/routers/admin.py
@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    rows = db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM users)       AS total_users,
            (SELECT COUNT(*) FROM children)    AS total_children,
            (SELECT COUNT(*) FROM assessments) AS total_assessments,
            (SELECT COUNT(*) FROM assessments WHERE status = 'completed') AS completed,
            (SELECT COUNT(*) FROM assessments WHERE risk_level = 'RẤT CAO') AS very_high_risk,
            (SELECT COUNT(*) FROM assessments WHERE risk_level = 'CAO')     AS high_risk,
            (SELECT COUNT(*) FROM children WHERE assigned_to IS NULL)       AS unassigned
    """)).fetchone()

    return {
        "total_users":       rows[0],
        "total_children":    rows[1],
        "total_assessments": rows[2],
        "completed":         rows[3],
        "very_high_risk":    rows[4],
        "high_risk":         rows[5],
        "unassigned":        rows[6],
    }

# ── Thêm endpoint xem lịch sử chuyển giao ────────────────────────────────────
 
@router.get("/children/{child_id}/transfers")
def get_transfer_history(
    child_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        rows = db.execute(text("""
            SELECT
                ct.id, ct.transfer_type, ct.reason, ct.transferred_at,
                fu.full_name AS from_name,
                tu.full_name AS to_name,
                bu.full_name AS by_name
            FROM child_transfers ct
            LEFT JOIN users fu ON fu.id = ct.from_user_id
            LEFT JOIN users tu ON tu.id = ct.to_user_id
            LEFT JOIN users bu ON bu.id = ct.transferred_by
            WHERE ct.child_id = :child_id
            ORDER BY ct.transferred_at DESC
        """), {"child_id": child_id}).mappings().fetchall()
        return [dict(r) for r in rows]
    except ProgrammingError as e:
        # Graceful fallback when production DB is missing child_transfers table.
        if "child_transfers" in str(e).lower() and "does not exist" in str(e).lower():
            logger.warning(
                "child_transfers table missing; returning empty transfer history. child_id=%s",
                child_id,
            )
            db.rollback()
            return []
        raise
 

# ── Phân công trẻ cho specialist ──────────────────────────────────────────

class AssignChildRequest(BaseModel):
    specialist_id: Optional[str] = None
    reason: Optional[str] = None

@router.patch("/children/{child_id}/assign")
def assign_child(
    child_id: str,
    data: AssignChildRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(404, "Không tìm thấy trẻ")
 
    if data.specialist_id:
        specialist = db.query(User).filter(
            User.id == data.specialist_id,
            User.role == "specialist"
        ).first()
        if not specialist:
            raise HTTPException(404, "Không tìm thấy chuyên gia")
 
    old_specialist_id = str(child.assigned_to) if child.assigned_to else None
 
    # Ghi lịch sử chuyển giao nếu có thay đổi
    if old_specialist_id != data.specialist_id:
        db.execute(text("""
            INSERT INTO child_transfers
                (child_id, from_user_id, to_user_id, transfer_type, reason, transferred_by)
            VALUES
                (:child_id, :from_id, :to_id, 'specialist', :reason, :by)
        """), {
            "child_id": child_id,
            "from_id":  old_specialist_id,
            "to_id":    data.specialist_id,
            "reason":   data.reason or "Phân công bởi Admin",
            "by":       str(current_user.id),
        })
 
    db.execute(text("""
        UPDATE children SET assigned_to = :specialist_id, updated_at = NOW()
        WHERE id = :child_id
    """), {"specialist_id": data.specialist_id, "child_id": child_id})
    db.commit()
 
    return {
        "message": "Phân công thành công" if data.specialist_id else "Đã hủy phân công",
        "child_id": child_id,
        "specialist_id": data.specialist_id
    }

@router.get("/children")
def get_all_children_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin xem tất cả trẻ kèm thông tin phân công"""
    rows = db.execute(text("""
        SELECT
            c.id, c.full_name, c.birth_date, c.gender, c.region,
            p.full_name AS parent_name,
            sp.id       AS specialist_id,
            sp.full_name AS specialist_name,
            t.full_name  AS teacher_name
        FROM children c
        LEFT JOIN users p  ON p.id  = c.parent_id
        LEFT JOIN users sp ON sp.id = c.assigned_to
        LEFT JOIN users t  ON t.id  = c.created_by AND t.role = 'teacher'
        ORDER BY c.created_at DESC
    """)).mappings().fetchall()
    return [dict(r) for r in rows]


# ── Specialists — tìm theo thành phố ──────────────────────────────────────

@router.get("/specialists")
def get_specialists(
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = """
        SELECT id, full_name, email, city,
               (SELECT COUNT(*) FROM children WHERE assigned_to = users.id) AS child_count
        FROM users
        WHERE role = 'specialist' AND is_active = true
    """
    params = {}
    if city:
        query += " AND city = :city"
        params["city"] = city
    query += " ORDER BY city, full_name"
 
    rows = db.execute(text(query), params).mappings().fetchall()
    return [dict(r) for r in rows]


# ── Classrooms ─────────────────────────────────────────────────────────────

def _gen_class_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class ClassroomCreate(BaseModel):
    name: str


@router.post("/classrooms")
def create_classroom(
    data: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Giáo viên tạo lớp"""
    if current_user.role not in ("teacher", "admin"):
        raise HTTPException(403, "Chỉ giáo viên mới tạo được lớp")

    # Tạo mã lớp không trùng
    for _ in range(10):
        code = _gen_class_code()
        exists = db.execute(
            text("SELECT 1 FROM classrooms WHERE class_code = :code"),
            {"code": code}
        ).fetchone()
        if not exists:
            break

    db.execute(text("""
        INSERT INTO classrooms (name, teacher_id, class_code)
        VALUES (:name, :teacher_id, :code)
    """), {"name": data.name, "teacher_id": str(current_user.id), "code": code})
    db.commit()

    return {"message": "Tạo lớp thành công", "class_code": code, "name": data.name}


@router.get("/classrooms/my")
def get_my_classrooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Giáo viên xem lớp của mình"""
    if current_user.role not in ("teacher", "admin"):
        raise HTTPException(403, "Không có quyền")

    rows = db.execute(text("""
        SELECT cl.id, cl.name, cl.class_code, cl.created_at,
               COUNT(cc.child_id) AS student_count
        FROM classrooms cl
        LEFT JOIN classroom_children cc ON cc.classroom_id = cl.id
        WHERE cl.teacher_id = :teacher_id
        GROUP BY cl.id, cl.name, cl.class_code, cl.created_at
        ORDER BY cl.created_at DESC
    """), {"teacher_id": str(current_user.id)}).mappings().fetchall()
    return [dict(r) for r in rows]


@router.get("/classrooms/{class_code}/children")
def get_classroom_children(
    class_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Giáo viên xem học sinh trong lớp"""
    classroom = db.execute(
        text("SELECT * FROM classrooms WHERE class_code = :code"),
        {"code": class_code.upper()}
    ).mappings().fetchone()

    if not classroom:
        raise HTTPException(404, "Không tìm thấy lớp")
    if str(classroom["teacher_id"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(403, "Không phải lớp của bạn")

    rows = db.execute(text("""
        SELECT c.id, c.full_name, c.birth_date, c.gender, c.region,
               p.full_name AS parent_name
        FROM classroom_children cc
        JOIN children c ON c.id = cc.child_id
        LEFT JOIN users p ON p.id = c.parent_id
        WHERE cc.classroom_id = :classroom_id
        ORDER BY c.full_name
    """), {"classroom_id": str(classroom["id"])}).mappings().fetchall()
    return [dict(r) for r in rows]


@router.post("/classrooms/join")
def join_classroom(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    PH dùng mã lớp để thêm con vào lớp của giáo viên
    Body: { class_code, child_id }
    """
    class_code = data.get("class_code", "").upper()
    child_id   = data.get("child_id")

    if not class_code or not child_id:
        raise HTTPException(400, "Thiếu class_code hoặc child_id")

    # Kiểm tra lớp tồn tại
    classroom = db.execute(
        text("SELECT * FROM classrooms WHERE class_code = :code"),
        {"code": class_code}
    ).mappings().fetchone()
    if not classroom:
        raise HTTPException(404, "Mã lớp không tồn tại")

    # Kiểm tra trẻ thuộc về phụ huynh này
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(404, "Không tìm thấy trẻ")
    if current_user.role == "parent" and str(child.parent_id) != str(current_user.id):
        raise HTTPException(403, "Không phải con của bạn")

    # Kiểm tra đã trong lớp chưa
    exists = db.execute(text("""
        SELECT 1 FROM classroom_children
        WHERE classroom_id = :cid AND child_id = :kid
    """), {"cid": str(classroom["id"]), "kid": child_id}).fetchone()
    if exists:
        raise HTTPException(400, "Trẻ đã trong lớp này rồi")

    db.execute(text("""
        INSERT INTO classroom_children (classroom_id, child_id)
        VALUES (:cid, :kid)
    """), {"cid": str(classroom["id"]), "kid": child_id})

    # Cập nhật created_by = teacher_id để giáo viên thấy trẻ
    db.execute(text("""
        UPDATE children SET assigned_to = :teacher_id WHERE id = :child_id
    """), {"teacher_id": str(classroom["teacher_id"]), "child_id": child_id})

    db.commit()

    teacher = db.execute(
        text("SELECT full_name FROM users WHERE id = :id"),
        {"id": str(classroom["teacher_id"])}
    ).mappings().fetchone()

    return {
        "message": f"Đã thêm vào lớp {classroom['name']} của {teacher['full_name']}",
        "class_code": class_code
    }