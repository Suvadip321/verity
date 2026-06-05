"""
Smoke tests for services.

Run from the backend/ directory:
    python -m tests.test_services

These tests make real API calls (Mistral + Tavily).
Ensure your .env has MISTRAL_API_KEY and TAVILY_API_KEY set before running.
"""

import asyncio
import sys


TOPIC = "AI in healthcare"


def ok(label: str) -> None:
    print(f"  ✅ {label}")

def fail(label: str, exc: Exception) -> None:
    print(f"  ❌ {label}: {exc}")


async def test_planner() -> list[str]:
    print("\nPlanner Service")
    from app.services.planner_service import generate_questions

    questions = await generate_questions(TOPIC)
    assert len(questions) == 3, f"Expected 3 questions, got {len(questions)}"
    for i, q in enumerate(questions, 1):
        print(f"  Q{i}: {q}")
    ok("generate_questions returned 3 strings")
    return questions


async def test_search(questions: list[str]) -> list:
    print("\nSearch Service")
    from app.services.search_service import search_web

    results = await search_web(questions, TOPIC)
    assert len(results) >= 5, f"Expected ≥5 results, got {len(results)}"
    for r in results[:3]:
        print(f"  {r.title[:60]} | {r.url[:50]}")
    ok(f"search_web returned {len(results)} results")
    return results


async def test_evaluator(results: list) -> list:
    print("\nEvaluator Service")
    from app.services.evaluator_service import evaluate_sources

    scored = await evaluate_sources(results, TOPIC)
    assert 1 <= len(scored) <= 5, f"Expected 1–5 scored sources, got {len(scored)}"
    for s in scored:
        print(f"  [{s.total_score}/15] {s.title[:55]}")
    ok(f"evaluate_sources returned {len(scored)} scored sources")
    return scored


async def test_extraction(scored: list) -> list[str]:
    print("\nExtraction Service")
    from app.services.extraction_service import extract_text

    texts: list[str] = []
    for source in scored[:2]:  # only test first 2 to save time
        text = await extract_text(source.url)
        status = f"{len(text)} chars" if text else "skipped (empty/failed)"
        print(f"  {source.url[:55]} → {status}")
        texts.append(text)

    non_empty = [t for t in texts if t]
    if not non_empty:
        print("  ⚠️  All extractions returned empty (sites may be blocking bots) — this is ok")
    ok(f"extract_text ran without crashing ({len(non_empty)}/{len(texts)} URLs returned text)")
    return texts


async def test_summarization(texts: list[str]) -> list[str]:
    print("\nSummarization Service")
    from app.services.summarization_service import summarise_text

    summaries: list[str] = []
    for text in texts:
        if not text:
            summaries.append("")
            continue
        summary = await summarise_text(text, TOPIC)
        assert len(summary) > 50, "Summary too short"
        print(f"  Preview: {summary[:120].strip()}…")
        summaries.append(summary)

    ok("summarise_text returned readable summaries")
    return [s for s in summaries if s]


async def test_sufficiency(summaries: list[str]) -> None:
    print("\nSufficiency Service")
    from app.services.sufficiency_service import check_sufficiency

    result = await check_sufficiency(summaries, TOPIC)
    print(f"  enough: {result.enough}")
    print(f"  missing_areas: {result.missing_areas}")
    ok("check_sufficiency returned a SufficiencyResult")


async def test_embedding(texts: list[str]) -> None:
    print("\nEmbedding Service")
    from app.services.embedding_service import embed_text, embed_chunks

    # Test single embedding
    vector = await embed_text("AI is transforming healthcare.")
    assert len(vector) == 1024, f"Expected 1024 dims, got {len(vector)}"
    ok(f"embed_text returned a vector of {len(vector)} floats")

    # Test chunking + embedding on real extracted text
    sample_text = next((t for t in texts if len(t) > 200), None)
    if sample_text:
        chunks = await embed_chunks(sample_text)
        assert len(chunks) >= 1, "No chunks produced"
        ok(f"embed_chunks produced {len(chunks)} chunk(s)")
    else:
        print("  ⚠️  No extracted text available — skipping chunk embedding test")


async def test_report(questions: list[str], summaries: list[str]) -> None:
    print("\nReport Service")
    from app.services.report_service import generate_report

    report = await generate_report(TOPIC, questions, summaries)
    assert len(report) > 100, "Report too short"
    assert "##" in report, "Report missing markdown headings"
    print(f"  Preview: {report[:200].strip()}…")
    ok("generate_report returned a markdown report")


async def run_all() -> None:
    print("=" * 60)
    print(f"  Verity Service Smoke Tests  |  Topic: '{TOPIC}'")
    print("=" * 60)

    try:
        questions = await test_planner()
    except Exception as e:
        fail("Planner", e); sys.exit(1)

    try:
        results = await test_search(questions)
    except Exception as e:
        fail("Search", e); sys.exit(1)

    try:
        scored = await test_evaluator(results)
    except Exception as e:
        fail("Evaluator", e); scored = []

    try:
        texts = await test_extraction(scored)
    except Exception as e:
        fail("Extraction", e); texts = []

    try:
        summaries = await test_summarization(texts)
    except Exception as e:
        fail("Summarization", e); summaries = []

    if summaries:
        try:
            await test_sufficiency(summaries)
        except Exception as e:
            fail("Sufficiency", e)

        try:
            await test_report(questions, summaries)
        except Exception as e:
            fail("Report", e)

    try:
        await test_embedding(texts)
    except Exception as e:
        fail("Embedding", e)

    print("\n" + "=" * 60)
    print("  All smoke tests complete.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_all())
