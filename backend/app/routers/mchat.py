"""
routers/mchat.py — API lưu & xem kết quả M-CHAT-R/F
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.utils.deps import get_db, get_current_user
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid, json
from datetime import datetime
import logging

router = APIRouter(prefix="/mchat", tags=["mchat"])
logger = logging.getLogger(__name__)

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
    params: Dict[str, Any] = {
        "id": result_id,
        "child_id": data.child_id,
        "created_by": str(current_user.id),
        "parent_id": str(current_user.id),
        "r_score": data.r_score,
        "risk_level": data.risk_level,
        "answers_r": json.dumps(data.answers_r),
        "failed_items": json.dumps(data.failed_items),
        "followup_results": json.dumps(data.followup_results),
        "followup_fail_count": data.followup_fail_count,
        # Older schema uses a single JSON column `answers`
        "answers": json.dumps({
            "answers_r": data.answers_r,
            "failed_items": data.failed_items,
            "followup_results": data.followup_results,
        }),
        "created_at": now,
    }
    try:
        columns = db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'mchat_results'
        """)).scalars().all()
        colset = set(columns)

        if not colset:
            raise HTTPException(500, "Bảng mchat_results chưa tồn tại trên database")

        # Build INSERT dynamically based on actual production schema.
        values: Dict[str, Any] = {"id": params["id"], "child_id": params["child_id"]}
        if "created_by" in colset:
            values["created_by"] = params["created_by"]
        elif "parent_id" in colset:
            values["parent_id"] = params["parent_id"]

        if "r_score" in colset:
            values["r_score"] = params["r_score"]
        if "risk_level" in colset:
            values["risk_level"] = params["risk_level"]
        if "answers_r" in colset:
            values["answers_r"] = params["answers_r"]
        if "failed_items" in colset:
            values["failed_items"] = params["failed_items"]
        if "followup_results" in colset:
            values["followup_results"] = params["followup_results"]
        if "answers" in colset:
            values["answers"] = params["answers"]
        if "followup_fail_count" in colset:
            values["followup_fail_count"] = params["followup_fail_count"]
        if "created_at" in colset:
            values["created_at"] = params["created_at"]

        col_sql = ", ".join(values.keys())
        val_sql = ", ".join(f":{k}" for k in values.keys())
        db.execute(text(f"INSERT INTO mchat_results ({col_sql}) VALUES ({val_sql})"), values)
    except SQLAlchemyError as e:
        db.rollback()
        logger.exception("Failed saving mchat result due to DB schema/query error")
        raise HTTPException(500, "Không thể lưu kết quả M-CHAT lúc này") from e
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
    # Backward compatibility: legacy schema stores everything in `answers`.
    if (not r.get('answers_r') or not r.get('followup_results')) and r.get('answers'):
        try:
            payload = json.loads(r['answers']) if isinstance(r['answers'], str) else r['answers']
            if isinstance(payload, dict):
                r['answers_r'] = payload.get('answers_r', r.get('answers_r'))
                r['failed_items'] = payload.get('failed_items', r.get('failed_items'))
                r['followup_results'] = payload.get('followup_results', r.get('followup_results'))
        except Exception:
            pass
    return r
