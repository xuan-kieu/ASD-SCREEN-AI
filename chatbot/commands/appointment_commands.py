"""
chatbot/commands/appointment_commands.py
Telegram bot commands cho appointment booking
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler
from sqlalchemy import text
import json
from app.database import SessionLocal

# ── Helper ─────────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

STATUS_VI = {
    'pending':   '⏳ Chờ xác nhận',
    'confirmed': '✅ Đã xác nhận',
    'rejected':  '❌ Từ chối',
    'cancelled': '🚫 Đã hủy',
    'completed': '🏁 Hoàn thành',
}


def _get_user_by_telegram(chat_id: int, db):
    """Tìm user theo telegram_chat_id (cột cần thêm vào bảng users)"""
    row = db.execute(
        text("SELECT * FROM users WHERE telegram_chat_id = :chat_id AND is_active = 1"),
        {"chat_id": str(chat_id)}
    ).mappings().fetchone()
    return dict(row) if row else None


# ── Commands ───────────────────────────────────────────────────────────────

async def cmd_my_appointments(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /lichhén — Xem lịch hẹn của tôi
    """
    chat_id = update.effective_chat.id
    db = SessionLocal()
    try:
        user = _get_user_by_telegram(chat_id, db)
        if not user:
            await update.message.reply_text(
                "❌ Tài khoản chưa được liên kết.\n"
                "Dùng /lienket <username> <password> để liên kết."
            )
            return

        role = user['role']
        if role == 'specialist':
            filter_col = 'a.specialist_id'
        else:
            filter_col = 'a.parent_id'

        rows = db.execute(text(f"""
            SELECT TOP 10
                a.id, a.status, a.reason,
                s.slot_date, s.start_time, s.end_time,
                sp.full_name AS specialist_name,
                p.full_name AS parent_name,
                c.full_name AS child_name
            FROM appointments a
            JOIN specialist_slots s ON s.id = a.slot_id
            JOIN users sp ON sp.id = a.specialist_id
            JOIN users p ON p.id = a.parent_id
            LEFT JOIN children c ON c.id = a.child_id
            WHERE {filter_col} = :uid
              AND a.status NOT IN ('cancelled', 'completed', 'rejected')
            ORDER BY s.slot_date ASC, s.start_time ASC
        """), {"uid": str(user['id'])}).mappings().fetchall()

        if not rows:
            await update.message.reply_text("📭 Bạn chưa có lịch hẹn đang hoạt động nào.")
            return

        msg = "📅 *Lịch hẹn của bạn:*\n\n"
        for i, r in enumerate(rows, 1):
            st = STATUS_VI.get(r['status'], r['status'])
            msg += (
                f"*{i}.* {r['slot_date']} {r['start_time']}–{r['end_time']}\n"
                f"   {st}\n"
            )
            if role == 'specialist':
                msg += f"   👤 {r['parent_name']}"
            else:
                msg += f"   👨‍⚕️ {r['specialist_name']}"
            if r['child_name']:
                msg += f" · 👶 {r['child_name']}"
            msg += "\n\n"

        await update.message.reply_text(msg, parse_mode='Markdown')

    finally:
        db.close()


async def cmd_available_slots(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /khoigiorong — Xem khung giờ rảnh của chuyên gia
    """
    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT TOP 10
                s.id, s.slot_date, s.start_time, s.end_time, s.location,
                u.full_name AS specialist_name
            FROM specialist_slots s
            JOIN users u ON u.id = s.specialist_id
            WHERE s.is_available = true
              AND s.slot_date >= CAST(GETUTCDATE() AS DATE)
            ORDER BY s.slot_date, s.start_time
        """)).mappings().fetchall()

        if not rows:
            await update.message.reply_text("📭 Hiện không có khung giờ rảnh nào.")
            return

        msg = "🕐 *Khung giờ rảnh:*\n\n"
        for i, r in enumerate(rows, 1):
            msg += (
                f"*{i}.* {r['slot_date']} {r['start_time']}–{r['end_time']}\n"
                f"   👨‍⚕️ {r['specialist_name']}\n"
                f"   📍 {r['location']}\n\n"
            )

        msg += "👉 Truy cập app để đặt lịch: https://localhost:8443/appointments"
        await update.message.reply_text(msg, parse_mode='Markdown')

    finally:
        db.close()


