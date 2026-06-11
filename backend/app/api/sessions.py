from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.database.connection import get_db
from app.models.chat import ChatMessage
from app.models.session import ResearchSession
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessageResponse
from app.schemas.session import SessionCreate, SessionResponse, SessionListResponse, SessionUpdate
from app.services.chat_service import chat, get_messages

router = APIRouter(prefix="/sessions", tags=["sessions"])


async def _get_session_or_404(session_id: int, user_id: str, db: AsyncSession) -> ResearchSession:
    result = await db.execute(
        select(ResearchSession)
        .where(ResearchSession.id == session_id)
        .where(ResearchSession.user_id == user_id)
        .options(selectinload(ResearchSession.questions), selectinload(ResearchSession.sources))
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: SessionCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    new_session = ResearchSession(
        user_id=user.id,
        topic=request.topic,
        status="pending",
        current_step="pending",
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    await db.refresh(new_session, attribute_names=["questions", "sources"])
    return new_session


from sqlalchemy.orm import defer

@router.get("", response_model=list[SessionListResponse])
async def list_sessions(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ResearchSession)
        .where(ResearchSession.user_id == user.id)
        .options(defer(ResearchSession.report_markdown))
        .order_by(ResearchSession.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_session_or_404(session_id, user.id, db)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session_or_404(session_id, user.id, db)
    await db.delete(session)
    await db.commit()
    return None


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_in: SessionUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session_or_404(session_id, user.id, db)
    session.topic = session_in.topic
    await db.commit()
    await db.refresh(session)
    await db.refresh(session, attribute_names=["questions", "sources"])
    return session


@router.post("/{session_id}/run", status_code=status.HTTP_202_ACCEPTED)
async def run_session(
    session_id: int,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session_or_404(session_id, user.id, db)

    if session.status not in ("pending", "failed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is already '{session.status}'. Only pending or failed sessions can be run.",
        )


    session.status = "starting"
    await db.commit()

    from app.graph.workflow import run_workflow
    background_tasks.add_task(run_workflow, session_id, session.topic)

    return {"status": "started"}


@router.post("/{session_id}/chat", response_model=ChatResponse)
async def chat_with_session(
    session_id: int,
    request: ChatRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_session_or_404(session_id, user.id, db)
    answer = await chat(request.question, session_id, db)
    return ChatResponse(answer=answer)


@router.delete("/{session_id}/chat")
async def clear_session_chat(
    session_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_session_or_404(session_id, user.id, db)
    await db.execute(delete(ChatMessage).where(ChatMessage.session_id == session_id))
    await db.commit()
    return {"status": "success"}


@router.get("/{session_id}/messages", response_model=list[ChatMessageResponse])
async def get_session_messages(
    session_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_session_or_404(session_id, user.id, db)
    messages = await get_messages(session_id, db)
    return messages


@router.get("/{session_id}/sources")
async def get_session_sources(
    session_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session_or_404(session_id, user.id, db)
    return session.sources


@router.get("/{session_id}/questions")
async def get_session_questions(
    session_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session_or_404(session_id, user.id, db)
    return session.questions
