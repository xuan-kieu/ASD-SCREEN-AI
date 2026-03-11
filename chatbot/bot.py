import os
import logging
import requests
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    filters, ContextTypes, ConversationHandler
)

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN', '')
API_URL        = os.getenv('API_URL', 'http://backend:8000')
SECRET_KEY     = os.getenv('SECRET_KEY', '')

# Conversation states
LOGIN_USERNAME, LOGIN_PASSWORD = range(2)

# Lưu token theo chat_id
user_tokens: dict = {}

# ── Helper ───────────────────────────────────────────────
def api_get(path: str, token: str) -> dict | None:
    try:
        r = requests.get(f"{API_URL}{path}",
                         headers={"Authorization": f"Bearer {token}"}, timeout=10)
        return r.json() if r.ok else None
    except Exception as e:
        logger.error(f"API GET {path}: {e}")
        return None

def api_post(path: str, data: dict, token: str = None) -> dict | None:
    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        r = requests.post(f"{API_URL}{path}", json=data, headers=headers, timeout=10)
        return r.json() if r.ok else None
    except Exception as e:
        logger.error(f"API POST {path}: {e}")
        return None

def get_token(chat_id: int) -> str | None:
    return user_tokens.get(chat_id)

def main_keyboard():
    return ReplyKeyboardMarkup([
        [KeyboardButton("👶 Danh sách trẻ"), KeyboardButton("📊 Báo cáo gần nhất")],
        [KeyboardButton("💬 Tin nhắn"),       KeyboardButton("👤 Thông tin tôi")],
        [KeyboardButton("🚪 Đăng xuất")]
    ], resize_keyboard=True)

# ── /start ───────────────────────────────────────────────
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if get_token(chat_id):
        await update.message.reply_text(
            "✅ Bạn đã đăng nhập rồi!", reply_markup=main_keyboard()
        )
        return ConversationHandler.END

    await update.message.reply_text(
        "👋 Chào mừng đến với *ASD-SCREEN AI*\n\n"
        "🔐 Vui lòng đăng nhập để tiếp tục.\n"
        "Nhập *tên đăng nhập*:",
        parse_mode="Markdown"
    )
    return LOGIN_USERNAME

