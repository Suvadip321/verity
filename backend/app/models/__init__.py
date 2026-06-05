# Import all models here so SQLAlchemy's mapper registry knows about every class.
# Without this, relationships that reference models from other files fail with
# "failed to locate a name" errors at runtime.
from app.models.session import ResearchSession, ResearchQuestion, ResearchSource
from app.models.chat import ChatMessage, DocumentChunk

__all__ = [
    "ResearchSession",
    "ResearchQuestion",
    "ResearchSource",
    "ChatMessage",
    "DocumentChunk",
]
