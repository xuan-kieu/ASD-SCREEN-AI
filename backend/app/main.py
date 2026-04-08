from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, children, assessments, games, reports, messages, admin, mchat, appointments, ws, audio, ai_analysis, media
from app.config import settings

app = FastAPI(
    title="ASD-SCREEN AI API",
    description="Hệ thống sàng lọc rối loạn phát triển trẻ em",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:8443",
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/api/auth",        tags=["Auth"])
app.include_router(children.router,     prefix="/api/children",    tags=["Children"])
app.include_router(assessments.router,  prefix="/api/assessments", tags=["Assessments"])
app.include_router(games.router,        prefix="/api/games",       tags=["Games"])
app.include_router(reports.router,      prefix="/api/reports",     tags=["Reports"])
app.include_router(messages.router,     prefix="/api/messages",    tags=["Messages"])
app.include_router(admin.router,        prefix="/api")             # admin.py có prefix="/admin" → /api/admin
app.include_router(mchat.router,        prefix="/api")             # mchat.py có prefix="/mchat" → /api/mchat
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])
app.include_router(ws.router,           prefix="/api")             # ws.py endpoint /ws/messages → /api/ws/messages
app.include_router(audio.router,        prefix="/api")             # audio.py có prefix="/audio" → /api/audio
app.include_router(ai_analysis.router,  prefix="/api")             # ai_analysis.py endpoint /ai-analysis → /api/ai-analysis
app.include_router(media.router,        prefix="/api")             # media.py endpoint /media/... → /api/media/...

@app.get("/")
def root():
    return {"message": "ASD-SCREEN AI đang chạy!", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}
