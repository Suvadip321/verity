"""Handles RAG-based chat: retrieves context, calls Mistral, saves messages."""

import asyncio
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.llm import llm, with_llm_retry
from app.models.chat import ChatMessage
from app.models.session import ResearchSession
from app.services.retrieval_service import retrieve_chunks

_MAX_HISTORY_MESSAGES = 6

class _QueryList(BaseModel):
    queries: list[str]

@with_llm_retry()
async def chat(question: str, session_id: int, db: AsyncSession) -> str:
    result = await db.execute(select(ResearchSession).where(ResearchSession.id == session_id))
    session = result.scalar_one_or_none()
    
    if not session:
        raise ValueError(f"ResearchSession {session_id} not found")
        
    report_text = session.report_markdown if session.report_markdown else "No report generated yet."
    past_messages = await get_messages(session_id, db)
    history_text = "\n".join(
        f"{m.role}: {m.content}" for m in past_messages[-_MAX_HISTORY_MESSAGES:]
    ) or "No previous conversation."

    expansion_prompt = (
        f"Topic: {session.topic}\n"
        f"Final Research Report: {report_text}\n"
        f"Conversation History: {history_text}\n"
        f"User Question: {question}\n\n"
        f"Generate exactly 3 highly specific search queries to find the answer to the User Question in a vector database."
    )
    
    try:
        structured_llm = llm.with_structured_output(_QueryList)
        expansion_response = await structured_llm.ainvoke(expansion_prompt)
        queries = expansion_response.queries
    except Exception as e:
        print(f"[chat_service] Query expansion failed: {e}")
        queries = [f"{session.topic} - {question}"]

    tasks = [retrieve_chunks(q, session_id, db) for q in queries]
    all_results = await asyncio.gather(*tasks)
    
    unique_chunks = list(set(chunk for result in all_results for chunk in result))
    context = "\n\n".join(unique_chunks) if unique_chunks else "No raw research chunks available."

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
