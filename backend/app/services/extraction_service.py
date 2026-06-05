"""Downloads a webpage and extracts clean body text using BeautifulSoup."""

import httpx
from bs4 import BeautifulSoup

_TIMEOUT = 10
_MIN_TEXT_LENGTH = 200
_STRIP_TAGS = ["nav", "header", "footer", "script", "style", "aside", "noscript"]


async def extract_text(url: str) -> str:
    """Fetch a URL and return clean body text, or empty string on any failure."""
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            response.raise_for_status()
            html = response.text
    except Exception as exc:
        print(f"[extraction_service] Failed to fetch '{url}': {exc}")
        return ""

    try:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup((_STRIP_TAGS)):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
    except Exception as exc:
        print(f"[extraction_service] Failed to parse '{url}': {exc}")
        return ""

    if len(text) < _MIN_TEXT_LENGTH:
        return ""

    return text
