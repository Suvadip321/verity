from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ResearchQuestionResponse(BaseModel):
    id: int
    question: str
    created_at: datetime

    class Config:
        from_attributes = True


class ResearchSourceResponse(BaseModel):
    id: int
    title: str
    source_url: str
    relevance_score: Optional[int] = None
    credibility_score: Optional[int] = None
    usefulness_score: Optional[int] = None
    summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    topic: str

class SessionUpdate(BaseModel):
    topic: str


class SessionListResponse(BaseModel):
    id: int
    topic: str
    status: str
    current_step: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SessionResponse(SessionListResponse):
    report_markdown: Optional[str] = None
    questions: List[ResearchQuestionResponse] = []
    sources: List[ResearchSourceResponse] = []
