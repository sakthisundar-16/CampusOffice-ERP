from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from .api.v1 import auth, student, staff, staff_payments, admin, profile, search, files, student_documents, staff_documents, admin_documents, verify, notifications, audit
from .core.config import settings
from .core.logging_config import setup_logging
import redis.asyncio as aioredis
import os
import logging
from dotenv import load_dotenv

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
setup_logging()
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CampusOffice ERP",
    version="2.0.0",
    docs_url="/api/docs" if settings.DEBUG_MODE else None,
    redoc_url="/api/redoc" if settings.DEBUG_MODE else None,
    openapi_url="/api/openapi.json" if settings.DEBUG_MODE else None,
)

# ── Upload directories ────────────────────────────────────────────────────────
os.makedirs(f"{settings.UPLOAD_DIR}/payments", exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/photos", exist_ok=True)
os.makedirs(settings.PDF_STORAGE_PATH, exist_ok=True)
os.makedirs(f"{settings.UPLOAD_DIR}/attachments", exist_ok=True)

app.mount(f"/{settings.UPLOAD_DIR}", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ── Security Middleware ───────────────────────────────────────────────────────
allowed_hosts = ["localhost", "127.0.0.1", "*"] if settings.DEBUG_MODE else [
    "*",
    "localhost",
]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# ── CORS ──────────────────────────────────────────────────────────────────────
cors_origins = [settings.FRONTEND_URL]
if settings.DEBUG_MODE:
    cors_origins.extend(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global Exception Handler — never leak stack traces ────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )

# ── Database Tables ───────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Redis ─────────────────────────────────────────────────────────────────────
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, tags=["auth"])
app.include_router(student.router, tags=["student"])
app.include_router(student_documents.router, tags=["student-documents"])
app.include_router(staff.router, tags=["staff"])
app.include_router(staff_documents.router, tags=["staff-documents"])
app.include_router(staff_payments.router, tags=["staff-payments"])
app.include_router(admin.router, tags=["admin"])
app.include_router(admin_documents.router, tags=["admin-documents"])
app.include_router(profile.router, tags=["profile"])
app.include_router(search.router, tags=["search"])
app.include_router(files.router, tags=["files"])
app.include_router(verify.router, tags=["verification"])
app.include_router(notifications.router, tags=["notifications"])
app.include_router(audit.router, tags=["audit"])

# ── WebSocket ─────────────────────────────────────────────────────────────────
from .core.websocket import websocket_manager

@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user = await websocket_manager.connect(websocket, token)
    if not user:
        return
    user_id = user.id
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(user_id, role)

# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "message": "Welcome to CampusOffice ERP API",
        "version": "2.0.0",
        "features": ["Document Request Engine", "Certificate Management", "Digital Verification"],
    }

# ── Health Checks ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "CampusOffice ERP", "version": "2.0.0"}

@app.get("/health/database")
async def health_database():
    try:
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        return {"status": "healthy", "database": "postgresql"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return JSONResponse(status_code=503, content={"status": "unhealthy", "database": "postgresql", "error": "Connection failed"})

@app.get("/health/redis")
async def health_redis():
    try:
        pong = await redis_client.ping()
        return {"status": "healthy" if pong else "unhealthy", "redis": "connected"}
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return JSONResponse(status_code=503, content={"status": "unhealthy", "redis": "unreachable"})

@app.get("/health/storage")
async def health_storage():
    try:
        test_file = os.path.join(settings.UPLOAD_DIR, ".healthcheck")
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
        return {"status": "healthy", "upload_dir": settings.UPLOAD_DIR, "writable": True}
    except Exception as e:
        logger.error(f"Storage health check failed: {e}")
        return JSONResponse(status_code=503, content={"status": "unhealthy", "upload_dir": settings.UPLOAD_DIR, "writable": False})
