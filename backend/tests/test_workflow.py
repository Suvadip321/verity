"""
Direct workflow test — runs the full 8-node pipeline without the HTTP server.

Usage (from backend/):
    python -m tests.test_workflow

You need a real session_id that already exists in the DB.
Either create one via Swagger first, or set CREATE_SESSION = True below.
"""

import asyncio
from dotenv import load_dotenv

load_dotenv()

TOPIC = "benefits of watching sports"


CREATE_SESSION = True
SESSION_ID = None

USER_ID = "f3639163-4010-48ff-9b1a-a27931fc763e"



async def main():
    from app.database.connection import async_session
    import app.models
    from app.models.session import ResearchSession
    from sqlalchemy.future import select

    session_id = SESSION_ID

    if CREATE_SESSION:
        print(f"Creating session for topic: '{TOPIC}'")
        async with async_session() as db:
            new_session = ResearchSession(
                user_id=USER_ID,
                topic=TOPIC,
                status="pending",
                current_step="pending",
            )
            db.add(new_session)
            await db.flush()
            await db.commit()
            session_id = new_session.id
        print(f"  Created session id={session_id}")

    print(f"\nRunning workflow for session {session_id}...")
    print("Watch status changes in Supabase Table Editor → research_sessions\n")

    from app.graph.workflow import run_workflow
    await run_workflow(session_id, TOPIC)

    print("\nWorkflow complete. Checking results...")
    async with async_session() as db:
        result = await db.execute(
            select(ResearchSession).where(ResearchSession.id == session_id)
        )
        session = result.scalars().first()

    print(f"  Status:       {session.status}")
    print(f"  Current step: {session.current_step}")
    if session.error_message:
        print(f"  Error:        {session.error_message[:300]}")
    if session.report_markdown:
        print(f"\n--- Report preview ---")
        print(session.report_markdown[:500])
        print("...")

if __name__ == "__main__":
    asyncio.run(main())
