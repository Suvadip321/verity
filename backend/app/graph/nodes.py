"""All 8 LangGraph nodes. Each calls a service, writes to DB, and updates session status."""

import asyncio
from dataclasses import asdict

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import async_session
from app.graph.state import ResearchState
from app.models.chat import DocumentChunk, ChatMessage
from app.models.session import ResearchQuestion, ResearchSession, ResearchSource
from app.services.embedding_service import embed_chunks
from app.services.evaluator_service import evaluate_sources
from app.services.extraction_service import extract_text
from app.services.planner_service import generate_questions
from app.services.report_service import generate_report
from app.services.search_service import search_web, SearchResult
from app.services.sufficiency_service import check_sufficiency
from app.services.summarization_service import summarise_text


async def _update_status(session_id: int, status: str, current_step: str, db: AsyncSession) -> None:
    """Update session status — Supabase Realtime broadcasts this to the frontend."""
    await db.execute(
        update(ResearchSession)
        .where(ResearchSession.id == session_id)
        .values(status=status, current_step=current_step)
    )
    await db.commit()


async def planner_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "planning", "planning", db)
        
        from sqlalchemy import delete
        await db.execute(delete(ResearchQuestion).where(ResearchQuestion.session_id == state["session_id"]))
        await db.execute(delete(ResearchSource).where(ResearchSource.session_id == state["session_id"]))
        await db.execute(delete(DocumentChunk).where(DocumentChunk.session_id == state["session_id"]))
        await db.execute(delete(ChatMessage).where(ChatMessage.session_id == state["session_id"]))
        await db.commit()

    questions = await generate_questions(state["topic"])

    async with async_session() as db:
        for q in questions:
            db.add(ResearchQuestion(session_id=state["session_id"], question=q))
        await db.commit()

    return {**state, "questions": questions}


async def search_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "searching", "searching", db)

    if state["retry_count"] > 0 and state["missing_areas"]:
        queries = state["missing_areas"][:3]
        results = await search_web(queries, state["topic"])
    else:
        results = await search_web(state["questions"], state["topic"])

    search_dicts = [asdict(r) for r in results]
    return {**state, "search_results": search_dicts}


async def evaluator_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "evaluating_sources", "evaluating_sources", db)

    raw = [SearchResult(**r) for r in state["search_results"]]
    scored = await evaluate_sources(raw, state["topic"])

    selected_dicts = [asdict(s) for s in scored]
    return {**state, "selected_sources": selected_dicts}


async def extraction_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "extracting", "extracting", db)

    sources = state["selected_sources"]
    texts = await asyncio.gather(*[extract_text(source["url"]) for source in sources])

    extracted = [
        {**source, "extracted_text": text}
        for source, text in zip(sources, texts)
    ]
    return {
        **state, 
        "extracted_sources": extracted,
        "all_extracted_sources": state.get("all_extracted_sources", []) + extracted
    }


async def summarization_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "summarizing", "summarizing", db)

    summaries = []
    new_sources = []
    for source in state["extracted_sources"]:
        text = source.get("extracted_text", "")
        if text:
            summary = await summarise_text(text, state["topic"])
            await asyncio.sleep(1.0)
            
            if "no relevant information" in summary.lower():
                summary = ""
                
            if summary:
                new_sources.append(ResearchSource(
                    session_id=state["session_id"],
                    title=source["title"],
                    source_url=source["url"],
                    relevance_score=source["relevance_score"],
                    credibility_score=source["credibility_score"],
                    usefulness_score=source["usefulness_score"],
                    summary=summary,
                ))
        else:
            summary = ""
            
        summaries.append(summary)

    async with async_session() as db:
        for source_obj in new_sources:
            db.add(source_obj)
        await db.commit()

    return {
        **state, 
        "summaries": summaries,
        "all_summaries": state.get("all_summaries", []) + summaries
    }


async def sufficiency_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "checking_sufficiency", "checking_sufficiency", db)

    non_empty = [s for s in state.get("all_summaries", []) if s]
    result = await check_sufficiency(non_empty, state["topic"])

    return {
        **state,
        "enough_information": result.enough,
        "missing_areas": result.missing_areas,
        "retry_count": state["retry_count"] + 1,
    }


async def embedding_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "embedding", "embedding", db)

    source_chunks: list[tuple[str, list[float]]] = []
    all_extracted = state.get("all_extracted_sources", [])
    all_summaries = state.get("all_summaries", [])
    
    for source, summary in zip(all_extracted, all_summaries):
        if not summary:
            continue
            
        text = source.get("extracted_text", "")
        if not text:
            continue
            
        chunks = await embed_chunks(text)
        source_chunks.extend(chunks)

    async with async_session() as db:
        for content, vector in source_chunks:
            db.add(DocumentChunk(
                session_id=state["session_id"],
                content=content,
                embedding=vector,
            ))
        await db.commit()

    return state


async def report_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "generating_report", "generating_report", db)

    all_extracted = state.get("all_extracted_sources", [])
    all_summaries = state.get("all_summaries", [])
    
    source_data = []
    for source, summary in zip(all_extracted, all_summaries):
        if summary:
            source_data.append({
                "title": source.get("title", "Unknown Source"),
                "summary": summary
            })

    report = await generate_report(state["topic"], state["questions"], source_data)

    async with async_session() as db:
        await db.execute(
            update(ResearchSession)
            .where(ResearchSession.id == state["session_id"])
            .values(status="completed", current_step="completed", report_markdown=report)
        )
        await db.commit()

    return {**state, "report_markdown": report}
