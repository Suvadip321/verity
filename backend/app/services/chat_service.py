"""Handles RAG-based chat: retrieves context, calls Mistral, saves messages."""

from sqlalchemy.ext.asyncio import AsyncSession
from langchain_mistralai import ChatMistralAI

from app.core.config import settings
from app.models.chat import ChatMessage
from app.services.retrieval_service import retrieve_chunks

llm = ChatMistralAI(
    model="mistral-small-latest",
    api_key=settings.MISTRAL_API_KEY,
    max_retries=3,
)


async def chat(question: str, session_id: int, db: AsyncSession) -> str:
    """
    Answer a question grounded in the session's research.

    Steps:
    1. Retrieve the 5 most relevant chunks from document_chunks.
    2. Build a RAG prompt and call Mistral.
    3. Save both the user question and assistant answer to chat_messages.
    4. Return the answer string.
    """
    chunks = await retrieve_chunks(question, session_id, db)
    context = "\n\n".join(chunks) if chunks else "No research context available."

    prompt = (
        f"Answer ONLY using the context below. Do not use outside knowledge.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}"
    )

    response = await llm.ainvoke(prompt)
    answer = str(response.content) if response.content else "I could not find an answer in the research."

    db.add(ChatMessage(session_id=session_id, role="user", content=question))
    db.add(ChatMessage(session_id=session_id, role="assistant", content=answer))
    await db.commit()

    return answer


async def get_messages(session_id: int, db: AsyncSession) -> list[ChatMessage]:
    """Return all chat messages for a session ordered by creation time."""
    from sqlalchemy.future import select as future_select

    result = await db.execute(
        future_select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return list(result.scalars().all())
