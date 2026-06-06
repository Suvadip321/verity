from pydantic import BaseModel

from app.core.llm import llm


class _ResearchQuestions(BaseModel):
    questions: list[str]


_SYSTEM_PROMPT = """\
You are a research assistant. Your task is to break a broad topic into
exactly 3 focused, non-overlapping research questions that together give a
comprehensive understanding of the topic.

Each question must end with a question mark and be self-contained.
"""


async def generate_questions(topic: str) -> list[str]:
    """Return exactly 3 research questions for the given topic."""
    prompt = (
        f"{_SYSTEM_PROMPT}\n\n"
        f"Topic: {topic}\n\n"
        "Generate the 3 research questions now."
    )

    structured_llm = llm.with_structured_output(_ResearchQuestions)

    try:
        response = await structured_llm.ainvoke(prompt)
    except Exception as exc:
        raise RuntimeError(f"[planner_service] Failed to generate questions: {exc}") from exc

    questions = response.questions
    if len(questions) < 3:
        raise ValueError(f"Expected 3 questions, got {len(questions)}")

    return questions[:3]
