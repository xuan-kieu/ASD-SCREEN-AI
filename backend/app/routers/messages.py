from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models.message import Message
from app.schemas import MessageCreate, MessageResponse
from app.utils.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/inbox", response_model=List[MessageResponse])
def get_inbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Message).filter(Message.to_user_id == current_user.id).all()


@router.post("/", response_model=MessageResponse)
def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = Message(
        from_user_id=current_user.id,
        to_user_id=data.to_user_id,
        child_id=data.child_id,
        content=data.content
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.patch("/{message_id}/read")
def mark_read(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(Message).filter(
        Message.id == message_id,
        Message.to_user_id == current_user.id
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn")
    msg.is_read = True
    msg.read_at = datetime.utcnow()
    db.commit()
    return {"message": "Đã đọc"}