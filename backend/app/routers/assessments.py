from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import date
import uuid
import json
from app.database import get_db
from app.models.assessment import Assessment
from app.models.child import Child
from app.schemas import AssessmentCreate, AssessmentResponse, AssessmentCompleteRequest
from app.utils.deps import get_current_user
from app.models.user import User
from app.services.ai.scoring_engine import calculate_developmental_score
from app.services.report_service import generate_report
from app.tasks.anonymization_tasks import anonymize_assessment_media

router = APIRouter()
MIN_AGE_MONTHS = 12
MAX_AGE_MONTHS = 60


def assessment_to_dict(a):
    return {
        "id": str(a.id),
        "child_id": str(a.child_id),
        "status": a.status,
        "overall_risk_score": float(a.overall_risk_score) if a.overall_risk_score else None,
        "risk_level": a.risk_level,
        "started_at": a.started_at,
        "completed_at": a.completed_at,
        "ai_training_consent": getattr(a, "ai_training_consent", None),
    }


def ensure_assessment_consent_column(db: Session):
    """
    Lightweight runtime migration for deployments without Alembic.
    Safe to call multiple times on PostgreSQL.
    """
    db.execute(text("""
        ALTER TABLE assessments
        ADD COLUMN IF NOT EXISTS ai_training_consent BOOLEAN
    """))


@router.post("/", response_model=AssessmentResponse)
def create_assessment(
    data: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_assessment_consent_column(db)
    child = db.query(Child).filter(Child.id == data.child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Không tìm thấy trẻ")
    today = date.today()
    age_months = (today.year - child.birth_date.year) * 12 + (today.month - child.birth_date.month)
    if age_months < MIN_AGE_MONTHS:
        raise HTTPException(
            status_code=400,
            detail=f"Hệ thống chỉ hỗ trợ trẻ từ {MIN_AGE_MONTHS} tháng tuổi trở lên",
        )
    if age_months > MAX_AGE_MONTHS:
        raise HTTPException(
            status_code=400,
            detail=f"Hệ thống chỉ hỗ trợ trẻ tối đa {MAX_AGE_MONTHS} tháng tuổi",
        )

    new_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO assessments (id, child_id, started_by, status)
        VALUES (:id, :child_id, :started_by, 'in_progress')
    """), {
        "id": new_id,
        "child_id": str(data.child_id),
        "started_by": str(current_user.id)
    })
    db.commit()

    assessment = db.query(Assessment).filter(Assessment.id == new_id).first()
    return assessment_to_dict(assessment)


@router.get("/child/{child_id}", response_model=List[AssessmentResponse])
def get_child_assessments(
    child_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_assessment_consent_column(db)
    assessments = db.query(Assessment).filter(Assessment.child_id == child_id).all()
    return [assessment_to_dict(a) for a in assessments]


@router.get("/{assessment_id}", response_model=AssessmentResponse)
def get_assessment(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_assessment_consent_column(db)
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên đánh giá")
    return assessment_to_dict(assessment)


@router.post("/{assessment_id}/features")
def save_features(
    assessment_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lưu features từ game vào game_sessions"""
    game_code = payload.get('game_code', '')
    features  = payload.get('features', [])

    if not features:
        return {"saved": 0}

    seq_result = db.execute(text("""
        SELECT COALESCE(MAX(sequence_order), 0) + 1
        FROM game_sessions WHERE assessment_id = :aid
    """), {"aid": assessment_id}).scalar()

    session_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO game_sessions
            (id, assessment_id, game_code, sequence_order, raw_features, created_at)
        VALUES
            (:id, :assessment_id, :game_code, :seq, :raw_features, NOW())
    """), {
        "id":            session_id,
        "assessment_id": assessment_id,
        "game_code":     game_code,
        "seq":           seq_result,
        "raw_features":  json.dumps(features, ensure_ascii=False),
    })
    db.commit()

    return {"saved": len(features), "session_id": session_id}


@router.patch("/{assessment_id}/complete")
def complete_assessment(
    assessment_id: str,
    payload: AssessmentCompleteRequest = Body(default_factory=AssessmentCompleteRequest),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_assessment_consent_column(db)
    """Hoàn thành assessment + tính điểm từ tất cả game_sessions"""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên đánh giá")

    child = db.query(Child).filter(Child.id == assessment.child_id).first()

    sessions = db.execute(text("""
        SELECT game_code, raw_features FROM game_sessions
        WHERE assessment_id = :id
        ORDER BY sequence_order
    """), {"id": assessment_id}).fetchall()

    game_features = {}
    for session in sessions:
        code     = session[0]
        features = json.loads(session[1]) if session[1] else []
        if code not in game_features:
            game_features[code] = []
        game_features[code].extend(features)

    today = date.today()
    age_months = (today.year - child.birth_date.year) * 12 + \
                 (today.month - child.birth_date.month)
    if age_months < MIN_AGE_MONTHS or age_months > MAX_AGE_MONTHS:
        raise HTTPException(
            status_code=400,
            detail=f"Độ tuổi ngoài phạm vi hỗ trợ ({MIN_AGE_MONTHS}-{MAX_AGE_MONTHS} tháng)",
        )

    if game_features:
        scoring_result = calculate_developmental_score(age_months, game_features)
        report         = generate_report(
            child.full_name, age_months, assessment_id, scoring_result
        )
        risk_level     = scoring_result['risk_level']
        weighted_score = scoring_result['weighted_score']
        report_json    = json.dumps(report, ensure_ascii=False, default=str)
    else:
        risk_level     = None
        weighted_score = None
        report_json    = None

    ensure_assessment_consent_column(db)
    db.execute(text("""
        UPDATE assessments
        SET status             = 'completed',
            completed_at       = NOW(),
            overall_risk_score = :score,
            risk_level         = :risk_level,
            report_json        = :report_json,
            ai_training_consent = COALESCE(:ai_training_consent, ai_training_consent)
        WHERE id = :id
    """), {
        "id":          assessment_id,
        "score":       weighted_score,
        "risk_level":  risk_level,
        "report_json": report_json,
        "ai_training_consent": payload.ai_training_consent,
    })
    db.commit()
    enqueue_ok = False
    task_id = None
    if payload.ai_training_consent is True:
        try:
            job = anonymize_assessment_media.delay(
                assessment_id=assessment_id,
                child_id=str(assessment.child_id),
                meta={"trigger": "assessment_complete"},
            )
            enqueue_ok = True
            task_id = job.id
        except Exception:
            enqueue_ok = False

    return {
        "message":    "Hoàn thành đánh giá",
        "risk_level": risk_level,
        "score":      weighted_score,
        "anonymization_job_queued": enqueue_ok,
        "anonymization_task_id": task_id,
    }