async def cmd_specialist_pending(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /choduyet — Chuyên gia xem lịch hẹn chờ duyệt
    """
    chat_id = update.effective_chat.id
    db = SessionLocal()
    try:
        user = _get_user_by_telegram(chat_id, db)
        if not user or user['role'] != 'specialist':
            await update.message.reply_text("❌ Lệnh này chỉ dành cho chuyên gia.")
            return

        rows = db.execute(text("""
            SELECT a.id, a.reason, s.slot_date, s.start_time, s.end_time,
                   p.full_name AS parent_name, c.full_name AS child_name
            FROM appointments a
            JOIN specialist_slots s ON s.id = a.slot_id
            JOIN users p ON p.id = a.parent_id
            LEFT JOIN children c ON c.id = a.child_id
            WHERE a.specialist_id = :uid AND a.status = 'pending'
            ORDER BY s.slot_date, s.start_time
        """), {"uid": str(user['id'])}).mappings().fetchall()

        if not rows:
            await update.message.reply_text("✅ Không có lịch hẹn nào chờ duyệt.")
            return

        for r in rows:
            msg = (
                f"📥 *Lịch hẹn chờ duyệt*\n"
                f"📅 {r['slot_date']} {r['start_time']}–{r['end_time']}\n"
                f"👤 Phụ huynh: {r['parent_name']}\n"
            )
            if r['child_name']:
                msg += f"👶 Trẻ: {r['child_name']}\n"
            if r['reason']:
                msg += f"💬 Lý do: {r['reason']}\n"

            keyboard = InlineKeyboardMarkup([
                [
                    InlineKeyboardButton("✅ Xác nhận", callback_data=f"appt_confirm_{r['id']}"),
                    InlineKeyboardButton("❌ Từ chối",  callback_data=f"appt_reject_{r['id']}"),
                ]
            ])
            await update.message.reply_text(msg, parse_mode='Markdown', reply_markup=keyboard)

    finally:
        db.close()


async def callback_appointment_action(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Xử lý inline button confirm/reject từ Telegram
    """
    query = update.callback_query
    await query.answer()

    data = query.data  # 'appt_confirm_<id>' hoặc 'appt_reject_<id>'
    parts = data.split('_', 2)
    if len(parts) != 3:
        return

    _, action, appt_id = parts
    chat_id = query.from_user.id

    db = SessionLocal()
    try:
        user = _get_user_by_telegram(chat_id, db)
        if not user or user['role'] != 'specialist':
            await query.edit_message_text("❌ Không có quyền thực hiện.")
            return

        # Kiểm tra appointment
        appt = db.execute(
            text("SELECT * FROM appointments WHERE id = :id"),
            {"id": appt_id}
        ).mappings().fetchone()

        if not appt or appt['status'] != 'pending':
            await query.edit_message_text("⚠️ Lịch hẹn không còn ở trạng thái chờ duyệt.")
            return

        if str(appt['specialist_id']) != str(user['id']):
            await query.edit_message_text("❌ Không phải lịch của bạn.")
            return

        new_status = 'confirmed' if action == 'confirm' else 'rejected'
        from datetime import datetime
        db.execute(text("""
            UPDATE appointments SET status = :status, updated_at = :now WHERE id = :id
        """), {"status": new_status, "now": datetime.utcnow(), "id": appt_id})

        if action == 'reject':
            db.execute(
                text("UPDATE specialist_slots SET is_available = true WHERE id = :id"),
                {"id": str(appt['slot_id'])}
            )

        db.commit()

        # Thông báo cho phụ huynh (nếu họ có telegram)
        parent = db.execute(
            text("SELECT full_name, telegram_chat_id FROM users WHERE id = :id"),
            {"id": str(appt['parent_id'])}
        ).mappings().fetchone()

        slot = db.execute(
            text("SELECT slot_date, start_time, end_time FROM specialist_slots WHERE id = :id"),
            {"id": str(appt['slot_id'])}
        ).mappings().fetchone()

        result_text = "✅ Đã xác nhận" if action == 'confirm' else "❌ Đã từ chối"
        await query.edit_message_text(
            f"{result_text} lịch hẹn\n"
            f"📅 {slot['slot_date']} {slot['start_time']}–{slot['end_time']}\n"
            f"👤 {parent['full_name'] if parent else ''}"
        )

        # Gửi thông báo cho phụ huynh
        if parent and parent.get('telegram_chat_id'):
            action_vi = "✅ Chuyên gia đã xác nhận" if action == 'confirm' else "❌ Chuyên gia đã từ chối"
            await context.bot.send_message(
                chat_id=int(parent['telegram_chat_id']),
                text=(
                    f"{action_vi} lịch hẹn của bạn!\n"
                    f"📅 {slot['slot_date']} {slot['start_time']}–{slot['end_time']}\n"
                    f"Xem chi tiết: https://localhost:8443/appointments"
                )
            )

    finally:
        db.close()


async def cmd_link_account(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /lienket <username> <password> — Liên kết tài khoản Telegram với app
    """
    args = context.args
    if len(args) < 2:
        await update.message.reply_text("Dùng: /lienket <username> <password>")
        return

    username, password = args[0], args[1]
    chat_id = str(update.effective_chat.id)

    db = SessionLocal()
    try:
        from passlib.context import CryptContext
        from app.utils.security import verify_password

        user = db.execute(
            text("SELECT * FROM users WHERE username = :u AND is_active = 1"),
            {"u": username}
        ).mappings().fetchone()

        if not user or not verify_password(password, user['password_hash']):
            await update.message.reply_text("❌ Sai tên đăng nhập hoặc mật khẩu.")
            return

        # Lưu telegram_chat_id vào users
        db.execute(
            text("UPDATE users SET telegram_chat_id = :chat_id WHERE id = :id"),
            {"chat_id": chat_id, "id": str(user['id'])}
        )
        db.commit()

        await update.message.reply_text(
            f"✅ Đã liên kết tài khoản *{user['full_name']}* ({user['role']})\n\n"
            f"Lệnh có sẵn:\n"
            f"/lichhén — Xem lịch hẹn của tôi\n"
            f"/khoigiorong — Xem khung giờ rảnh\n"
            f"/choduyet — Lịch chờ duyệt (chuyên gia)\n",
            parse_mode='Markdown'
        )

    finally:
        db.close()


# ── Đăng ký handlers ───────────────────────────────────────────────────────

def register_appointment_handlers(application):
    """Gọi hàm này trong bot.py để đăng ký handlers"""
    application.add_handler(CommandHandler("lichhén",     cmd_my_appointments))
    application.add_handler(CommandHandler("lichhen",     cmd_my_appointments))   # không dấu
    application.add_handler(CommandHandler("khoigiorong", cmd_available_slots))
    application.add_handler(CommandHandler("choduyet",    cmd_specialist_pending))
    application.add_handler(CommandHandler("lienket",     cmd_link_account))
    application.add_handler(CallbackQueryHandler(
        callback_appointment_action, pattern=r"^appt_(confirm|reject)_"
    ))
