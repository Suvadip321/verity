from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database.connection import get_db
from app.core.dependencies import get_current_user
from app.models.session import ResearchSession
from app.schemas.session import SessionCreate, SessionResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])



@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: SessionCreate,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new research session for the logged-in user.
    """
    new_session = ResearchSession(
        user_id=user.id,
        topic=request.topic,
        status="pending",
        current_step="pending"
    )
    
    db.add(new_session)
    await db.commit()
    
    query = (
        select(ResearchSession)
        .where(ResearchSession.id == new_session.id)
        .options(
            selectinload(ResearchSession.questions),
            selectinload(ResearchSession.sources)
        )
    )
    result = await db.execute(query)
    return result.scalars().first()

@router.get("", response_model=List[SessionResponse])
async def list_sessions(
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all research sessions belonging to the logged-in user.
    """
    query = (
        select(ResearchSession)
        .where(ResearchSession.user_id == user.id)
        .options(selectinload(ResearchSession.questions), selectinload(ResearchSession.sources))
        .order_by(ResearchSession.created_at.desc())
    )
    
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Gets the details of a specific research session.
    """
    query = (
        select(ResearchSession)
        .where(ResearchSession.id == session_id)
        .where(ResearchSession.user_id == user.id)
        .options(selectinload(ResearchSession.questions), selectinload(ResearchSession.sources))
    )
    
    result = await db.execute(query)
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
        
    return session
