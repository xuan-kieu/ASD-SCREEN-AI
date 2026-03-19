import json
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models import User
from app.utils.security import get_current_user

# Bỏ prefix ở đây vì main.py đã thêm prefix="/api/reports"
router = APIRouter(tags=["reports"])


# ─── FIX 3: Dùng .mappings() để đọc bằng tên cột, tránh lệch index ──────────
@router.get("/{assessment_id}")
def get_report(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    row = db.execute(text("""
        SELECT
            a.id                 AS assessment_id,
            a.status             AS status,
            a.risk_level         AS risk_level,
            a.overall_risk_score AS overall_score,
            a.report_json        AS report_json,
            a.created_at         AS created_at,
            a.completed_at       AS completed_at,
            c.full_name          AS full_name,
            c.birth_date         AS birth_date,
            c.gender             AS gender
        FROM assessments a
        JOIN children c ON a.child_id = c.id
        WHERE a.id = :id
          AND (
            :role IN ('admin', 'specialist', 'teacher')
            OR c.created_by = :uid
          )
    """), {"id": assessment_id, "role": current_user.role, "uid": str(current_user.id)}).mappings().fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")

    # Tính tuổi tháng
    birth  = row["birth_date"]
    today  = date.today()
    months = (today.year - birth.year) * 12 + (today.month - birth.month)

    return {
        "assessment_id": str(row["assessment_id"]),
        "status":        row["status"],
        "risk_level":    row["risk_level"],
        "overall_score": float(row["overall_score"]) if row["overall_score"] else None,
        "report":        json.loads(row["report_json"]) if row["report_json"] else None,
        "created_at":    str(row["created_at"]),
        "completed_at":  str(row["completed_at"]) if row["completed_at"] else None,
        "child": {
            "full_name":  row["full_name"],
            "birth_date": str(row["birth_date"]),
            "gender":     row["gender"],
            "age_months": months,
        }
    }
