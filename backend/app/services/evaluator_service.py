"""Scores search results using Mistral structured output and returns the top 5."""

from dataclasses import dataclass
from pydantic import BaseModel

from langchain_mistralai import ChatMistralAI

from app.core.config import settings
from app.services.search_service import SearchResult

llm = ChatMistralAI(
    model="mistral-small-latest",
    api_key=settings.MISTRAL_API_KEY,
    max_retries=3,
)

@dataclass
class ScoredSource:
    title: str
    url: str
    snippet: str
    question: str
    relevance_score: int
    credibility_score: int
    usefulness_score: int

    @property
    def total_score(self) -> int:
        return self.relevance_score + self.credibility_score + self.usefulness_score

class _SourceScore(BaseModel):
    url: str
    relevance_score: int
    credibility_score: int
    usefulness_score: int

class _ScoreList(BaseModel):
    scores: list[_SourceScore]

async def evaluate_sources(results: list[SearchResult], topic: str) -> list[ScoredSource]:
    """Score each search result with Mistral and return the top 5 by total score."""
    if not results:
        return []

    sources_text = "\n\n".join(
        f"[{i + 1}] URL: {r.url}\nTitle: {r.title}\nSnippet: {r.snippet}"
        for i, r in enumerate(results)
    )

    prompt = (
        f"Topic: {topic}\n\n"
        f"Score each source on three criteria (1–5 each):\n"
        f"- relevance_score: how relevant to the topic\n"
        f"- credibility_score: how trustworthy the source is\n"
        f"- usefulness_score: how useful for writing a report\n\n"
        f"Sources:\n{sources_text}\n"
    )

    structured_llm = llm.with_structured_output(_ScoreList)

    try:
        response = await structured_llm.ainvoke(prompt)
        scores = response.scores
    except Exception as exc:
        print(f"[evaluator_service] Mistral structured output failed: {exc}")
        return []

    url_to_result = {r.url: r for r in results}
    url_to_score = {s.url: s for s in scores}

    scored: list[ScoredSource] = []
    for url, result in url_to_result.items():
        score = url_to_score.get(url)
        if not score:
            continue
        scored.append(
            ScoredSource(
                title=result.title,
                url=url,
                snippet=result.snippet,
                question=result.question,
                relevance_score=score.relevance_score,
                credibility_score=score.credibility_score,
                usefulness_score=score.usefulness_score,
            )
        )

    scored.sort(key=lambda s: s.total_score, reverse=True)
    return scored[:5]
