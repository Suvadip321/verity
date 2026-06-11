from langchain_mistralai import ChatMistralAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings

llm = ChatMistralAI(
    model="mistral-small-latest",
    api_key=settings.MISTRAL_API_KEY,
    max_retries=3,
    temperature=0.0,
)

def with_llm_retry():
    return retry(
        stop=stop_after_attempt(6),
        wait=wait_exponential(multiplier=1.5, min=2, max=30),
        reraise=True,
    )
