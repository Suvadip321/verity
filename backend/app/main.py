from dotenv import load_dotenv
load_dotenv()

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from contextlib import asynccontextmanager

from app.database.connection import get_db, engine
from app.api.auth import router as auth_router
from app.api.sessions import router as sessions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown: gracefully close all DB connections so we don't leave zombies
    # on Supabase's pooler during Uvicorn reloads.
    await engine.dispose()


app = FastAPI(title="Verity API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://verity-zeta-hazel.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sessions_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "verity"}


@app.get("/db-health")
async def db_health(db: AsyncSession = Depends(get_db)):
    """Verify database connectivity and pgvector availability."""
    await db.execute(text("SELECT 1"))

    result = await db.execute(
        text("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')")
    )
    pgvector_enabled = result.scalar()

    return {"status": "connected", "pgvector": pgvector_enabled}

