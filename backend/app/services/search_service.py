"""Searches the web via Tavily for a list of research questions."""

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


async def search_web(questions: list[str], topic: str) -> list[SearchResult]:
    """Search for each question and return a flat list of results."""
    all_results: list[SearchResult] = []

    for question in questions:
        query = f"{question} {topic}"

        try:
            response = _tavily.search(
                query=query,
                search_depth="basic",
                max_results=_RESULTS_PER_QUESTION,
                include_answer=False,
            )
        except Exception as exc:
            print(f"[search_service] Tavily error for '{question}': {exc}")
            continue

        for item in response.get("results", []):
            all_results.append(
                SearchResult(
                    title=item.get("title", "No title"),
                    url=item.get("url", ""),
                    snippet=item.get("content", ""),
                    score=float(item.get("score", 0.0)),
                    question=question,
                )
            )

    return all_results


async def search_single(query: str) -> list[SearchResult]:
    """Search for a single raw query string. Used by the retry loop."""
    try:
        response = _tavily.search(
            query=query,
            search_depth="basic",
            max_results=_RESULTS_PER_QUESTION,
            include_answer=False,
        )
    except Exception as exc:
        print(f"[search_service] Tavily error for '{query}': {exc}")
        return []

    return [
        SearchResult(
            title=item.get("title", "No title"),
            url=item.get("url", ""),
            snippet=item.get("content", ""),
            score=float(item.get("score", 0.0)),
            question=query,
        )
        for item in response.get("results", [])
    ]
