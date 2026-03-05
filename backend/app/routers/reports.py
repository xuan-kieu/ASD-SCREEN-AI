from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
from app.database import get_db
from app.models.assessment import Assessment
from app.models.child import Child
from app.utils.deps import get_current_user
from app.models.user import User
from datetime import date

router = APIRouter()

def calc_age_months(birth_date: date) -> int:
    today = date.today()
    return (today.year - birth_date.year) * 12 + (today.month - birth_date.month)

@router.get("/{assessment_id}")
def get_report(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")

    child = db.query(Child).filter(Child.id == assessment.child_id).first()
    report = json.loads(assessment.report_json) if assessment.report_json else {}

    return {
        "assessment_id": str(assessment.id),
        "child": {
            "id": str(child.id),
            "name": child.full_name,
            "age_months": calc_age_months(child.birth_date),
            "gender": child.gender
        },
        "status": assessment.status,
        "risk_level": assessment.risk_level,
        "overall_risk_score": float(assessment.overall_risk_score) if assessment.overall_risk_score else None,
        "report": report,
        "started_at": assessment.started_at,
        "completed_at": assessment.completed_at
    }

@router.get("/child/{child_id}/history")
def get_child_report_history(
    child_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assessments = db.query(Assessment).filter(
        Assessment.child_id == child_id,
        Assessment.status == 'completed'
    ).order_by(Assessment.completed_at.desc()).all()

    return [{
        "assessment_id": str(a.id),
        "risk_level": a.risk_level,
        "overall_risk_score": float(a.overall_risk_score) if a.overall_risk_score else None,
        "completed_at": a.completed_at
    } for a in assessments]