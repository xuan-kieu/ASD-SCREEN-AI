from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime
import uuid
from app.database import get_db
from app.models.user import User
from app.utils.deps import get_current_user

router = APIRouter()


@router.get("/inbox")
def get_inbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rows = db.execute(text("""
        SELECT
            m.id, m.content, m.is_read, m.created_at, m.read_at,
            m.child_id,
            u.full_name AS from_name,
            u.username  AS from_username,
            c.full_name AS child_name
        FROM messages m
        LEFT JOIN users u  ON m.from_user_id = u.id
        LEFT JOIN children c ON m.child_id = c.id
        WHERE m.to_user_id = :uid
        ORDER BY m.created_at DESC
    """), {"uid": str(current_user.id)}).mappings().fetchall()

    return [
        {
            "id":            str(r["id"]),
            "content":       r["content"],
            "is_read":       r["is_read"],
            "created_at":    str(r["created_at"]),
            "read_at":       str(r["read_at"]) if r["read_at"] else None,
            "child_id":      str(r["child_id"]) if r["child_id"] else None,
            "child_name":    r["child_name"],
            "from_name":     r["from_name"] or r["from_username"] or "Ẩn danh",
        }
        for r in rows
    ]


@router.get("/sent")
def get_sent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rows = db.execute(text("""
        SELECT
            m.id, m.content, m.is_read, m.created_at, m.read_at,
            m.child_id,
            u.full_name AS to_name,
            c.full_name AS child_name
        FROM messages m
        LEFT JOIN users u    ON m.to_user_id = u.id
        LEFT JOIN children c ON m.child_id = c.id
        WHERE m.from_user_id = :uid
        ORDER BY m.created_at DESC
    """), {"uid": str(current_user.id)}).mappings().fetchall()

    return [
        {
            "id":         str(r["id"]),
            "content":    r["content"],
            "is_read":    r["is_read"],
            "created_at": str(r["created_at"]),
            "read_at":    str(r["read_at"]) if r["read_at"] else None,
            "child_id":   str(r["child_id"]) if r["child_id"] else None,
            "child_name": r["child_name"],
            "to_name":    r["to_name"] or "Ẩn danh",
        }
        for r in rows
    ]


@router.post("/")
def send_message(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    to_user_id = payload.get("to_user_id")
    child_id   = payload.get("child_id") or None
    content    = payload.get("content", "").strip()

    if not to_user_id or not content:
        raise HTTPException(status_code=400, detail="Thiếu to_user_id hoặc content")

    # Kiểm tra người nhận tồn tại
    recipient = db.execute(text(
        "SELECT id FROM users WHERE id = :id"
    ), {"id": to_user_id}).fetchone()
    if not recipient:
        raise HTTPException(status_code=404, detail="Không tìm thấy người nhận")

    msg_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO messages (id, from_user_id, to_user_id, child_id, content, is_read, created_at)
        VALUES (:id, :from_id, :to_id, :child_id, :content, 0, GETDATE())
    """), {
        "id":       msg_id,
        "from_id":  str(current_user.id),
        "to_id":    to_user_id,
        "child_id": child_id,
        "content":  content,
    })
    db.commit()

    return {"id": msg_id, "message": "Đã gửi"}


@router.patch("/{message_id}/read")
def mark_read(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = db.execute(text("""
        UPDATE messages
        SET is_read = 1, read_at = GETDATE()
        WHERE id = :id AND to_user_id = :uid
    """), {"id": message_id, "uid": str(current_user.id)})
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn")
    return {"message": "Đã đọc"}


@router.get("/users")
def get_users_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách users để chọn người nhận"""
    rows = db.execute(text("""
        SELECT id, full_name, username, role
        FROM users
        WHERE is_active = 1 AND id != :uid
        ORDER BY full_name
    """), {"uid": str(current_user.id)}).mappings().fetchall()

    return [
        {
            "id":        str(r["id"]),
            "full_name": r["full_name"],
            "username":  r["username"],
            "role":      r["role"],
        }
        for r in rows
    ]