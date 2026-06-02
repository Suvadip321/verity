from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db

app = FastAPI(title="Verity API")


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
