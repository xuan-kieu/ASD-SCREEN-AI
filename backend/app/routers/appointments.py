"""
routers/appointments.py — API đặt lịch hẹn chuyên gia
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.utils.deps import get_db, get_current_user
from pydantic import BaseModel
from typing import Optional, List
import uuid, json
from datetime import datetime, date

router = APIRouter(prefix="/appointments", tags=["appointments"])


# ── Schemas ────────────────────────────────────────────────────────────────

class SlotCreate(BaseModel):
    slot_date: str        # 'YYYY-MM-DD'
    start_time: str       # 'HH:MM'
    end_time: str         # 'HH:MM'
    location: Optional[str] = "Online"
    notes: Optional[str] = None

class SlotBulkCreate(BaseModel):
    slots: List[SlotCreate]

class AppointmentCreate(BaseModel):
    slot_id: str
    child_id: Optional[str] = None
    assessment_id: Optional[str] = None
    reason: Optional[str] = None

class AppointmentAction(BaseModel):
    action: str           # 'confirm' | 'reject' | 'complete' | 'cancel'
    reject_reason: Optional[str] = None
    specialist_notes: Optional[str] = None


# ── Helper ─────────────────────────────────────────────────────────────────

def _notify_telegram(message: str):
    """Gọi Telegram bot để gửi thông báo — import lazy để tránh circular"""
    try:
        import requests, os
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        # Lấy tất cả chat_id từ DB không dùng được ở đây vì không có db session
        # Telegram bot sẽ tự poll và xử lý — chỉ log ở đây
        print(f"[APPOINTMENT NOTIFY] {message}")
    except Exception:
        pass


# ── SPECIALIST: Quản lý slot ───────────────────────────────────────────────

@router.post("/slots", summary="Chuyên gia tạo khung giờ rảnh")
def create_slots(
    data: SlotBulkCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role not in ("specialist", "admin"):
        raise HTTPException(403, "Chỉ chuyên gia mới tạo được khung giờ")

    created = []
    for slot in data.slots:
        slot_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO specialist_slots
              (id, specialist_id, slot_date, start_time, end_time, location, notes, is_available)
            VALUES
              (:id, :specialist_id, :slot_date, :start_time, :end_time, :location, :notes, 1)
        """), {
            "id": slot_id,
            "specialist_id": str(current_user.id),
            "slot_date": slot.slot_date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "location": slot.location or "Online",
            "notes": slot.notes,
        })
        created.append(slot_id)
    db.commit()
    return {"created": len(created), "ids": created}


