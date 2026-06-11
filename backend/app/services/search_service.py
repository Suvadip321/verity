"""Searches the web via Tavily for a list of research questions."""

import asyncio
from dataclasses import dataclass

from tavily import TavilyClient
from tenacity import retry, stop_after_attempt, wait_exponential

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


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
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

        raise

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
        *[_search_one(q, topic) for q in questions],
        return_exceptions=True
    )
    
    valid_results = []
    for result in results_per_question:
        if isinstance(result, Exception):
            print(f"[search_service] A search query failed completely: {result}")
        else:
            valid_results.extend(result)
            
    return valid_results
