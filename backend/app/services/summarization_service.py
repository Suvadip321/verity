"""Summarises extracted source text using Mistral."""

from app.core.llm import llm, with_llm_retry

_MAX_INPUT_CHARS = 12_000


@with_llm_retry()
async def summarise_text(text: str, topic: str) -> str:
    """Return a 2–3 paragraph summary of *text* focused on *topic*."""
    truncated = text[:_MAX_INPUT_CHARS]

    prompt = (
        f"You are a strict research assistant. Summarise the following text in 2–3 paragraphs focused strictly on the topic: '{topic}'.\n"
        f"CRITICAL INSTRUCTIONS:\n"
        f"- Be concise and strictly factual.\n"
        f"- ONLY include information that is explicitly stated in the source text.\n"
        f"- DO NOT hallucinate, infer, or bring in outside knowledge.\n"
        f"- If the text does not contain relevant information, state 'No relevant information found in this source.'\n\n"
        f"Text:\n{truncated}"
    )

    response = await llm.ainvoke(prompt)
    return str(response.content)
