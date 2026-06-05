"""LangGraph state definition — the object shared across all 8 nodes."""

from typing import TypedDict


class ResearchState(TypedDict):
    session_id: int
    topic: str
    questions: list[str]
    search_results: list[dict]  
    selected_sources: list[dict] 
    extracted_sources: list[dict]
    summaries: list[str]            
    enough_information: bool
    missing_areas: list[str]
    retry_count: int
    report_markdown: str
