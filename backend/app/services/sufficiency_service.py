"""Decides whether the gathered summaries are sufficient to write a full report."""

from pydantic import BaseModel
from langchain_mistralai import ChatMistralAI

from app.core.config import settings

llm = ChatMistralAI(
    model="mistral-small-latest",
    api_key=settings.MISTRAL_API_KEY,
    max_retries=3,
)

class SufficiencyResult(BaseModel):
    enough: bool
    missing_areas: list[str]

async def check_sufficiency(summaries: list[str], topic: str) -> SufficiencyResult:
    """Return whether summaries contain enough info to write a report on topic."""
    combined = "\n\n---\n\n".join(summaries)

    prompt = (
        f"Topic: {topic}\n\n"
        f"Summaries:\n{combined}\n\n"
        f"Given these summaries, is there enough information to write a comprehensive report on '{topic}'?\n"
        f"Identify any important areas that are missing or underrepresented.\n"
    )

    structured_llm = llm.with_structured_output(SufficiencyResult)

    try:
        response = await structured_llm.ainvoke(prompt)
        return response
    except Exception as exc:
        print(f"[sufficiency_service] Mistral structured output failed: {exc}")
        # Default to enough=True to prevent infinite retry loops
        return SufficiencyResult(enough=True, missing_areas=[])
