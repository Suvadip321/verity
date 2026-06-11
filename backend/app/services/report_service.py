"""Generates the final markdown research report using Mistral."""

from langchain_mistralai import ChatMistralAI
from app.core.config import settings
from app.core.llm import with_llm_retry

report_llm = ChatMistralAI(
    model="mistral-small-latest",
    api_key=settings.MISTRAL_API_KEY,
    max_retries=3,
    temperature=0.0,
)

@with_llm_retry()
async def generate_report(
    topic: str,
    questions: list[str],
    source_data: list[dict],
) -> str:
    """Generate a structured markdown report from the research summaries."""
    questions_text = "\n".join(f"- {q}" for q in questions)
    
    summaries_text = "\n\n---\n\n".join(
        f"Title: {data['title']}\nSummary:\n{data['summary']}" 
        for data in source_data
    )

    prompt = (
        f"You are an expert academic researcher and analyst writing a final comprehensive report on the topic: '{topic}'.\n\n"
        f"The following research questions were explored:\n{questions_text}\n\n"
        f"Source Summaries:\n{summaries_text}\n\n"
        f"Write a perfectly balanced, highly analytical, and comprehensive markdown report. The output MUST read like a high-quality academic research paper or a professional whitepaper.\n"
        f"You must synthesize the information objectively, presenting varying perspectives, trade-offs, and empirical data. DO NOT simply list the sources. Avoid marketing fluff, hyperbole, or bias.\n\n"
        f"REPORT STRUCTURE:\n"
        f"- Use a single `#` for the main title of the report.\n"
        f"- Start with an Abstract or Executive Summary.\n"
        f"- Create your own deeply analytical sections based on the themes discovered, using standard markdown headers (`##` and `###`). Ensure a logical flow of arguments.\n"
        f"- End with a strong, evidence-based Conclusion.\n"
        f"- DO NOT include a 'References', 'Sources Cited', or Bibliography section at the end of the report.\n\n"
        f"MARKDOWN STYLING RULES:\n"
        f"- DO NOT use bolding (`**`) inside any headers (e.g., use `## Executive Summary` instead of `## **Executive Summary**`).\n"
        f"- When referencing or quoting sources, use their Title in plain text or italics. DO NOT use markdown link syntax (like `[Title]`) as it renders as a broken link.\n"
        f"- When listing advantages, limitations, or bullet points, ALWAYS use proper markdown list syntax (starting with `-` or `*`) rather than just line breaks.\n"
        f"- **USE Markdown Tables** whenever comparing technologies, listing pros/cons, or presenting structured data. Tables make the report much more professional.\n"
        f"- If you need to include multiple lines or lists inside a table cell, you MUST use the `<br>` tag. DO NOT use raw newlines (`\\n`) inside table cells, as it breaks the markdown formatting.\n\n"
        f"CRITICAL RULES FOR FACTUAL ACCURACY:\n"
        f"1. You MUST ONLY use the information provided in the 'Source Summaries' above. If a summary says 'No relevant information', ignore it entirely.\n"
        f"2. DO NOT use your own prior knowledge or hallucinate any facts, statistics, or claims.\n"
        f"3. Your conclusions must be strictly grounded in the provided evidence."
    )

    response = await report_llm.ainvoke(prompt)
    return str(response.content)
