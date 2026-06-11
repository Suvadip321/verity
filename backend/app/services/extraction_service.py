"""Downloads a webpage and extracts clean body text using BeautifulSoup."""

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

_TIMEOUT = 30
_MIN_TEXT_LENGTH = 200
_STRIP_TAGS = ["nav", "header", "footer", "script", "style", "aside", "noscript"]

_client = httpx.AsyncClient(
    timeout=_TIMEOUT,
    follow_redirects=True,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    },
)

def _should_retry_http_error(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code >= 500
    if isinstance(exc, httpx.RequestError):
        return True
    return False

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception(_should_retry_http_error),
    reraise=True,
)
async def _fetch_url(url: str) -> str:
    """Fetches a URL with exponential backoff on transient network failures."""
    response = await _client.get(url)
    response.raise_for_status()
    return response.text

async def extract_text(url: str) -> str:
    """Fetch a URL and return clean body text using Jina Reader API, with a BeautifulSoup fallback."""
    text = ""
    try:
        jina_url = f"https://r.jina.ai/{url}"
        raw_text = await _fetch_url(jina_url)
        text = raw_text.replace('\x00', '')
    except Exception as exc:
        print(f"[extraction_service] Jina failed for '{url}': {exc.__class__.__name__} - {exc}")
        print(f"[extraction_service] Attempting raw BeautifulSoup fallback for '{url}'...")
        try:
            raw_html = await _fetch_url(url)
            soup = BeautifulSoup(raw_html, "html.parser")
            
            for tag in soup(_STRIP_TAGS):
                tag.decompose()
                
            text = soup.get_text(separator="\n", strip=True)
            text = text.replace('\x00', '')
        except Exception as fallback_exc:
            print(f"[extraction_service] Fallback also failed for '{url}': {fallback_exc}")
            return ""

    if len(text) < _MIN_TEXT_LENGTH:
        return ""

    return text
