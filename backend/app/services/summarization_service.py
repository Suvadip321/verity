"""Summarises extracted source text using Mistral."""

from app.core.llm import llm

_MAX_INPUT_CHARS = 12_000


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
