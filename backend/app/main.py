from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, children, assessments, games, reports, messages, admin

app = FastAPI(
    title="ASD-SCREEN AI API",
    description="Hệ thống sàng lọc rối loạn phát triển trẻ em",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api/auth",        tags=["Auth"])
app.include_router(children.router,    prefix="/api/children",    tags=["Children"])
app.include_router(assessments.router, prefix="/api/assessments", tags=["Assessments"])
app.include_router(games.router,       prefix="/api/games",       tags=["Games"])
app.include_router(reports.router,     prefix="/api/reports",     tags=["Reports"])
app.include_router(messages.router,    prefix="/api/messages",    tags=["Messages"])
app.include_router(admin.router,       prefix="/api/admin",       tags=["Admin"])

@app.get("/")
def root():
    return {"message": "ASD-SCREEN AI đang chạy!", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}