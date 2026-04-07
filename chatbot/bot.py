import os
import logging
import requests
from datetime import datetime
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import (
    Application, CommandHandler, MessageHandler, CallbackQueryHandler,
    filters, ContextTypes, ConversationHandler
)

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN', '')
API_URL        = os.getenv('API_URL', 'http://backend:8000')

# Conversation states
LOGIN_USERNAME, LOGIN_PASSWORD = range(2)
SEND_MSG_TO, SEND_MSG_CONTENT  = range(10, 12)
SEARCH_CHILD                   = 20

user_tokens: dict = {}
user_roles:  dict = {}  # chat_id → role

# ── Helpers ──────────────────────────────────────────────────────────────────
def api_get(path, token):
    try:
        r = requests.get(
            f"{API_URL}{path}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        return r.json() if r.ok else None
    except requests.exceptions.Timeout:
        logger.warning(f"GET {path}: timeout sau 10 giây")
        return None
    except requests.exceptions.ConnectionError:
        logger.error(f"GET {path}: không kết nối được đến {API_URL}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"GET {path}: lỗi request — {e}")
        return None

def api_post(path, data, token=None):
    try:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        r = requests.post(
            f"{API_URL}{path}",
            json=data,
            headers=headers,
            timeout=10
        )
        return r.json() if r.ok else None
    except requests.exceptions.Timeout:
        logger.warning(f"POST {path}: timeout sau 10 giây")
        return None
    except requests.exceptions.ConnectionError:
        logger.error(f"POST {path}: không kết nối được đến {API_URL}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"POST {path}: lỗi request — {e}")
        return None

def get_token(chat_id):
    return user_tokens.get(chat_id)

def get_role(chat_id):
    return user_roles.get(chat_id, '')

def fmt_date(s):
    try:
        return datetime.fromisoformat(s.replace('Z','')).strftime('%d/%m/%Y')
    except:
        return s or 'N/A'

def fmt_datetime(s):
    try:
        return datetime.fromisoformat(s.replace('Z','')).strftime('%d/%m/%Y %H:%M')
    except:
        return s or 'N/A'

RISK_EMOJI = {'THẤP': '✅', 'TRUNG BÌNH': '⚠️', 'CAO': '🔶', 'RẤT CAO': '🚨'}
ROLE_MAP   = {'admin': '👑 Quản trị', 'teacher': '👩‍🏫 Giáo viên',
              'specialist': '🩺 Chuyên gia', 'parent': '👨‍👩‍👦 Phụ huynh'}

# ── Keyboards theo role ───────────────────────────────────────────────────────
def main_keyboard(role=''):
    base = [
        [KeyboardButton("👶 Danh sách trẻ"), KeyboardButton("📊 Báo cáo gần nhất")],
        [KeyboardButton("💬 Tin nhắn"),       KeyboardButton("👤 Thông tin tôi")],
    ]
    if role in ('admin', 'teacher', 'specialist'):
        base.insert(1, [KeyboardButton("🔍 Tìm trẻ"), KeyboardButton("📋 M-CHAT gần nhất")])
    if role == 'admin':
        base.insert(2, [KeyboardButton("📈 Thống kê hệ thống")])
    base.append([KeyboardButton("🚪 Đăng xuất")])
    return ReplyKeyboardMarkup(base, resize_keyboard=True)

# ── /start & Login ────────────────────────────────────────────────────────────
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if get_token(chat_id):
        await update.message.reply_text(
            "✅ Bạn đã đăng nhập rồi!",
            reply_markup=main_keyboard(get_role(chat_id))
        )
        return ConversationHandler.END
    await update.message.reply_text(
        "👋 Chào mừng đến *ASD-SCREEN AI*\n\n"
        "🔐 Vui lòng đăng nhập để tiếp tục.\n"
        "Nhập *tên đăng nhập*:",
        parse_mode="Markdown"
    )
    return LOGIN_USERNAME

async def login_username(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    ctx.user_data['username'] = update.message.text.strip()
    await update.message.reply_text("🔑 Nhập *mật khẩu*:", parse_mode="Markdown")
    return LOGIN_PASSWORD

async def login_password(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    username = ctx.user_data.get('username', '')
    password = update.message.text.strip()
    try:
        await update.message.delete()
    except:
        pass
    result = api_post("/auth/login", {"username": username, "password": password})
    if result and result.get("access_token"):
        chat_id = update.effective_chat.id
        user_tokens[chat_id] = result["access_token"]
        role = result.get('role', '')
        user_roles[chat_id]  = role
        await update.message.reply_text(
            f"✅ Đăng nhập thành công!\n"
            f"👋 Xin chào *{result.get('full_name', username)}*\n"
            f"Vai trò: {ROLE_MAP.get(role, role)}",
            parse_mode="Markdown",
            reply_markup=main_keyboard(role)
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

# ── Danh sách trẻ ─────────────────────────────────────────────────────────────
async def cmd_children(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token = get_token(update.effective_chat.id)
    data  = api_get("/children/", token)
    if not data:
        await update.message.reply_text("❌ Không lấy được danh sách trẻ.")
        return
    if len(data) == 0:
        await update.message.reply_text("📝 Chưa có trẻ nào trong hệ thống.")
        return
    msg = f"👶 *Danh sách trẻ ({len(data)} trẻ):*\n\n"
    for c in data[:15]:
        gender = "👦" if c.get("gender") == "male" else "👧"
        msg += f"{gender} *{c['full_name']}* — {c['age_months']} tháng\n"
    if len(data) > 15:
        msg += f"\n_...và {len(data)-15} trẻ khác_"
    await update.message.reply_text(msg, parse_mode="Markdown")

# ── Báo cáo gần nhất ──────────────────────────────────────────────────────────
async def cmd_reports(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token    = get_token(update.effective_chat.id)
    children = api_get("/children/", token)
    if not children:
        await update.message.reply_text("❌ Không lấy được dữ liệu.")
        return
    msg   = "📊 *Báo cáo gần nhất:*\n\n"
    found = False
    for c in children[:8]:
        assessments = api_get(f"/assessments/child/{c['id']}", token)
        if not assessments:
            continue
        completed = [a for a in assessments if a.get("status") == "completed" and a.get("overall_risk_score")]
        if not completed:
            continue
        latest = sorted(completed, key=lambda x: x["started_at"], reverse=True)[0]
        risk   = latest.get("risk_level", "N/A")
        score  = latest.get("overall_risk_score", 0)
        emoji  = RISK_EMOJI.get(risk, "📊")
        date   = fmt_date(latest.get("started_at", ""))
        msg   += f"{emoji} *{c['full_name']}*\n"
        msg   += f"   Điểm: {score}/100 — {risk} — {date}\n\n"
        found  = True
    if not found:
        msg = "📝 Chưa có báo cáo nào hoàn thành."
    await update.message.reply_text(msg, parse_mode="Markdown")

# ── Tin nhắn ─────────────────────────────────────────────────────────────────
async def cmd_messages(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token = get_token(update.effective_chat.id)
    data  = api_get("/messages/inbox", token)
    if data is None:
        await update.message.reply_text("❌ Không lấy được tin nhắn.")
        return
    if len(data) == 0:
        await update.message.reply_text("📭 Hộp thư trống.")
        return
    unread = [m for m in data if not m.get("is_read")]
    msg    = f"💬 *Hộp thư đến* ({len(data)} tin, {len(unread)} chưa đọc):\n\n"
    for m in data[:5]:
        icon    = "🔵" if not m.get("is_read") else "⚪"
        content = m.get('content', '')[:60]
        sender  = m.get('sender_name', 'N/A')
        date    = fmt_datetime(m.get('created_at', ''))
        msg    += f"{icon} *{sender}* ({date})\n   {content}...\n\n"
    # Nút gửi tin nhắn
    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("✉️ Gửi tin nhắn mới", callback_data="compose_msg")
    ]])
    await update.message.reply_text(msg, parse_mode="Markdown", reply_markup=keyboard)

# ── Gửi tin nhắn (inline) ─────────────────────────────────────────────────────
async def callback_compose(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    token = get_token(query.message.chat.id)
    users = api_get("/messages/users", token)
    if not users:
        await query.message.reply_text("❌ Không lấy được danh sách người dùng.")
        return
    ctx.user_data['msg_users'] = users
    lines = "\n".join([f"  {i+1}. {u['full_name']} ({ROLE_MAP.get(u['role'],u['role'])})"
                       for i, u in enumerate(users[:10])])
    await query.message.reply_text(
        f"✉️ *Gửi tin nhắn mới*\n\nChọn người nhận (nhập số):\n{lines}",
        parse_mode="Markdown"
    )
    return SEND_MSG_TO

async def send_msg_to(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    try:
        idx   = int(update.message.text.strip()) - 1
        users = ctx.user_data.get('msg_users', [])
        if idx < 0 or idx >= len(users):
            raise ValueError
        ctx.user_data['msg_to'] = users[idx]
        await update.message.reply_text(
            f"✉️ Gửi đến: *{users[idx]['full_name']}*\nNhập nội dung tin nhắn:",
            parse_mode="Markdown"
        )
        return SEND_MSG_CONTENT
    except:
        await update.message.reply_text("❌ Số không hợp lệ. Nhập lại:")
        return SEND_MSG_TO

async def send_msg_content(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token   = get_token(update.effective_chat.id)
    to_user = ctx.user_data.get('msg_to', {})
    content = update.message.text.strip()
    result  = api_post("/messages/", {"to_user_id": to_user['id'], "content": content}, token)
    if result:
        await update.message.reply_text(
            f"✅ Đã gửi tin nhắn đến *{to_user['full_name']}*!",
            parse_mode="Markdown",
            reply_markup=main_keyboard(get_role(update.effective_chat.id))
        )
    else:
        await update.message.reply_text("❌ Gửi thất bại.")
    return ConversationHandler.END

# ── Thông tin tôi ─────────────────────────────────────────────────────────────
async def cmd_me(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token = get_token(update.effective_chat.id)
    data  = api_get("/auth/me", token)
    if not data:
        await update.message.reply_text("❌ Không lấy được thông tin.")
        return
    msg = (f"👤 *Thông tin tài khoản:*\n\n"
           f"Họ tên: *{data.get('full_name')}*\n"
           f"Username: `{data.get('username')}`\n"
           f"Email: {data.get('email') or 'Chưa cập nhật'}\n"
           f"Vai trò: {ROLE_MAP.get(data.get('role'), data.get('role'))}\n"
           f"Trạng thái: {'✅ Hoạt động' if data.get('is_active') else '❌ Bị khóa'}")
    await update.message.reply_text(msg, parse_mode="Markdown")

# ── Tìm trẻ ───────────────────────────────────────────────────────────────────
async def cmd_search_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🔍 Nhập tên trẻ cần tìm:")
    return SEARCH_CHILD

async def cmd_search_child(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token   = get_token(update.effective_chat.id)
    keyword = update.message.text.strip().lower()
    data    = api_get("/children/", token)
    if not data:
        await update.message.reply_text("❌ Không lấy được dữ liệu.")
        return ConversationHandler.END
    results = [c for c in data if keyword in c.get('full_name', '').lower()]
    if not results:
        await update.message.reply_text(f"🔍 Không tìm thấy trẻ nào với từ khóa: *{keyword}*",
                                        parse_mode="Markdown")
        return ConversationHandler.END
    msg = f"🔍 *Kết quả tìm kiếm ({len(results)} trẻ):*\n\n"
    for c in results[:10]:
        gender = "👦" if c.get("gender") == "male" else "👧"
        # Lấy assessment mới nhất
        assessments = api_get(f"/assessments/child/{c['id']}", token) or []
        completed   = [a for a in assessments if a.get("status") == "completed"]
        last_risk   = ""
        if completed:
            latest    = sorted(completed, key=lambda x: x["started_at"], reverse=True)[0]
            risk      = latest.get("risk_level", "")
            last_risk = f" — {RISK_EMOJI.get(risk,'')} {risk}"
        msg += f"{gender} *{c['full_name']}* — {c['age_months']} tháng{last_risk}\n"
        msg += f"   📍 {c.get('region') or 'Chưa cập nhật'}\n\n"
    await update.message.reply_text(msg, parse_mode="Markdown",
                                    reply_markup=main_keyboard(get_role(update.effective_chat.id)))
    return ConversationHandler.END

# ── M-CHAT gần nhất ───────────────────────────────────────────────────────────
async def cmd_mchat(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token    = get_token(update.effective_chat.id)
    children = api_get("/children/", token)
    if not children:
        await update.message.reply_text("❌ Không lấy được dữ liệu.")
        return
    msg   = "📋 *Kết quả M-CHAT-R/F gần nhất:*\n\n"
    found = False
    for c in children[:10]:
        results = api_get(f"/mchat/results/child/{c['id']}", token)
        if not results or len(results) == 0:
            continue
        latest = results[0]
        risk   = latest.get("risk_level", "")
        score  = latest.get("r_score", 0)
        emoji  = "🚨" if risk == "high" else "✅"
        label  = "DƯƠNG TÍNH" if risk == "high" else "ÂM TÍNH"
        date   = fmt_date(latest.get("created_at", ""))
        gender = "👦" if c.get("gender") == "male" else "👧"
        msg   += f"{gender} *{c['full_name']}*\n"
        msg   += f"   {emoji} {label} — Điểm R: {score}/20 — {date}\n\n"
        found  = True
    if not found:
        msg = "📝 Chưa có kết quả M-CHAT-R/F nào."
    await update.message.reply_text(msg, parse_mode="Markdown")

# ── Thống kê hệ thống (admin) ─────────────────────────────────────────────────
async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token = get_token(update.effective_chat.id)
    if get_role(update.effective_chat.id) != 'admin':
        await update.message.reply_text("⛔ Chỉ admin mới dùng được lệnh này.")
        return
    stats = api_get("/admin/stats", token)
    if not stats:
        await update.message.reply_text("❌ Không lấy được thống kê.")
        return
    msg = (f"📈 *Thống kê hệ thống:*\n\n"
           f"👥 Tổng users: *{stats.get('total_users', 0)}*\n"
           f"👶 Tổng trẻ: *{stats.get('total_children', 0)}*\n"
           f"📋 Tổng đánh giá: *{stats.get('total_assessments', 0)}*\n"
           f"✅ Hoàn thành: *{stats.get('completed_assessments', 0)}*\n\n"
           f"🚨 Nguy cơ RẤT CAO: *{stats.get('very_high_risk', 0)}*\n"
           f"🔶 Nguy cơ CAO: *{stats.get('high_risk', 0)}*\n"
           f"⚠️ Nguy cơ TB: *{stats.get('medium_risk', 0)}*\n"
           f"✅ Nguy cơ THẤP: *{stats.get('low_risk', 0)}*")
    await update.message.reply_text(msg, parse_mode="Markdown")

# ── /tuvan — Gợi ý can thiệp ──────────────────────────────────────────────────
async def cmd_tuvan(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token    = get_token(update.effective_chat.id)
    children = api_get("/children/", token)
    if not children:
        await update.message.reply_text("❌ Không lấy được dữ liệu.")
        return
    # Tìm trẻ nguy cơ cao nhất
    high_risk = []
    for c in children[:10]:
        assessments = api_get(f"/assessments/child/{c['id']}", token) or []
        completed   = [a for a in assessments if a.get("status") == "completed"]
        if not completed:
            continue
        latest = sorted(completed, key=lambda x: x["started_at"], reverse=True)[0]
        if latest.get("risk_level") in ("CAO", "RẤT CAO"):
            high_risk.append((c, latest))
    if not high_risk:
        await update.message.reply_text(
            "✅ *Không có trẻ nào ở mức nguy cơ cao.*\n\n"
            "Tất cả trẻ được đánh giá đều ở mức THẤP hoặc TRUNG BÌNH.",
            parse_mode="Markdown"
        )
        return
    msg = "🩺 *Gợi ý can thiệp — Trẻ nguy cơ cao:*\n\n"
    for c, a in high_risk[:5]:
        risk  = a.get("risk_level")
        emoji = RISK_EMOJI.get(risk, "")
        msg  += f"{emoji} *{c['full_name']}* ({c['age_months']} tháng)\n"
        msg  += f"   Mức: {risk} — Điểm: {a.get('overall_risk_score',0)}/100\n"
        if risk == "RẤT CAO":
            msg += "   📌 Khuyến nghị: Đưa trẻ đến chuyên gia NGAY\n"
            msg += "   📌 Liên hệ trung tâm can thiệp sớm gần nhất\n"
        else:
            msg += "   📌 Khuyến nghị: Theo dõi sát, đánh giá lại sau 1 tháng\n"
            msg += "   📌 Tham khảo ý kiến bác sĩ nhi khoa\n"
        msg += "\n"
    await update.message.reply_text(msg, parse_mode="Markdown")

# ── /baocao — Báo cáo chi tiết theo trẻ ──────────────────────────────────────
async def cmd_baocao(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token    = get_token(update.effective_chat.id)
    children = api_get("/children/", token)
    if not children:
        await update.message.reply_text("❌ Không lấy được dữ liệu.")
        return
    # Inline keyboard chọn trẻ
    buttons = []
    for c in children[:10]:
        gender = "👦" if c.get("gender") == "male" else "👧"
        buttons.append([InlineKeyboardButton(
            f"{gender} {c['full_name']} ({c['age_months']}th)",
            callback_data=f"report_{c['id']}"
        )])
    keyboard = InlineKeyboardMarkup(buttons)
    await update.message.reply_text(
        "📊 *Chọn trẻ để xem báo cáo chi tiết:*",
        parse_mode="Markdown",
        reply_markup=keyboard
    )

async def callback_report(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query    = update.callback_query
    await query.answer()
    child_id = query.data.replace("report_", "")
    token    = get_token(query.message.chat.id)

    child       = api_get(f"/children/{child_id}", token)
    assessments = api_get(f"/assessments/child/{child_id}", token) or []
    mchat       = api_get(f"/mchat/results/child/{child_id}", token) or []

    if not child:
        await query.message.reply_text("❌ Không tìm thấy trẻ.")
        return

    completed = [a for a in assessments if a.get("status") == "completed"]
    gender    = "👦" if child.get("gender") == "male" else "👧"

    msg = f"{gender} *Báo cáo: {child['full_name']}*\n"
    msg += f"📅 {child['age_months']} tháng tuổi\n"
    msg += f"📍 {child.get('region') or 'Chưa cập nhật'}\n\n"

    # Lịch sử đánh giá
    msg += f"📋 *Lịch sử đánh giá ({len(completed)} lần):*\n"
    for a in sorted(completed, key=lambda x: x["started_at"], reverse=True)[:3]:
        risk  = a.get("risk_level", "N/A")
        score = a.get("overall_risk_score", 0)
        date  = fmt_date(a.get("started_at", ""))
        emoji = RISK_EMOJI.get(risk, "📊")
        msg  += f"  {emoji} {date} — {score}/100 — {risk}\n"

    if not completed:
        msg += "  📝 Chưa có đánh giá nào\n"

    # M-CHAT
    msg += f"\n📋 *M-CHAT-R/F:*\n"
    if mchat:
        latest = mchat[0]
        risk   = latest.get("risk_level", "")
        label  = "DƯƠNG TÍNH 🚨" if risk == "high" else "ÂM TÍNH ✅"
        msg   += f"  Kết quả: {label}\n"
        msg   += f"  Điểm R: {latest.get('r_score',0)}/20\n"
        msg   += f"  Ngày: {fmt_date(latest.get('created_at',''))}\n"
    else:
        msg += "  📝 Chưa thực hiện\n"

    # Ghi chú
    if child.get('notes'):
        msg += f"\n📝 *Ghi chú:* {child['notes']}\n"

    await query.message.reply_text(msg, parse_mode="Markdown")

# ── /dongbo — Đồng bộ nhanh ───────────────────────────────────────────────────
async def cmd_dongbo(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    token = get_token(update.effective_chat.id)
    if not token:
        await update.message.reply_text("⚠️ Bạn chưa đăng nhập. Nhấn /start")
        return
    await update.message.reply_text("🔄 Đang đồng bộ dữ liệu...")
    children    = api_get("/children/", token) or []
    assessments_count = 0
    for c in children:
        a = api_get(f"/assessments/child/{c['id']}", token) or []
        assessments_count += len(a)
    await update.message.reply_text(
        f"✅ *Đồng bộ hoàn thành!*\n\n"
        f"👶 {len(children)} trẻ\n"
        f"📋 {assessments_count} phiên đánh giá\n"
        f"🕐 {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        parse_mode="Markdown"
    )

# ── Đăng xuất ─────────────────────────────────────────────────────────────────
async def cmd_logout(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user_tokens.pop(chat_id, None)
    user_roles.pop(chat_id, None)
    from telegram import ReplyKeyboardRemove
    await update.message.reply_text(
        "✅ Đã đăng xuất.\nNhấn /start để đăng nhập lại.",
        reply_markup=ReplyKeyboardRemove()
    )

# ── /help ─────────────────────────────────────────────────────────────────────
async def help_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    role = get_role(update.effective_chat.id)
    msg  = ("📖 *Hướng dẫn sử dụng:*\n\n"
            "/start — Đăng nhập\n"
            "/help — Xem hướng dẫn\n"
            "/tuvan — Gợi ý can thiệp trẻ nguy cơ cao\n"
            "/baocao — Báo cáo chi tiết theo trẻ\n"
            "/dongbo — Đồng bộ dữ liệu\n\n"
            "📌 *Menu nhanh:*\n"
            "👶 Danh sách trẻ\n"
            "📊 Báo cáo gần nhất\n"
            "💬 Tin nhắn\n"
            "🔍 Tìm trẻ\n"
            "📋 M-CHAT gần nhất\n")
    if role == 'admin':
        msg += "📈 Thống kê hệ thống\n"
    await update.message.reply_text(msg, parse_mode="Markdown")

# ── Message handler tổng ─────────────────────────────────────────────────────
async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    token   = get_token(chat_id)
    text    = update.message.text

    if not token:
        await update.message.reply_text("⚠️ Bạn chưa đăng nhập. Nhấn /start để đăng nhập.")
        return

    t = text.lower()
    if "danh sách trẻ"      in t or text == "👶 Danh sách trẻ":      await cmd_children(update, ctx)
    elif "báo cáo"          in t or text == "📊 Báo cáo gần nhất":   await cmd_reports(update, ctx)
    elif "tin nhắn"         in t or text == "💬 Tin nhắn":            await cmd_messages(update, ctx)
    elif "thông tin"        in t or text == "👤 Thông tin tôi":       await cmd_me(update, ctx)
    elif "m-chat"           in t or text == "📋 M-CHAT gần nhất":     await cmd_mchat(update, ctx)
    elif "thống kê"         in t or text == "📈 Thống kê hệ thống":   await cmd_stats(update, ctx)
    elif "đăng xuất"        in t or text == "🚪 Đăng xuất":           await cmd_logout(update, ctx)
    else:
        await update.message.reply_text(
            "❓ Không hiểu lệnh. Dùng menu bên dưới hoặc /help.",
            reply_markup=main_keyboard(get_role(chat_id))
        )

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    if not TELEGRAM_TOKEN:
        logger.error("❌ TELEGRAM_TOKEN chưa được set!")
        return

    app = Application.builder().token(TELEGRAM_TOKEN).build()

    # Login conversation
    login_conv = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            LOGIN_USERNAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, login_username)],
            LOGIN_PASSWORD: [MessageHandler(filters.TEXT & ~filters.COMMAND, login_password)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    # Tìm trẻ conversation
    search_conv = ConversationHandler(
        entry_points=[MessageHandler(filters.Regex("^🔍 Tìm trẻ$"), cmd_search_start)],
        states={
            SEARCH_CHILD: [MessageHandler(filters.TEXT & ~filters.COMMAND, cmd_search_child)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    # Gửi tin nhắn conversation
    msg_conv = ConversationHandler(
        entry_points=[CallbackQueryHandler(callback_compose, pattern="^compose_msg$")],
        states={
            SEND_MSG_TO:      [MessageHandler(filters.TEXT & ~filters.COMMAND, send_msg_to)],
            SEND_MSG_CONTENT: [MessageHandler(filters.TEXT & ~filters.COMMAND, send_msg_content)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    app.add_handler(login_conv)
    app.add_handler(search_conv)
    app.add_handler(msg_conv)
    app.add_handler(CommandHandler("help",    help_cmd))
    app.add_handler(CommandHandler("tuvan",   cmd_tuvan))
    app.add_handler(CommandHandler("baocao",  cmd_baocao))
    app.add_handler(CommandHandler("dongbo",  cmd_dongbo))
    app.add_handler(CallbackQueryHandler(callback_report, pattern="^report_"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("🤖 ASD-SCREEN chatbot đang chạy...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()