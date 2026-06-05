import asyncio
import sys

from app.database.connection import async_session
from app.services.chat_service import chat

async def test_rag():
    session_id = 13
    question = "What does the research say about exercise and mental health?"
    
    print(f"\n🔍 Searching vector database for Session {session_id}...")
    print(f"💬 Asking Mistral (RAG): '{question}'\n")
    
    try:
        async with async_session() as db:
            answer = await chat(question=question, session_id=session_id, db=db)
            
            print("="*60)
            print("🤖 Mistral's Answer (Grounded in your research):")
            print("="*60)
            print(answer)
            print("\n" + "="*60 + "\n")
    except Exception as e:
        print(f"❌ Error during RAG chat: {e}")

if __name__ == "__main__":
    asyncio.run(test_rag())
