"""Splits text into chunks and embeds each using mistral-embed."""

import asyncio

from langchain_mistralai import MistralAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings

embeddings_client = MistralAIEmbeddings(
    model="mistral-embed",
    api_key=settings.MISTRAL_API_KEY,
    max_retries=3,
)

_CHUNK_SIZE = 3000
_OVERLAP = 200


def _split_into_chunks(text: str) -> list[str]:
    """Split text into chunks using LangChain's RecursiveCharacterTextSplitter."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=_CHUNK_SIZE,
        chunk_overlap=_OVERLAP,
    )
    return splitter.split_text(text)


async def embed_text(text: str) -> list[float]:
    """Return a 1024-dimensional embedding vector for a single text string."""
    vector = await embeddings_client.aembed_query(text)
    return vector


async def embed_chunks(text: str) -> list[tuple[str, list[float]]]:
    """
    Split text into chunks and embed each one.

    Returns a list of (chunk_text, embedding_vector) tuples,
    ready to be saved to the document_chunks table.
    """
    chunks = _split_into_chunks(text)
    results: list[tuple[str, list[float]]] = []

    for chunk in chunks:
        if not chunk.strip():
            continue
        try:
            vector = await embed_text(chunk)
            results.append((chunk, vector))
            await asyncio.sleep(1)
        except Exception as exc:
            print(f"[embedding_service] Failed to embed chunk: {exc}")

    return results
