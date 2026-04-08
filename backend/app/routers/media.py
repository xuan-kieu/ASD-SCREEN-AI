from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.assessment import Assessment
from app.models.user import User
from app.utils.deps import get_current_user

router = APIRouter(prefix="/media", tags=["Media"])


class RegisterAssessmentMediaRequest(BaseModel):
    original_video_path: str


@router.post("/assessments/{assessment_id}/register")
def register_assessment_media(
    assessment_id: str,
    payload: RegisterAssessmentMediaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Khong tim thay assessment")

    delete_after = datetime.utcnow() + timedelta(days=settings.ORIGINAL_RETENTION_DAYS)
    db.execute(
        text(
            """
            INSERT INTO assessment_media
              (assessment_id, child_id, original_video_path, anonymization_status, delete_original_after, created_at, updated_at)
            VALUES
              (:assessment_id, :child_id, :original_video_path, 'pending', :delete_after, NOW(), NOW())
            """
        ),
        {
            "assessment_id": assessment_id,
            "child_id": str(assessment.child_id),
            "original_video_path": payload.original_video_path,
            "delete_after": delete_after,
        },
    )
    db.commit()
    return {
        "message": "Da dang ky media cho assessment",
        "assessment_id": assessment_id,
        "original_video_path": payload.original_video_path,
        "delete_original_after": delete_after.isoformat(),
    }
