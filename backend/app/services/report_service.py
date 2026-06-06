"""Generates the final markdown research report using Mistral."""

from app.core.llm import llm


async def generate_report(
    topic: str,
    questions: list[str],
    summaries: list[str],
) -> str:
    """Generate a structured markdown report from the research summaries."""
    questions_text = "\n".join(f"- {q}" for q in questions)
    summaries_text = "\n\n---\n\n".join(
        f"Source {i + 1}:\n{s}" for i, s in enumerate(summaries)
    )

    prompt = (
        f"You are writing a research report on the topic: '{topic}'.\n\n"
        f"Research Questions:\n{questions_text}\n\n"
        f"Source Summaries:\n{summaries_text}\n\n"
        f"Write a comprehensive markdown report with these exact sections:\n"
        f"1. ## Introduction\n"
        f"2. ## Research Questions\n"
        f"3. ## Key Findings (one ### subsection per source)\n"
        f"4. ## Conclusion\n\n"
        f"Be factual. Only use information from the summaries above. Do not hallucinate."
    )

    response = await llm.ainvoke(prompt)
    return str(response.content)
