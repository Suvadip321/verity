"""Handles RAG-based chat: retrieves context, calls Mistral, saves messages."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.llm import llm
from app.models.chat import ChatMessage
from app.models.session import ResearchSession
from app.services.retrieval_service import retrieve_chunks

_MAX_REPORT_CHARS = 8_000
_MAX_HISTORY_MESSAGES = 6


async def chat(question: str, session_id: int, db: AsyncSession) -> str:
    result = await db.execute(select(ResearchSession).where(ResearchSession.id == session_id))
    session = result.scalar_one_or_none()
    report_text = (
        (session.report_markdown or "")[:_MAX_REPORT_CHARS]
        if session
        else "No report generated yet."
    )

    chunks = await retrieve_chunks(question, session_id, db)
    context = "\n\n".join(chunks) if chunks else "No raw research chunks available."

    past_messages = await get_messages(session_id, db)
    history_text = "\n".join(
        f"{m.role}: {m.content}" for m in past_messages[-_MAX_HISTORY_MESSAGES:]
    ) or "No previous conversation."

    prompt = (
        f"Answer ONLY using the context below. Do not use outside knowledge.\n\n"
        f"--- Final Research Report ---\n{report_text}\n\n"
        f"--- Raw Source Context ---\n{context}\n\n"
        f"--- Recent Conversation History ---\n{history_text}\n\n"
        f"User Question: {question}"
    )

    response = await llm.ainvoke(prompt)
    answer = str(response.content) if response.content else "I could not find an answer in the research."

    db.add(ChatMessage(session_id=session_id, role="user", content=question))
    db.add(ChatMessage(session_id=session_id, role="assistant", content=answer))
    await db.commit()

    return answer


async def get_messages(session_id: int, db: AsyncSession) -> list[ChatMessage]:
    """Return all chat messages for a session ordered by creation time."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return list(result.scalars().all())
