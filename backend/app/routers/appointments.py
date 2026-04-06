from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.utils.deps import get_db, get_current_user
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

router = APIRouter(tags=["Appointments"])


# ── Schemas ────────────────────────────────────────────────────────────────

class SlotCreate(BaseModel):
    slot_date:  str
    start_time: str
    end_time:   str
    location:   Optional[str] = "Online"
    notes:      Optional[str] = None

class SlotBulkCreate(BaseModel):
    slots: List[SlotCreate]

class AppointmentCreate(BaseModel):
    slot_id:       str
    child_id:      Optional[str] = None
    assessment_id: Optional[str] = None
    reason:        Optional[str] = None

class AppointmentAction(BaseModel):
    action:           str
    reject_reason:    Optional[str] = None
    specialist_notes: Optional[str] = None


# ── Helper ─────────────────────────────────────────────────────────────────

def _notify(message: str):
    print(f"[APPOINTMENT] {message}")


# ── SPECIALIST/ADMIN: Quản lý slot ────────────────────────────────────────

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
              (:id, :specialist_id, :slot_date, :start_time, :end_time, :location, :notes, true)
        """), {
            "id":            slot_id,
            "specialist_id": str(current_user.id),
            "slot_date":     slot.slot_date,
            "start_time":    slot.start_time,
            "end_time":      slot.end_time,
            "location":      slot.location or "Online",
            "notes":         slot.notes,
        })
        created.append(slot_id)
    db.commit()
    return {"created": len(created), "ids": created}


@router.delete("/slots/{slot_id}", summary="Xóa slot chưa ai đặt")
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


@router.get("/slots/available", summary="Lấy slot rảnh")
def get_available_slots(
    specialist_id: Optional[str] = None,
    from_date:     Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Fix: is_available = true (PostgreSQL boolean)
    query = """
        SELECT s.id, s.specialist_id, u.full_name AS specialist_name,
               s.slot_date, s.start_time, s.end_time, s.location, s.notes
        FROM specialist_slots s
        JOIN users u ON u.id = s.specialist_id
        WHERE s.is_available = true
          AND s.slot_date >= CAST(NOW() AS DATE)
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
               a.id           AS appointment_id,
               a.status       AS appointment_status,
               u.full_name    AS parent_name
        FROM specialist_slots s
        LEFT JOIN appointments a ON a.slot_id = s.id
        LEFT JOIN users u        ON u.id = a.parent_id
        WHERE s.specialist_id = :specialist_id
        ORDER BY s.slot_date DESC, s.start_time
    """), {"specialist_id": str(current_user.id)}).mappings().fetchall()
    return [dict(r) for r in rows]


# ── ĐẶT LỊCH ──────────────────────────────────────────────────────────────

@router.post("", summary="Đặt lịch hẹn")
def create_appointment(
    data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role not in ("parent", "teacher", "specialist", "admin"):
        raise HTTPException(403, "Không có quyền đặt lịch")

    # Fix: is_available = true
    slot = db.execute(
        text("SELECT * FROM specialist_slots WHERE id = :id AND is_available = true"),
        {"id": data.slot_id}
    ).mappings().fetchone()
    if not slot:
        raise HTTPException(400, "Slot không tồn tại hoặc đã bị đặt")

    if current_user.role == "specialist" and str(slot["specialist_id"]) == str(current_user.id):
        raise HTTPException(400, "Không thể đặt lịch cho slot của chính mình")

    existing = db.execute(
        text("SELECT id FROM appointments WHERE slot_id = :slot_id AND parent_id = :parent_id"),
        {"slot_id": data.slot_id, "parent_id": str(current_user.id)}
    ).mappings().fetchone()
    if existing:
        raise HTTPException(400, "Bạn đã đặt slot này rồi")

    appt_id = str(uuid.uuid4())
    now     = datetime.utcnow()

    db.execute(text("""
        INSERT INTO appointments
          (id, slot_id, specialist_id, parent_id, child_id, assessment_id,
           status, reason, created_at, updated_at)
        VALUES
          (:id, :slot_id, :specialist_id, :parent_id, :child_id, :assessment_id,
           'pending', :reason, :now, :now)
    """), {
        "id":            appt_id,
        "slot_id":       data.slot_id,
        "specialist_id": str(slot["specialist_id"]),
        "parent_id":     str(current_user.id),
        "child_id":      data.child_id,
        "assessment_id": data.assessment_id,
        "reason":        data.reason,
        "now":           now,
    })

    # Fix: is_available = false
    db.execute(
        text("UPDATE specialist_slots SET is_available = false WHERE id = :id"),
        {"id": data.slot_id}
    )
    db.commit()

    specialist = db.execute(
        text("SELECT full_name FROM users WHERE id = :id"),
        {"id": str(slot["specialist_id"])}
    ).mappings().fetchone()

    _notify(
        f"📅 Lịch hẹn mới!\n"
        f"Người đặt: {current_user.full_name} ({current_user.role})\n"
        f"Chuyên gia: {specialist['full_name'] if specialist else ''}\n"
        f"Ngày: {slot['slot_date']} {slot['start_time']}–{slot['end_time']}"
    )

    return {"id": appt_id, "status": "pending", "message": "Đặt lịch thành công, chờ chuyên gia xác nhận"}


# ── XEM LỊCH ──────────────────────────────────────────────────────────────

@router.get("/my", summary="Xem lịch hẹn của tôi")
def get_my_appointments(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    role = current_user.role
    uid  = str(current_user.id)
    filter_col = "a.specialist_id" if role == "specialist" else "a.parent_id"

    query = f"""
        SELECT
            a.id, a.status, a.reason, a.reject_reason, a.specialist_notes,
            a.created_at, a.updated_at,
            s.slot_date, s.start_time, s.end_time, s.location,
            sp.full_name AS specialist_name, sp.id AS specialist_id,
            p.full_name  AS parent_name,     p.id  AS parent_id,
            c.full_name  AS child_name,      c.id  AS child_id
        FROM appointments a
        JOIN specialist_slots s ON s.id = a.slot_id
        JOIN users sp           ON sp.id = a.specialist_id
        JOIN users p            ON p.id  = a.parent_id
        LEFT JOIN children c    ON c.id  = a.child_id
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
            sp.full_name AS specialist_name, sp.id AS specialist_id,
            p.full_name  AS parent_name,     p.id  AS parent_id,
            c.full_name  AS child_name
        FROM appointments a
        JOIN specialist_slots s ON s.id = a.slot_id
        JOIN users sp           ON sp.id = a.specialist_id
        JOIN users p            ON p.id  = a.parent_id
        LEFT JOIN children c    ON c.id  = a.child_id
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


