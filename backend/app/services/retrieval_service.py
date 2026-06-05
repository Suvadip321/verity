"""Retrieves the most relevant document chunks for a question using pgvector."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.embedding_service import embed_text


async def retrieve_chunks(question: str, session_id: int, db: AsyncSession) -> list[str]:
    """Embed the question and return the top 5 most similar chunks for the session."""
    query_vector = await embed_text(question)

    rows = await db.execute(
        text("""
            SELECT content FROM document_chunks
            WHERE session_id = :session_id
            ORDER BY embedding <=> CAST(:query_vector AS vector)
            LIMIT 5
        """),
        {"session_id": session_id, "query_vector": str(query_vector)},
    )

    return [row.content for row in rows]
