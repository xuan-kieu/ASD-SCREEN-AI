"""
routers/mchat.py — API lưu & xem kết quả M-CHAT-R/F
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.utils.deps import get_db, get_current_user
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid, json
from datetime import datetime

router = APIRouter(prefix="/mchat", tags=["mchat"])

class MChatResultIn(BaseModel):
    child_id: str
    r_score: int
    risk_level: str          # 'low' | 'high'
    answers_r: Dict[str, Any]
    failed_items: list
    followup_results: Dict[str, Any]
    followup_fail_count: int

@router.post("/results")
def save_mchat_result(data: MChatResultIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    result_id = str(uuid.uuid4())
    now = datetime.utcnow()
    db.execute(text("""
        INSERT INTO mchat_results
          (id, child_id, created_by, r_score, risk_level,
           answers_r, failed_items, followup_results, followup_fail_count, created_at)
        VALUES
          (:id, :child_id, :created_by, :r_score, :risk_level,
           :answers_r, :failed_items, :followup_results, :followup_fail_count, :created_at)
    """), {
        "id": result_id,
        "child_id": data.child_id,
        "created_by": str(current_user.id),
        "r_score": data.r_score,
        "risk_level": data.risk_level,
        "answers_r": json.dumps(data.answers_r),
        "failed_items": json.dumps(data.failed_items),
        "followup_results": json.dumps(data.followup_results),
        "followup_fail_count": data.followup_fail_count,
        "created_at": now,
    })
    db.commit()
    return {"id": result_id, "risk_level": data.risk_level, "r_score": data.r_score}

@router.get("/results/child/{child_id}")
def get_mchat_results(child_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rows = db.execute(text("""
        SELECT id, r_score, risk_level, followup_fail_count, created_at
        FROM mchat_results
        WHERE child_id = :child_id
        ORDER BY created_at DESC
    """), {"child_id": child_id}).mappings().fetchall()
    return [dict(r) for r in rows]

@router.get("/results/{result_id}")
def get_mchat_result(result_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = db.execute(text("""
        SELECT * FROM mchat_results WHERE id = :id
    """), {"id": result_id}).mappings().fetchone()
    if not row:
        raise HTTPException(404, "Không tìm thấy kết quả")
    r = dict(row)
    for f in ('answers_r', 'failed_items', 'followup_results'):
        if r.get(f) and isinstance(r[f], str):
            r[f] = json.loads(r[f])
    return r