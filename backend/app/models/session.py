from datetime import datetime
from typing import List, Optional

from sqlalchemy import Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.models.base import Base

class ResearchSession(Base):
    __tablename__ = "research_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, index=True) # UUID string linked to auth.users
    topic: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="pending")
    current_step: Mapped[str] = mapped_column(String, default="pending")
    report_markdown: Mapped[Optional[str]] = mapped_column(Text)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    questions: Mapped[List["ResearchQuestion"]] = relationship("ResearchQuestion", back_populates="session", cascade="all, delete-orphan")
    sources: Mapped[List["ResearchSource"]] = relationship("ResearchSource", back_populates="session", cascade="all, delete-orphan")


class ResearchQuestion(Base):
    __tablename__ = "research_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("research_sessions.id", ondelete="CASCADE"))
    question: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session: Mapped["ResearchSession"] = relationship("ResearchSession", back_populates="questions")


class ResearchSource(Base):
    __tablename__ = "research_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("research_sessions.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(Text)
    relevance_score: Mapped[Optional[int]] = mapped_column(Integer)
    credibility_score: Mapped[Optional[int]] = mapped_column(Integer)
    usefulness_score: Mapped[Optional[int]] = mapped_column(Integer)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text)
    summary: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session: Mapped["ResearchSession"] = relationship("ResearchSession", back_populates="sources")