@router.delete("/slots/{slot_id}", summary="Chuyên gia xóa slot (nếu chưa ai đặt)")
def delete_slot(
    slot_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role not in ("specialist", "admin"):
        raise HTTPException(403, "Không có quyền")

    row = db.execute(
        text("SELECT is_available, specialist_id FROM specialist_slots WHERE id = :id"),
        {"id": slot_id}
    ).mappings().fetchone()

    if not row:
        raise HTTPException(404, "Không tìm thấy slot")
    if str(row["specialist_id"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(403, "Không phải slot của bạn")
    if not row["is_available"]:
        raise HTTPException(400, "Slot đã có người đặt, không thể xóa")

    db.execute(text("DELETE FROM specialist_slots WHERE id = :id"), {"id": slot_id})
    db.commit()
    return {"message": "Đã xóa slot"}


@router.get("/slots/available", summary="Lấy danh sách slot rảnh của tất cả chuyên gia")
def get_available_slots(
    specialist_id: Optional[str] = None,
    from_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = """
        SELECT s.id, s.specialist_id, u.full_name AS specialist_name,
               s.slot_date, s.start_time, s.end_time, s.location, s.notes
        FROM specialist_slots s
        JOIN users u ON u.id = s.specialist_id
        WHERE s.is_available = 1
          AND s.slot_date >= CAST(GETUTCDATE() AS DATE)
    """
    params = {}
    if specialist_id:
        query += " AND s.specialist_id = :specialist_id"
        params["specialist_id"] = specialist_id
    if from_date:
        query += " AND s.slot_date >= :from_date"
        params["from_date"] = from_date
    query += " ORDER BY s.slot_date, s.start_time"

    rows = db.execute(text(query), params).mappings().fetchall()
    return [dict(r) for r in rows]


@router.get("/slots/my", summary="Chuyên gia xem slot của mình")
def get_my_slots(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role not in ("specialist", "admin"):
        raise HTTPException(403, "Không có quyền")

    rows = db.execute(text("""
        SELECT s.id, s.slot_date, s.start_time, s.end_time,
               s.location, s.notes, s.is_available,
               a.id AS appointment_id,
               a.status AS appointment_status,
               u.full_name AS parent_name
        FROM specialist_slots s
        LEFT JOIN appointments a ON a.slot_id = s.id
        LEFT JOIN users u ON u.id = a.parent_id
        WHERE s.specialist_id = :specialist_id
        ORDER BY s.slot_date DESC, s.start_time
    """), {"specialist_id": str(current_user.id)}).mappings().fetchall()
    return [dict(r) for r in rows]


# ── PARENT: Đặt lịch hẹn ──────────────────────────────────────────────────

@router.post("", summary="Phụ huynh đặt lịch hẹn")
def create_appointment(
    data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role not in ("parent", "teacher", "admin"):
        raise HTTPException(403, "Không có quyền đặt lịch")

    # Kiểm tra slot còn trống không
    slot = db.execute(
        text("SELECT * FROM specialist_slots WHERE id = :id AND is_available = 1"),
        {"id": data.slot_id}
    ).mappings().fetchone()
    if not slot:
        raise HTTPException(400, "Slot không tồn tại hoặc đã bị đặt")

    # Kiểm tra parent chưa đặt slot này rồi
    existing = db.execute(
        text("SELECT id FROM appointments WHERE slot_id = :slot_id AND parent_id = :parent_id"),
        {"slot_id": data.slot_id, "parent_id": str(current_user.id)}
    ).mappings().fetchone()
    if existing:
        raise HTTPException(400, "Bạn đã đặt slot này rồi")

    appt_id = str(uuid.uuid4())
    now = datetime.utcnow()

    db.execute(text("""
        INSERT INTO appointments
          (id, slot_id, specialist_id, parent_id, child_id, assessment_id,
           status, reason, created_at, updated_at)
        VALUES
          (:id, :slot_id, :specialist_id, :parent_id, :child_id, :assessment_id,
           'pending', :reason, :now, :now)
    """), {
        "id": appt_id,
        "slot_id": data.slot_id,
        "specialist_id": str(slot["specialist_id"]),
        "parent_id": str(current_user.id),
        "child_id": data.child_id,
        "assessment_id": data.assessment_id,
        "reason": data.reason,
        "now": now,
    })

    # Đánh dấu slot là không còn available
    db.execute(
        text("UPDATE specialist_slots SET is_available = 0 WHERE id = :id"),
        {"id": data.slot_id}
    )
    db.commit()

    # Lấy tên chuyên gia và phụ huynh để thông báo
    specialist = db.execute(
        text("SELECT full_name FROM users WHERE id = :id"),
        {"id": str(slot["specialist_id"])}
    ).mappings().fetchone()
    _notify_telegram(
        f"📅 Lịch hẹn mới!\n"
        f"Phụ huynh: {current_user.full_name}\n"
        f"Chuyên gia: {specialist['full_name'] if specialist else ''}\n"
        f"Ngày: {slot['slot_date']} {slot['start_time']}–{slot['end_time']}\n"
        f"Lý do: {data.reason or 'Không ghi rõ'}"
    )

    return {"id": appt_id, "status": "pending", "message": "Đặt lịch thành công, chờ chuyên gia xác nhận"}


# ── SPECIALIST/PARENT: Xem lịch hẹn ───────────────────────────────────────

@router.get("/my", summary="Xem lịch hẹn của tôi")
def get_my_appointments(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    role = current_user.role
    uid = str(current_user.id)

    if role in ("specialist",):
        filter_col = "a.specialist_id"
    else:
        filter_col = "a.parent_id"

    query = f"""
        SELECT
            a.id, a.status, a.reason, a.reject_reason, a.specialist_notes,
            a.created_at, a.updated_at,
            s.slot_date, s.start_time, s.end_time, s.location,
            sp.full_name AS specialist_name, sp.id AS specialist_id,
            p.full_name AS parent_name, p.id AS parent_id,
            c.full_name AS child_name, c.id AS child_id
        FROM appointments a
        JOIN specialist_slots s ON s.id = a.slot_id
        JOIN users sp ON sp.id = a.specialist_id
        JOIN users p ON p.id = a.parent_id
        LEFT JOIN children c ON c.id = a.child_id
        WHERE {filter_col} = :uid
    """
    params = {"uid": uid}
    if status:
        query += " AND a.status = :status"
        params["status"] = status
    query += " ORDER BY s.slot_date DESC, s.start_time DESC"

    rows = db.execute(text(query), params).mappings().fetchall()
    return [dict(r) for r in rows]


@router.get("/{appt_id}", summary="Chi tiết cuộc hẹn")
def get_appointment(
    appt_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    row = db.execute(text("""
        SELECT
            a.id, a.status, a.reason, a.reject_reason, a.specialist_notes,
            a.created_at, a.updated_at,
            s.slot_date, s.start_time, s.end_time, s.location,
            sp.full_name AS specialist_name,
            p.full_name AS parent_name,
            c.full_name AS child_name
        FROM appointments a
        JOIN specialist_slots s ON s.id = a.slot_id
        JOIN users sp ON sp.id = a.specialist_id
        JOIN users p ON p.id = a.parent_id
        LEFT JOIN children c ON c.id = a.child_id
        WHERE a.id = :id
    """), {"id": appt_id}).mappings().fetchone()

    if not row:
        raise HTTPException(404, "Không tìm thấy cuộc hẹn")

    uid = str(current_user.id)
    if str(row.get("specialist_id", "")) != uid and \
       str(row.get("parent_id", "")) != uid and \
       current_user.role != "admin":
        raise HTTPException(403, "Không có quyền xem")

    return dict(row)


# ── SPECIALIST: Duyệt / Từ chối / Hoàn thành ──────────────────────────────

@router.patch("/{appt_id}/action", summary="Chuyên gia duyệt/từ chối/hoàn thành")
def appointment_action(
    appt_id: str,
    data: AppointmentAction,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    appt = db.execute(
        text("SELECT * FROM appointments WHERE id = :id"),
        {"id": appt_id}
    ).mappings().fetchone()

    if not appt:
        raise HTTPException(404, "Không tìm thấy cuộc hẹn")

    uid = str(current_user.id)
    role = current_user.role

    # Chuyên gia chỉ được thao tác với lịch của mình
    if role == "specialist" and str(appt["specialist_id"]) != uid:
        raise HTTPException(403, "Không phải lịch hẹn của bạn")

    # Phụ huynh chỉ được cancel
    if role == "parent" and data.action != "cancel":
        raise HTTPException(403, "Phụ huynh chỉ có thể hủy lịch")
    if role == "parent" and str(appt["parent_id"]) != uid:
        raise HTTPException(403, "Không phải lịch của bạn")

    # Kiểm tra transition hợp lệ
    valid_transitions = {
        "confirm":  ["pending"],
        "reject":   ["pending"],
        "complete": ["confirmed"],
        "cancel":   ["pending", "confirmed"],
    }
    current_status = appt["status"]
    if current_status not in valid_transitions.get(data.action, []):
        raise HTTPException(400, f"Không thể {data.action} khi trạng thái là '{current_status}'")

    status_map = {
        "confirm":  "confirmed",
        "reject":   "rejected",
        "complete": "completed",
        "cancel":   "cancelled",
    }
    new_status = status_map[data.action]
    now = datetime.utcnow()

    db.execute(text("""
        UPDATE appointments
        SET status = :status,
            reject_reason = :reject_reason,
            specialist_notes = :specialist_notes,
            updated_at = :now
        WHERE id = :id
    """), {
        "status": new_status,
        "reject_reason": data.reject_reason,
        "specialist_notes": data.specialist_notes,
        "now": now,
        "id": appt_id,
    })

    # Nếu từ chối hoặc hủy → mở lại slot
    if data.action in ("reject", "cancel"):
        db.execute(
            text("UPDATE specialist_slots SET is_available = 1 WHERE id = :id"),
            {"id": str(appt["slot_id"])}
        )

    db.commit()

    # Lấy thông tin để notify
    slot = db.execute(
        text("SELECT slot_date, start_time, end_time FROM specialist_slots WHERE id = :id"),
        {"id": str(appt["slot_id"])}
    ).mappings().fetchone()

    parent = db.execute(
        text("SELECT full_name FROM users WHERE id = :id"),
        {"id": str(appt["parent_id"])}
    ).mappings().fetchone()

    action_vi = {"confirmed": "✅ Xác nhận", "rejected": "❌ Từ chối",
                 "completed": "🏁 Hoàn thành", "cancelled": "🚫 Hủy"}
    _notify_telegram(
        f"{action_vi.get(new_status, new_status)} lịch hẹn\n"
        f"Phụ huynh: {parent['full_name'] if parent else ''}\n"
        f"Ngày: {slot['slot_date']} {slot['start_time']}–{slot['end_time']}\n"
        + (f"Lý do từ chối: {data.reject_reason}" if data.reject_reason else "")
    )

    return {"id": appt_id, "status": new_status}


# ── ADMIN: Danh sách tất cả ────────────────────────────────────────────────

@router.get("", summary="Admin xem tất cả cuộc hẹn")
def get_all_appointments(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(403, "Chỉ admin")

    query = """
        SELECT
            a.id, a.status, a.reason, a.created_at,
            s.slot_date, s.start_time, s.end_time,
            sp.full_name AS specialist_name,
            p.full_name AS parent_name,
            c.full_name AS child_name
        FROM appointments a
        JOIN specialist_slots s ON s.id = a.slot_id
        JOIN users sp ON sp.id = a.specialist_id
        JOIN users p ON p.id = a.parent_id
        LEFT JOIN children c ON c.id = a.child_id
    """
    params = {}
    if status:
        query += " WHERE a.status = :status"
        params["status"] = status
    query += " ORDER BY a.created_at DESC"

    rows = db.execute(text(query), params).mappings().fetchall()
    return [dict(r) for r in rows]
