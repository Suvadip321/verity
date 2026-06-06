"""Searches the web via Tavily for a list of research questions."""

import asyncio
from dataclasses import dataclass

from tavily import TavilyClient

from app.core.config import settings

_tavily = TavilyClient(api_key=settings.TAVILY_API_KEY)
_RESULTS_PER_QUESTION = 5


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    score: float
    question: str


async def _search_one(question: str, topic: str) -> list[SearchResult]:
    query = f"{question} {topic}"
    try:
        response = await asyncio.to_thread(
            _tavily.search,
            query=query,
            search_depth="basic",
            max_results=_RESULTS_PER_QUESTION,
            include_answer=False,
        )
    except Exception as exc:
        print(f"[search_service] Tavily error for '{question}': {exc}")
        return []

    return [
        SearchResult(
            title=item.get("title", "No title"),
            url=item.get("url", ""),
            snippet=item.get("content", ""),
            score=float(item.get("score", 0.0)),
            question=question,
        )
        for item in response.get("results", [])
    ]


async def search_web(questions: list[str], topic: str) -> list[SearchResult]:
    """Search for each question concurrently and return a flat list of results."""
    results_per_question = await asyncio.gather(
        *[_search_one(q, topic) for q in questions]
    )
    return [result for sublist in results_per_question for result in sublist]
