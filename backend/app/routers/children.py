from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import date
import uuid
from app.database import get_db
from app.models.child import Child
from app.models.user import User
from app.schemas import ChildCreate, ChildResponse
from app.utils.deps import get_current_user

router = APIRouter()


def calc_age_months(birth_date: date) -> int:
    today = date.today()
    return (today.year - birth_date.year) * 12 + (today.month - birth_date.month)


def child_to_dict(child):
    return {
        "id":               str(child.id),
        "full_name":        child.full_name,
        "birth_date":       child.birth_date,
        "gender":           child.gender,
        "region":           child.region,
        "primary_language": child.primary_language,
        "age_months":       calc_age_months(child.birth_date),
        "notes":            getattr(child, 'notes', None),
    }


@router.get("/", response_model=List[ChildResponse])
def get_children(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "parent":
        children = db.query(Child).filter(Child.parent_id == current_user.id).all()
    elif current_user.role in ("admin", "specialist", "teacher"):
        children = db.query(Child).all()
    else:
        children = []
    return [child_to_dict(c) for c in children]


@router.post("/", response_model=ChildResponse)
def create_child(
    data: ChildCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_id     = str(uuid.uuid4())
    parent_id  = str(current_user.id) if current_user.role == "parent" else None
    created_by = str(current_user.id)

    db.execute(text("""
        INSERT INTO children
            (id, full_name, birth_date, gender, region, primary_language, notes, parent_id, created_by)
        VALUES
            (:id, :full_name, :birth_date, :gender, :region, :primary_language, :notes, :parent_id, :created_by)
    """), {
        "id":               new_id,
        "full_name":        data.full_name,
        "birth_date":       data.birth_date,
        "gender":           data.gender,
        "region":           data.region,
        "primary_language": data.primary_language,
        "notes":            data.notes,
        "parent_id":        parent_id,
        "created_by":       created_by,
    })
    db.commit()

    child = db.query(Child).filter(Child.id == new_id).first()
    return child_to_dict(child)


@router.get("/{child_id}", response_model=ChildResponse)
def get_child(
    child_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Không tìm thấy trẻ")
    return child_to_dict(child)


# ─── MỚI: Sửa thông tin trẻ ────────────────────────────────────────────────
@router.put("/{child_id}", response_model=ChildResponse)
def update_child(
    child_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Không tìm thấy trẻ")

    # Chỉ admin/specialist/teacher hoặc parent sở hữu mới được sửa
    if current_user.role == "parent" and str(child.parent_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Không có quyền sửa")

    db.execute(text("""
        UPDATE children SET
            full_name        = COALESCE(:full_name, full_name),
            birth_date       = COALESCE(:birth_date, birth_date),
            gender           = COALESCE(:gender, gender),
            region           = COALESCE(:region, region),
            primary_language = COALESCE(:primary_language, primary_language),
            notes            = COALESCE(:notes, notes),
            updated_at       = GETDATE()
        WHERE id = :id
    """), {
        "id":               child_id,
        "full_name":        data.get("full_name"),
        "birth_date":       data.get("birth_date"),
        "gender":           data.get("gender"),
        "region":           data.get("region"),
        "primary_language": data.get("primary_language"),
        "notes":            data.get("notes"),
    })
    db.commit()

    child = db.query(Child).filter(Child.id == child_id).first()
    return child_to_dict(child)