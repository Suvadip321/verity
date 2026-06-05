"""All 8 LangGraph nodes. Each calls a service, writes to DB, updates session status."""

from dataclasses import asdict

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import async_session
from app.graph.state import ResearchState
from app.models.chat import DocumentChunk
from app.models.session import ResearchQuestion, ResearchSession, ResearchSource
from app.services.embedding_service import embed_chunks
from app.services.evaluator_service import evaluate_sources, ScoredSource
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
        questions = await generate_questions(state["topic"])

        for q in questions:
            db.add(ResearchQuestion(session_id=state["session_id"], question=q))
        await db.commit()

    return {**state, "questions": questions}


async def search_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "searching", "searching", db)

    # On a retry, search for missing areas instead of the original questions
    if state["retry_count"] > 0 and state.get("missing_areas"):
        queries = state["missing_areas"][:3]
        results = await search_web(queries, state["topic"])
    else:
        results = await search_web(state["questions"], state["topic"])

    search_dicts = [asdict(r) for r in results]
    existing = state.get("search_results", [])
    return {**state, "search_results": existing + search_dicts}


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

    extracted = []
    for source in state["selected_sources"]:
        text = await extract_text(source["url"])
        extracted.append({**source, "extracted_text": text})

    return {**state, "extracted_sources": extracted}


async def summarization_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "summarizing", "summarizing", db)

        summaries = []
        for source in state["extracted_sources"]:
            text = source.get("extracted_text", "")
            summary = await summarise_text(text, state["topic"]) if text else ""
            summaries.append(summary)

            db.add(ResearchSource(
                session_id=state["session_id"],
                title=source["title"],
                source_url=source["url"],
                relevance_score=source["relevance_score"],
                credibility_score=source["credibility_score"],
                usefulness_score=source["usefulness_score"],
                extracted_text=text,
                summary=summary,
            ))

        await db.commit()

    return {**state, "summaries": summaries}


async def sufficiency_node(state: ResearchState) -> ResearchState:
    async with async_session() as db:
        await _update_status(state["session_id"], "checking_sufficiency", "checking_sufficiency", db)

    non_empty = [s for s in state["summaries"] if s]
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

        for source in state["extracted_sources"]:
            text = source.get("extracted_text", "")
            if not text:
                continue
            chunks = await embed_chunks(text)
            for content, vector in chunks:
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

        non_empty = [s for s in state["summaries"] if s]
        report = await generate_report(state["topic"], state["questions"], non_empty)

        await db.execute(
            update(ResearchSession)
            .where(ResearchSession.id == state["session_id"])
            .values(status="completed", current_step="completed", report_markdown=report)
        )
        await db.commit()

    return {**state, "report_markdown": report}
