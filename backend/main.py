"""
FastAPI entrypoint.

Run with:
    uvicorn main:app --reload --port 8000
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from config import settings
from db.database import init_db, engine
from db import models  # noqa: F401 -- import registers Person/RecognitionLog with Base.metadata

PEOPLE_PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "uploads", "people")
os.makedirs(PEOPLE_PHOTOS_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await engine.dispose()


app = FastAPI(title="Face ID MVP", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves enrolled photos and generated avatars, e.g. GET /static/people/<uuid>.jpg
app.mount("/static/people", StaticFiles(directory=PEOPLE_PHOTOS_DIR), name="people_photos")


@app.get("/health")
async def health():
    """Confirms the API is up and can reach Postgres."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "status": "ok",
        "env": settings.app_env,
        "database": db_status,
        "email": {
            "configured": bool(
                settings.smtp_host
                and settings.smtp_username
                and settings.smtp_password
                and settings.smtp_from_email
            ),
            "host": settings.smtp_host or None,
            "from_email": settings.smtp_from_email or None,
            "fallback_recipient": bool(settings.default_alert_email),
        },
    }


from api.enroll import router as enroll_router
from api.recognize import router as recognize_router
from api.stream import router as stream_router
from api.people import router as people_router
from api.debug import router as debug_router

app.include_router(enroll_router,    prefix="/enroll",    tags=["enroll"])
app.include_router(recognize_router, prefix="/recognize", tags=["recognize"])
app.include_router(stream_router,    tags=["stream"])
app.include_router(people_router,    prefix="/people",    tags=["people"])
app.include_router(debug_router,     prefix="/debug",     tags=["debug"])
