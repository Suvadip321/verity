from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ResearchQuestionBase(BaseModel):
    question: str

class ResearchQuestionResponse(ResearchQuestionBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ResearchSourceBase(BaseModel):
    title: str
    source_url: str
    relevance_score: Optional[int] = None
    credibility_score: Optional[int] = None
    usefulness_score: Optional[int] = None
    extracted_text: Optional[str] = None
    summary: Optional[str] = None

class ResearchSourceResponse(ResearchSourceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    topic: str

class SessionResponse(BaseModel):
    id: int
    topic: str
    status: str
    current_step: str
    report_markdown: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    
    questions: List[ResearchQuestionResponse] = []
    sources: List[ResearchSourceResponse] = []

    class Config:
        from_attributes = True
