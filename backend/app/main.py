from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.api.auth import router as auth_router
from app.api.sessions import router as sessions_router

app = FastAPI(title="Verity API")

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

