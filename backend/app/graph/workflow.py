"""LangGraph workflow — builds and compiles the 8-node research pipeline."""

import traceback

from sqlalchemy import update
from langgraph.graph import StateGraph, END

from app.database.connection import async_session
from app.graph.state import ResearchState
from app.graph.nodes import (
    planner_node,
    search_node,
    evaluator_node,
    extraction_node,
    summarization_node,
    sufficiency_node,
    embedding_node,
    report_node,
)
from app.models.session import ResearchSession

MAX_RETRIES = 1


def _should_retry(state: ResearchState) -> str:
    if not state["enough_information"] and state["retry_count"] <= MAX_RETRIES:
        return "search"
    return "embedding"


def build_workflow():
    workflow = StateGraph(ResearchState)

    nodes = [
        ("planner", planner_node),
        ("search", search_node),
        ("evaluator", evaluator_node),
        ("extraction", extraction_node),
        ("summarization", summarization_node),
        ("sufficiency", sufficiency_node),
        ("embedding", embedding_node),
        ("report", report_node),
    ]
    for name, fn in nodes:
        workflow.add_node(name, fn)

    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "search")
    workflow.add_edge("search", "evaluator")
    workflow.add_edge("evaluator", "extraction")
    workflow.add_edge("extraction", "summarization")
    workflow.add_edge("summarization", "sufficiency")

    workflow.add_conditional_edges(
        "sufficiency",
        _should_retry,
        {"search": "search", "embedding": "embedding"},
    )

    workflow.add_edge("embedding", "report")
    workflow.add_edge("report", END)

    return workflow.compile()


graph = build_workflow()


async def run_workflow(session_id: int, topic: str) -> None:
    """Run the research pipeline. Called as a FastAPI BackgroundTask."""
    initial_state: ResearchState = {
        "session_id": session_id,
        "topic": topic,
        "questions": [],
        "search_results": [],
        "selected_sources": [],
        "extracted_sources": [],
        "all_extracted_sources": [],
        "summaries": [],
        "all_summaries": [],
        "enough_information": False,
        "missing_areas": [],
        "retry_count": 0,
        "report_markdown": "",
    }

    try:
        await graph.ainvoke(initial_state)
    except Exception as e:
        from sqlalchemy.exc import IntegrityError
        if isinstance(e, IntegrityError):
            print(f"[workflow] Session {session_id} was deleted during execution. Halting gracefully.")
            return
            
        error = traceback.format_exc()
        print(f"[workflow] Session {session_id} failed:\n{error}")
        async with async_session() as db:
            try:
                await db.execute(
                    update(ResearchSession)
                    .where(ResearchSession.id == session_id)
                    .values(status="failed", error_message=error[:2000])
                )
                await db.commit()
            except Exception as update_exc:
                print(f"[workflow] CRITICAL: Failed to update session {session_id} to 'failed' status. DB Error: {update_exc}")