# ── ACTION ─────────────────────────────────────────────────────────────────

@router.patch("/{appt_id}/action", summary="Duyệt/từ chối/hoàn thành/hủy")
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

    uid  = str(current_user.id)
    role = current_user.role

    if role == "specialist" and str(appt["specialist_id"]) != uid:
        raise HTTPException(403, "Không phải lịch hẹn của bạn")
    if role in ("parent", "teacher") and data.action != "cancel":
        raise HTTPException(403, "Chỉ có thể hủy lịch")
    if role in ("parent", "teacher") and str(appt["parent_id"]) != uid:
        raise HTTPException(403, "Không phải lịch của bạn")

    valid_transitions = {
        "confirm":  ["pending"],
        "reject":   ["pending"],
        "complete": ["confirmed"],
        "cancel":   ["pending", "confirmed"],
    }
    if appt["status"] not in valid_transitions.get(data.action, []):
        raise HTTPException(400, f"Không thể {data.action} khi trạng thái là '{appt['status']}'")

    status_map = {
        "confirm":  "confirmed",
        "reject":   "rejected",
        "complete": "completed",
        "cancel":   "cancelled",
    }
    new_status = status_map[data.action]

    db.execute(text("""
        UPDATE appointments
        SET status = :status,
            reject_reason    = :reject_reason,
            specialist_notes = :specialist_notes,
            updated_at = NOW()
        WHERE id = :id
    """), {
        "status":           new_status,
        "reject_reason":    data.reject_reason,
        "specialist_notes": data.specialist_notes,
        "id":               appt_id,
    })

    # Fix: is_available = true/false
    if data.action in ("reject", "cancel"):
        db.execute(
            text("UPDATE specialist_slots SET is_available = true WHERE id = :id"),
            {"id": str(appt["slot_id"])}
        )

    db.commit()
    return {"id": appt_id, "status": new_status}


# ── ADMIN: Tất cả lịch hẹn ────────────────────────────────────────────────

@router.get("", summary="Admin xem tất cả")
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
            p.full_name  AS parent_name,
            c.full_name  AS child_name
        FROM appointments a
        JOIN specialist_slots s ON s.id = a.slot_id
        JOIN users sp           ON sp.id = a.specialist_id
        JOIN users p            ON p.id  = a.parent_id
        LEFT JOIN children c    ON c.id  = a.child_id
    """
    params = {}
    if status:
        query += " WHERE a.status = :status"
        params["status"] = status
    query += " ORDER BY a.created_at DESC"

    rows = db.execute(text(query), params).mappings().fetchall()
    return [dict(r) for r in rows]