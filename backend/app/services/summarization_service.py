"""Summarises extracted source text using Mistral."""

from langchain_mistralai import ChatMistralAI

from app.core.config import settings

llm = ChatMistralAI(
    model="mistral-small-latest",
    api_key=settings.MISTRAL_API_KEY,
    max_retries=3,
)

_MAX_INPUT_CHARS = 12000

async def summarise_text(text: str, topic: str) -> str:
    """Return a 2–3 paragraph summary of *text* focused on *topic*."""
    truncated = text[:_MAX_INPUT_CHARS]

    prompt = (
        f"Summarise the following text in 2–3 paragraphs focused on the topic: '{topic}'.\n"
        f"Be concise, factual, and highlight the most relevant information.\n\n"
        f"Text:\n{truncated}"
    )

    response = await llm.ainvoke(prompt)
    return str(response.content)
