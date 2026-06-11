"""Splits text into chunks and embeds each using mistral-embed."""

import asyncio

from langchain_mistralai import MistralAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.core.llm import with_llm_retry

embeddings_client = MistralAIEmbeddings(
    model="mistral-embed",
    api_key=settings.MISTRAL_API_KEY,
    max_retries=3,
)

_CHUNK_SIZE = 3000
_OVERLAP = 200
_RATE_LIMIT_SLEEP = 1.0  # seconds between embed calls (Mistral free tier limit)

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=_CHUNK_SIZE,
    chunk_overlap=_OVERLAP,
)


@with_llm_retry()
async def embed_text(text: str) -> list[float]:
    """Return an embedding vector for a single text string."""
    return await embeddings_client.aembed_query(text)


@with_llm_retry()
async def embed_chunks(text: str) -> list[tuple[str, list[float]]]:
    """Split text into chunks and return (chunk, vector) pairs."""
    chunks = [c for c in _splitter.split_text(text) if c.strip()]
    if not chunks:
        return []

    try:
        batch_size = 20
        vectors = []
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            batch_vectors = await embeddings_client.aembed_documents(batch)
            vectors.extend(batch_vectors)
            if i + batch_size < len(chunks):
                await asyncio.sleep(_RATE_LIMIT_SLEEP)
        return list(zip(chunks, vectors))
    except Exception as exc:
        print(f"[embedding_service] Failed to embed chunks: {exc}")
        return []
