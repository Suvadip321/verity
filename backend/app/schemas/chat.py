from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
