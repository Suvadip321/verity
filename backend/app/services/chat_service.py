"""Handles RAG-based chat: retrieves context, calls Mistral, saves messages."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.llm import llm, with_llm_retry
from app.models.chat import ChatMessage
from app.models.session import ResearchSession
from app.services.retrieval_service import retrieve_chunks

_MAX_HISTORY_MESSAGES = 6


@with_llm_retry()
async def chat(question: str, session_id: int, db: AsyncSession) -> str:
    result = await db.execute(select(ResearchSession).where(ResearchSession.id == session_id))
    session = result.scalar_one_or_none()
    
    if not session:
        raise ValueError(f"ResearchSession {session_id} not found")
        
    report_text = session.report_markdown if session.report_markdown else "No report generated yet."


    search_query = f"{session.topic} - {question}"
    chunks = await retrieve_chunks(search_query, session_id, db)
    context = "\n\n".join(chunks) if chunks else "No raw research chunks available."

    past_messages = await get_messages(session_id, db)
    history_text = "\n".join(
        f"{m.role}: {m.content}" for m in past_messages[-_MAX_HISTORY_MESSAGES:]
    ) or "No previous conversation."

    prompt = (
        f"You are a helpful and highly accurate research assistant.\n"
        f"Your job is to answer the User Question based on the provided Final Research Report and Raw Source Context.\n\n"
        f"CRITICAL RULES:\n"
        f"1. Answer the question using ONLY the facts provided in the Final Research Report and Raw Source Context below. You may synthesize and combine information from multiple sections.\n"
        f"2. DO NOT hallucinate, guess, or bring in any outside knowledge.\n"
        f"3. If the provided report and context do not contain enough information to answer the question, simply reply: 'I'm sorry, that information was not found in my research.'\n"
        f"4. DO NOT include any source citations or reference numbers (e.g. [1], [2]) in your response. Provide a clean, naturally flowing answer without brackets.\n\n"
        f"--- Research Topic ---\n{session.topic}\n\n"
        f"--- Recent Conversation History ---\n{history_text}\n\n"
        f"--- Raw Source Context ---\n{context}\n\n"
        f"--- Final Research Report ---\n{report_text}\n\n"
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