# ── Login flow ───────────────────────────────────────────
async def login_username(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    ctx.user_data['username'] = update.message.text.strip()
    await update.message.reply_text("🔑 Nhập *mật khẩu*:", parse_mode="Markdown")
    return LOGIN_PASSWORD

async def login_password(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    username = ctx.user_data.get('username', '')
    password = update.message.text.strip()

    # Xóa tin nhắn mật khẩu ngay (bảo mật)
    try:
        await update.message.delete()
    except Exception:
        pass

    result = api_post("/auth/login", {"username": username, "password": password})
    if result and result.get("access_token"):
        user_tokens[update.effective_chat.id] = result["access_token"]
        await update.message.reply_text(
            f"✅ Đăng nhập thành công!\n"
            f"👋 Xin chào *{result.get('full_name', username)}*",
            parse_mode="Markdown",
            reply_markup=main_keyboard()
        )
        return ConversationHandler.END
    else:
        await update.message.reply_text(
            "❌ Sai tên đăng nhập hoặc mật khẩu.\nNhập lại *tên đăng nhập*:",
            parse_mode="Markdown"
        )
        return LOGIN_USERNAME

async def cancel(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("❌ Đã hủy.")
    return ConversationHandler.END

# ── Handlers sau khi đăng nhập ───────────────────────────
async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    token   = get_token(chat_id)
    text    = update.message.text

    if not token:
        await update.message.reply_text("⚠️ Bạn chưa đăng nhập. Nhấn /start để đăng nhập.")
        return

    # ── Danh sách trẻ ──────────────────────────────────
    if "danh sách trẻ" in text.lower() or text == "👶 Danh sách trẻ":
        data = api_get("/children/", token)
        if not data:
            await update.message.reply_text("❌ Không lấy được danh sách trẻ.")
            return
        if len(data) == 0:
            await update.message.reply_text("📭 Chưa có trẻ nào trong hệ thống.")
            return
        msg = "👶 *Danh sách trẻ:*\n\n"
        for c in data[:10]:  # giới hạn 10
            gender = "👦" if c.get("gender") == "male" else "👧"
            msg += f"{gender} *{c['full_name']}* — {c['age_months']} tháng\n"
        if len(data) > 10:
            msg += f"\n_...và {len(data)-10} trẻ khác_"
        await update.message.reply_text(msg, parse_mode="Markdown")

    # ── Báo cáo gần nhất ───────────────────────────────
    elif "báo cáo" in text.lower() or text == "📊 Báo cáo gần nhất":
        children = api_get("/children/", token)
        if not children:
            await update.message.reply_text("❌ Không lấy được dữ liệu.")
            return
        msg = "📊 *Báo cáo gần nhất:*\n\n"
        found = False
        for c in children[:5]:
            assessments = api_get(f"/assessments/child/{c['id']}", token)
            if not assessments:
                continue
            completed = [a for a in assessments if a.get("status") == "completed" and a.get("overall_risk_score")]
            if not completed:
                continue
            latest = sorted(completed, key=lambda x: x["started_at"], reverse=True)[0]
            risk = latest.get("risk_level", "N/A")
            score = latest.get("overall_risk_score", 0)
            emoji = {"THẤP": "✅", "TRUNG BÌNH": "⚠️", "CAO": "🔶", "RẤT CAO": "🚨"}.get(risk, "📊")
            msg += f"{emoji} *{c['full_name']}*: {score}/100 — {risk}\n"
            found = True
        if not found:
            msg = "📭 Chưa có báo cáo nào hoàn thành."
        await update.message.reply_text(msg, parse_mode="Markdown")

    # ── Tin nhắn ───────────────────────────────────────
    elif "tin nhắn" in text.lower() or text == "💬 Tin nhắn":
        data = api_get("/messages/inbox", token)
        if not data:
            await update.message.reply_text("📭 Không có tin nhắn nào.")
            return
        unread = [m for m in data if not m.get("is_read")]
        msg = f"💬 *Hộp thư đến* ({len(data)} tin, {len(unread)} chưa đọc):\n\n"
        for m in data[:5]:
            read_icon = "🔵" if not m.get("is_read") else "⚪"
            msg += f"{read_icon} *{m.get('sender_name', 'N/A')}*: {m.get('content', '')[:50]}...\n"
        await update.message.reply_text(msg, parse_mode="Markdown")

    # ── Thông tin tôi ──────────────────────────────────
    elif "thông tin" in text.lower() or text == "👤 Thông tin tôi":
        data = api_get("/auth/me", token)
        if not data:
            await update.message.reply_text("❌ Không lấy được thông tin.")
            return
        role_map = {"admin": "👑 Quản trị viên", "teacher": "👩‍🏫 Giáo viên",
                    "specialist": "🩺 Chuyên gia", "parent": "👨‍👩‍👦 Phụ huynh"}
        msg = (f"👤 *Thông tin tài khoản:*\n\n"
               f"Họ tên: *{data.get('full_name')}*\n"
               f"Username: `{data.get('username')}`\n"
               f"Vai trò: {role_map.get(data.get('role'), data.get('role'))}\n")
        await update.message.reply_text(msg, parse_mode="Markdown")

    # ── Đăng xuất ──────────────────────────────────────
    elif "đăng xuất" in text.lower() or text == "🚪 Đăng xuất":
        user_tokens.pop(chat_id, None)
        await update.message.reply_text(
            "✅ Đã đăng xuất.\nNhấn /start để đăng nhập lại.",
            reply_markup={"remove_keyboard": True}
        )

    else:
        await update.message.reply_text(
            "❓ Không hiểu lệnh. Dùng menu bên dưới hoặc /help.",
            reply_markup=main_keyboard()
        )

async def help_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📖 *Hướng dẫn sử dụng:*\n\n"
        "/start — Đăng nhập\n"
        "/help — Xem hướng dẫn\n\n"
        "Sau khi đăng nhập dùng menu:\n"
        "👶 Xem danh sách trẻ\n"
        "📊 Xem báo cáo gần nhất\n"
        "💬 Xem tin nhắn\n"
        "👤 Thông tin tài khoản\n"
        "🚪 Đăng xuất",
        parse_mode="Markdown"
    )

# ── Main ─────────────────────────────────────────────────
def main():
    if not TELEGRAM_TOKEN:
        logger.error("❌ TELEGRAM_TOKEN chưa được set!")
        return

    app = Application.builder().token(TELEGRAM_TOKEN).build()

    # Login conversation
    conv = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            LOGIN_USERNAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, login_username)],
            LOGIN_PASSWORD: [MessageHandler(filters.TEXT & ~filters.COMMAND, login_password)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    app.add_handler(conv)
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("🤖 ASD-SCREEN chatbot đang chạy...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()