# Verity — AI Research Assistant
## Complete 21-Day Implementation Plan

> **What you're building:** Type a topic like *"Climate Change and Food Security"* — Verity automatically breaks it into research questions, searches the web for real sources, scores them, reads them, summarises them, embeds everything into a vector database, writes a full report, and lets you chat with that report. All of this runs as a live, observable workflow on screen.

---

## Tech Stack — All Free

### Backend (Python)

| Tool | What It Does | Why This One |
|------|-------------|-------------|
| **Python 3.12** | Programming language | Latest stable; faster than 3.11 |
| **uv** | Package manager (replaces pip) | 10–100× faster installs; modern standard |
| **FastAPI** | Web framework — handles HTTP requests | Async-native; auto-generates API docs at `/docs` |
| **Supabase** | PostgreSQL + Auth + OAuth + Realtime + Storage + RLS | One free platform replaces 4–5 separate services |
| **pgvector** | Vector search inside Supabase's PostgreSQL | No separate vector DB needed |
| **SQLAlchemy (async)** | Python ↔ database bridge (ORM) | Industry standard; async support built in |
| **Alembic** | Database migration manager | Version control for your DB schema |

### AI Layer

| Tool | What It Does | Free Tier |
|------|-------------|-----------|
| **`mistral-small-latest`** | Main LLM — questions, scoring, summaries, reports | Free via Mistral API |
| **`mistral-embed`** | Converts text to 1024-dim vectors for RAG | Free via Mistral API |
| **LangGraph** | Builds the agentic workflow graph | Open source |
| **`langchain-mistralai`** | Official LangChain integration for Mistral | Open source |
| **Tavily API** | Web search built for AI agents | 1,000 searches/month free |
| **LangSmith** | Traces every LLM call — essential for debugging and demos | Free developer tier |
| **BeautifulSoup4 + httpx** | Downloads and cleans webpages | Open source |

> ⚠️ **Model notes:** We transitioned from Gemini to Mistral to avoid rate limits. `mistral-small-latest` handles all text generation and `mistral-embed` outputs robust 1024-dimensional vectors for similarity search.

### Frontend (Next.js)

| Tool | What It Does | Why This One |
|------|-------------|-------------|
| **Next.js 15 (App Router)** | React framework | Industry standard; file-based routing |
| **TypeScript** | JavaScript with type checking | Catches bugs before runtime |
| **Tailwind CSS v4** | Utility-first styling | No custom CSS files needed |
| **shadcn/ui** | Ready-made polished UI components | Professional look, zero effort |
| **Zustand** | Lightweight global state management | Simpler than Redux for this scale |
| **`@supabase/supabase-js`** | Frontend Supabase client | Auth + OAuth + Realtime in one package |
| **`@supabase/ssr`** | Server-side Supabase helpers for Next.js | Handles cookie-based sessions properly |

### Deployment — All Free

| Service | What You Deploy There | Free Tier |
|---------|----------------------|-----------|
| **Vercel** | Next.js frontend | Unlimited hobby projects |
| **Render** | FastAPI backend | Free (sleeps after 15 min inactivity) |
| **Supabase** | Database + Auth + Realtime + pgvector | 500MB storage, unlimited API calls |

---

## Full Supabase Advantage — What You're Getting for Free

Supabase replaces what would normally take you a week to build separately:

**Supabase Auth + OAuth** — replaces building your own auth system entirely
- Email/password signup and login, handled by Supabase
- OAuth with Google and GitHub — users click one button, they're in. You write ~5 lines of code.
- JWTs are created, refreshed, and stored automatically
- Frontend: `@supabase/supabase-js` attaches the token to every request automatically
- Backend: verify with `supabase.auth.get_user(token)` — one line

**Supabase Realtime** — replaces building an SSE/WebSocket endpoint
- Your workflow nodes just update `current_step` in the database (already happening)
- Supabase broadcasts those DB changes to the frontend via WebSocket automatically
- The progress stepper lights up in real time — no polling loop, no SSE endpoint to build

**Row Level Security (RLS)** — data protection built into the database
- One SQL policy ensures users can only see their own research sessions
- You never accidentally return another user's data; the database enforces it
- No need to manually add `WHERE user_id = current_user` to every query

**pgvector** — your vector database, inside your existing Postgres
- No separate vector DB service, no extra credentials, no extra cost
- Vector similarity search right alongside your regular SQL queries

---

## How the Full System Works

### The 8-Step Agentic Workflow

```
User types topic
      ↓
[planner_node]       → Asks Mistral to generate 3 research questions
      ↓
[search_node]        → Calls Tavily to search the web for each question
      ↓
[evaluator_node]     → Asks Mistral to score each result (relevance/credibility/usefulness 1–5), keeps top 5
      ↓
[extraction_node]    → Downloads each source URL, strips HTML with BeautifulSoup, saves clean text
      ↓
[summarization_node] → Asks Mistral to summarise each source in 2–3 paragraphs
      ↓
[sufficiency_node]   → Asks: "Is there enough info for a full report?" If NO and first attempt → loop back to search
      ↓
[embedding_node]     → Splits text into chunks, embeds each with mistral-embed, saves to pgvector
      ↓
[report_node]        → Feeds all summaries to Mistral, generates a full markdown report
```

### Session Status Flow
```
pending → planning → searching → evaluating_sources → extracting →
summarizing → checking_sufficiency → embedding → generating_report → completed

(If any node fails at any point → failed)
```

### How RAG Chat Works

```
User types a question
      ↓
Backend converts question to a vector using mistral-embed
      ↓
pgvector finds the 5 most similar chunks from YOUR research (filtered by session_id)
      ↓
Backend builds prompt: "Answer ONLY using this context: [5 chunks]. Question: [question]"
      ↓
Mistral answers — grounded in your research, no hallucination
      ↓
Both messages saved to DB — history persists across sessions
```

### How OAuth Works (Google / GitHub)

```
User clicks "Login with Google"
      ↓
Supabase redirects to Google's OAuth consent screen
      ↓
User approves → Google redirects to: https://[ref].supabase.co/auth/v1/callback
      ↓
Supabase validates the Google token, creates or fetches the user in auth.users
      ↓
Supabase redirects to your app's /auth/callback route with a code
      ↓
Your Next.js callback route exchanges the code for a session (using @supabase/ssr)
      ↓
User is logged in — JWT is stored in a cookie automatically
```

---

## Database Tables

Six tables. Each one is a spreadsheet where each row is one piece of data.

**`research_sessions`** — one row per research job

| Column | Type | Stores |
|--------|------|--------|
| id | integer (auto) | Unique ID |
| user_id | uuid | Which user — links to Supabase `auth.users` |
| topic | text | What the user typed |
| status | text | pending / planning / … / completed / failed |
| current_step | text | Latest step name — what Supabase Realtime broadcasts |
| report_markdown | text | Final generated report |
| error_message | text | If failed, why — always save this |
| created_at | timestamp | When created |

**`research_questions`** — the 3 AI-generated questions per session

**`research_sources`** — evaluated web sources with relevance/credibility/usefulness scores (1–5 each) and extracted + summarised text

**`document_chunks`** — the RAG table. Each row is one ~750-token chunk with a `vector(1024)` embedding column (using `mistral-embed` output size)

**`chat_messages`** — every user/assistant message, tied to a session

> `users` is managed automatically by Supabase Auth — you never create this table.

---

## API Endpoints

| Method | Route | What It Does | Auth? |
|--------|-------|-------------|-------|
| POST | `/auth/signup` | Email/password signup | No |
| POST | `/auth/login` | Email/password login, returns JWT | No |
| GET | `/auth/me` | Get current user info | Yes |
| POST | `/sessions` | Create new research session | Yes |
| GET | `/sessions` | List all sessions for this user | Yes |
| GET | `/sessions/{id}` | Get full session details | Yes |
| POST | `/sessions/{id}/run` | Start the agentic workflow in background | Yes |
| POST | `/sessions/{id}/chat` | Ask a RAG question | Yes |
| GET | `/sessions/{id}/messages` | Load chat history | Yes |
| GET | `/sessions/{id}/sources` | Get all scored sources | Yes |
| GET | `/sessions/{id}/questions` | Get research questions | Yes |

> OAuth (Google/GitHub) is handled entirely on the frontend via Supabase client — no backend routes needed. The frontend calls `supabase.auth.signInWithOAuth()` and Supabase handles everything.

---

## Project Folder Structure

```
verity/
├── backend/
│   ├── app/
│   │   ├── api/           ← HTTP routes ONLY. No business logic here.
│   │   ├── core/          ← Settings, Supabase client, JWT dependency
│   │   ├── database/      ← Async SQLAlchemy engine + session factory
│   │   ├── models/        ← SQLAlchemy table definitions (Python classes)
│   │   ├── schemas/       ← Pydantic shapes for API inputs/outputs
│   │   ├── services/      ← ALL logic: LLM calls, scraping, embedding, chat
│   │   ├── graph/         ← LangGraph: state, nodes, workflow assembly
│   │   └── main.py        ← App entry point, CORS, router registration
│   ├── alembic/           ← Auto-generated DB migrations (never edit manually)
│   ├── pyproject.toml     ← Python dependencies
│   └── .env               ← Secret keys — NEVER commit to GitHub
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/        ← Login, signup pages
│   │   ├── auth/callback/ ← OAuth redirect handler
│   │   ├── dashboard/     ← Sessions list + new research
│   │   └── sessions/[id]/ ← Session detail, stepper, report, chat
│   ├── components/        ← ProgressStepper, ChatInterface, SourceCard, etc.
│   ├── lib/               ← Axios API client, Supabase client setup
│   ├── store/             ← Zustand global state
│   └── types/             ← TypeScript interfaces
│
├── README.md              ← Must be impressive — see Day 21
└── .gitignore             ← Must include .env, .venv, __pycache__, .next
```

**The Golden Rule:** Routes handle HTTP. Services do the work. Nodes call services. Keep them separate — this is what professional codebases look like.

---

## The 21-Day Plan

> ✅ **The checkmark at the bottom of each day is your gate. Do not start the next day until it is met.** A working simple version beats an unfinished complex one.

---

### WEEK 1 — Backend Foundation (Days 1–7)

---

#### ✅ Day 1 — Project Setup & Environment

**Goal:** Your machine is fully set up and a basic FastAPI server is running.

**Why this matters:** Getting the environment right on Day 1 saves hours of debugging later. `uv` is significantly faster than `pip` and is becoming the Python standard.

**Steps:**

1. Install `uv`:
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```
2. Create the project:
   ```bash
   mkdir verity && cd verity
   mkdir backend frontend
   ```
3. Set up the Python project:
   ```bash
   cd backend
   uv init
   uv python pin 3.12
   ```
4. Add core dependencies:
   ```bash
   uv add fastapi uvicorn sqlalchemy[asyncio] asyncpg alembic python-dotenv pydantic-settings
   ```
5. Create `app/main.py`:
   ```python
   from fastapi import FastAPI
   app = FastAPI(title="Verity API")

   @app.get("/health")
   async def health():
       return {"status": "ok", "service": "verity"}
   ```
6. Create `.env.example` with placeholder keys:
   ```
   DATABASE_URL=
   SUPABASE_URL=
   SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   GOOGLE_API_KEY=
   TAVILY_API_KEY=
   LANGCHAIN_API_KEY=
   ```
7. Create `.gitignore`: add `.env`, `__pycache__/`, `.venv/`, `*.pyc`
8. Run: `uvicorn app.main:app --reload` → visit `http://localhost:8000/health`

✅ **Done when:** `GET /health` returns `{"status": "ok", "service": "verity"}`.

---

#### ✅ Day 2 — Supabase Setup & Database Connection

**Goal:** Python app connects to Supabase. pgvector is enabled.

**Why this matters:** Supabase gives you a production-grade PostgreSQL database, auth, realtime, and vector search for free. Setting this up correctly on Day 2 means every subsequent day builds on a solid foundation.

**Steps:**

1. Create a free account at [supabase.com](https://supabase.com) → create a project (pick the region closest to you)
2. Enable pgvector — in Supabase **SQL Editor** run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Get your connection string: Click **Connect** (green button, top bar) → **Direct** tab → **Session pooler** → Type: **URI** → copy the connection string
   > ⚠️ **Why Session pooler, not Transaction pooler?** `asyncpg` (our async driver) uses prepared statements by default, which Transaction pooling does not support — you'd get `prepared statement does not exist` errors. Session pooler also works correctly with Alembic migrations. Transaction pooler is designed for serverless/short-lived functions, not long-running servers like FastAPI.
4. Add to `.env`:
   ```
   DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[pw]@aws-1-[region].pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://[ref].supabase.co
   SUPABASE_ANON_KEY=...your anon key (Dashboard → Settings → API Keys → Legacy tab)...
   SUPABASE_SERVICE_ROLE_KEY=...your service role key (same page, click Reveal)...
   ```
   > ⚠️ The **service role key** bypasses Row Level Security — backend only. Never expose it to the frontend.
   > ⚠️ Use the **Legacy anon, service_role API keys** tab (not the new Publishable/Secret keys) — the Supabase Python and JS SDKs expect the legacy JWT format (`eyJ...`).
5. Create `app/core/config.py` — a `pydantic-settings` class that loads all `.env` variables into typed Python attributes
6. Create `app/database/connection.py`:
   ```python
   from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
   from app.core.config import settings

   engine = create_async_engine(settings.DATABASE_URL, echo=False)
   async_session = async_sessionmaker(engine, expire_on_commit=False)
   ```
7. Set up Alembic:
   ```bash
   alembic init alembic
   ```
   Update `alembic.ini` and `alembic/env.py` to use your `DATABASE_URL`
8. Test: `python -c "from app.database.connection import engine; print('Connected!')"`

✅ **Done when:** Python connects to Supabase with no errors.

---

#### ✅ Day 3 — Authentication: Email/Password + OAuth + Mobile Setup

**Goal:** Users can sign up, log in with email/password, and the OAuth providers (Google + GitHub) are configured in Supabase ready for the frontend.

**Why this matters:** Supabase Auth handles everything — password hashing, JWTs, token refresh, OAuth redirects. You write almost no auth code. The OAuth setup is done once in Supabase Dashboard and takes 10 minutes.

**Steps:**

**Backend:**

1. Install: `uv add supabase`
2. Create `app/core/supabase_client.py`:
   ```python
   from supabase import create_client
   from app.core.config import settings

   supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
   ```
3. Create `app/schemas/auth.py` — Pydantic models: `SignupRequest`, `LoginRequest`, `UserResponse`
4. Create `app/api/auth.py` with three routes:
   - `POST /auth/signup` → `supabase.auth.sign_up({email, password})`
   - `POST /auth/login` → `supabase.auth.sign_in_with_password({email, password})`, returns JWT
   - `GET /auth/me` → protected, returns current user
5. Create `app/core/dependencies.py`:
   ```python
   async def get_current_user(authorization: str = Header(...)):
       token = authorization.replace("Bearer ", "")
       response = supabase.auth.get_user(token)
       if not response.user:
           raise HTTPException(status_code=401, detail="Invalid token")
       return response.user
   ```
6. Register the auth router in `main.py`

**OAuth Provider Setup in Supabase Dashboard:**

*Google OAuth:*
- Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID
- Application type: Web application
- Authorized redirect URI: `https://[ref].supabase.co/auth/v1/callback`
- Copy **Client ID** and **Client Secret**
- In Supabase Dashboard → Authentication → Providers → Google → paste them in → Enable

*Mobile (SMS OTP):*
- Create an account with an SMS provider (like Twilio, MessageBird, or Textmagic)
- Get your API keys / Auth tokens from the provider
- In Supabase Dashboard → Authentication → Providers → Phone → select your provider, paste keys → Enable

> Google OAuth redirects to Supabase's callback URL, and Mobile SMS sends a 6-digit code. Supabase handles the token exchange for both!

✅ **Done when:** Email signup/login/`/auth/me` work in Swagger UI. Google and Mobile (Phone) are enabled in Supabase Dashboard.

---

#### ✅ Day 4 — Research Session Models & Routes

**Goal:** Build the core database foundation. Whenever a user types a topic to research, we need a secure, reliable place to store that task and all of its intermediate steps.

**Why this matters:**
Right now, the app can authenticate users, but they have nothing they can actually *do*. We need a place to permanently store the results of the AI's hard work (the generated questions, the web sources it finds, and the final report) so users can view their history later.

**Steps:**

1. **Create the Database Models (SQLAlchemy)**
   Create `app/models/session.py` and define three classes that represent our Postgres tables:
   - `ResearchSession`: The main folder holding `user_id` (linked to Auth), `topic`, `status`, `current_step`, `report_markdown`.
   - `ResearchQuestion`: The 3 generated questions. It will have a `session_id` foreign key.
   - `ResearchSource`: The scraped websites. Includes fields for `title`, `source_url`, `relevance_score`, `extracted_text`, and `summary`. It also has a `session_id` foreign key.

2. **Generate and run the migration (Alembic)**
   Run the terminal commands to translate those Python classes into real SQL tables in Supabase:
   ```bash
   alembic revision --autogenerate -m "add session tables"
   alembic upgrade head
   ```

3. **Enable Row Level Security (RLS)**
   Run this SQL script in the Supabase SQL Editor to guarantee User A can never see User B's sessions:
   ```sql
   ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users see own sessions"
     ON research_sessions FOR ALL
     USING (auth.uid() = user_id);
   ```

4. **Create Data Schemas (Pydantic)**
   Create `app/schemas/session.py` to define the API shapes:
   - `SessionCreate`: Expects just a `topic` string.
   - `SessionResponse`: Defines the shape of the data returned to the user.

5. **Build the API Routes (FastAPI)**
   Create `app/api/sessions.py` to expose three endpoints (protected by `get_current_user`):
   - `POST /sessions` — creates a new session with `status = "pending"`
   - `GET /sessions` — returns all sessions for the logged-in user
   - `GET /sessions/{id}` — returns details of one specific session

✅ **Done when:** You can create and list sessions via Swagger UI, and you can physically see the rows appearing in your Supabase Dashboard Table Editor. User B cannot see User A's sessions.

---

#### ✅ Day 5 — Planner + Search Services

**Goal:** Gemini generates research questions. Tavily searches the web.

**Steps:**

1. Get your **Google AI Studio** key at [aistudio.google.com](https://aistudio.google.com) → add as `GOOGLE_API_KEY`
2. Get your **Tavily** key at [tavily.com](https://tavily.com) → add as `TAVILY_API_KEY`
3. Install: `uv add google-genai tavily-python langchain langgraph`
   > Use `google-genai` (the official Google Python SDK) rather than the older `langchain-google-genai` wrapper
4. Create `app/services/planner_service.py`:
   ```python
   import google.genai as genai
   from app.core.config import settings

   client = genai.Client(api_key=settings.GOOGLE_API_KEY)

   async def generate_questions(topic: str) -> list[str]:
       response = client.models.generate_content(
           model="gemini-2.5-flash",
           contents=f"Generate exactly 3 focused research questions for: {topic}. Return as a numbered list."
       )
       # Parse the numbered list into a Python list of strings
       ...
   ```
5. Create `app/services/search_service.py`:
   ```python
   from tavily import TavilyClient
   # For each question, call tavily.search(), collect {title, url, snippet, score}
   ```
6. Test each service individually:
   ```bash
   python -c "import asyncio; from app.services.planner_service import generate_questions; print(asyncio.run(generate_questions('AI in healthcare')))"
   ```

✅ **Done when:** `generate_questions("AI in healthcare")` returns 3 strings. `search_web()` returns at least 5 results with real URLs.

---

#### ✅ Day 6 — Evaluator, Extraction & Summarisation Services

**Goal:** AI scores sources. Webpages are downloaded and cleaned. Each source is summarised.

**Steps:**

1. Install: `uv add httpx beautifulsoup4`
2. Create `app/services/evaluator_service.py`:
   - Prompt Gemini to score each source: relevance (1–5), credibility (1–5), usefulness (1–5)
   - Use structured output in the Gemini SDK:
     ```python
     response = client.models.generate_content(
         model="gemini-2.5-flash",
         contents=prompt,
         config=genai.GenerateContentConfig(
             response_mime_type="application/json",
             response_schema=list[SourceScore]  # Pydantic model
         )
     )
     ```
   - Sort by total score (sum of 3), return top 5
3. Create `app/services/extraction_service.py`:
   - Use `httpx` to download each URL (10-second timeout)
   - Use BeautifulSoup to extract only main body text — strip `<nav>`, `<header>`, `<footer>`, `<script>`, `<style>`
   - Return empty string on failure — **never crash the workflow**
   - Skip sources with less than 200 characters of extracted text
4. Create `app/services/summarization_service.py`:
   - Prompt: *"Summarise this text in 2–3 paragraphs focused on: {topic}"*
5. Test each with print statements — confirm output looks sensible

✅ **Done when:** Evaluator returns 5 scored sources. Extraction returns clean text from a real URL. Summarisation returns readable paragraphs.

---

#### ✅ Day 7 — Sufficiency, Embedding, Report & Chat Services

**Goal:** All core AI services are working end-to-end.

**Steps:**

1. Create `app/services/sufficiency_service.py`:
   - Prompt: *"Given these summaries, is there enough info to write a full report on {topic}?"*
   - Use structured JSON output: `{"enough": true/false, "missing_areas": [...]}`
   - Wrap in `try/except` — if JSON parsing fails, default to `enough=True` to avoid infinite loops
2. Create `app/services/embedding_service.py`:
   ```python
   # Use gemini-embedding-001 (NOT text-embedding-004 — it's shut down)
   result = client.models.embed_content(
       model="gemini-embedding-001",
       contents=chunk_text,
       config=genai.EmbedContentConfig(
           output_dimensionality=768  # Truncate from default 3072 to save storage
       )
   )
   vector = result.embeddings[0].values  # list of 768 floats
   ```
   - Split text into ~800-token chunks (split on sentence boundaries, accumulate until ~800 tokens)
   - Embed each chunk, save to `document_chunks` table (created on Day 8)
3. Create `app/services/report_service.py`:
   - Feed all summaries + questions + topic to Gemini
   - Request a structured markdown report: Introduction, Research Questions, Key Findings (one section per source), Conclusion
4. Create `app/services/retrieval_service.py`:
   - Embed the user's question using `gemini-embedding-001` with `output_dimensionality=768`
   - Query `document_chunks` using pgvector cosine similarity, filtered by `session_id`, `LIMIT 5`
5. Create `app/services/chat_service.py`:
   - Combine retrieval + RAG prompt + Gemini call
   - Prompt: *"Answer ONLY using the context below. Context: {chunks}. Question: {question}"*
   - Save both messages to `chat_messages`

✅ **Done when:** Each service runs without errors in a test script and returns sensible output.

---

### WEEK 2 — Agentic Workflow & Real-Time (Days 8–14)

---

#### ✅ Day 8 — Chat & Document Chunk Models + pgvector Migration

**Goal:** The database has the pgvector table ready for RAG.

**Steps:**

1. Create `app/models/chat.py`:
   - `ChatMessage` model (id, session_id, role, content, created_at)
   - `DocumentChunk` model with the vector column:
     ```python
     from pgvector.sqlalchemy import Vector
     embedding = Column(Vector(768))  # 768 dims — truncated from gemini-embedding-001's default 3072
     ```
2. Install: `uv add pgvector`
3. Run the migration:
   ```bash
   alembic revision --autogenerate -m "add chat and chunks"
   alembic upgrade head
   ```
4. Add a vector index in Supabase SQL Editor:
   ```sql
   CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ```
   This makes similarity search fast even with thousands of chunks.
5. Test: embed a short sentence with `output_dimensionality=768` and confirm the vector has exactly 768 dimensions

✅ **Done when:** Migration runs clean. `document_chunks` table exists in Supabase with an `embedding` column. A test embedding returns a list of exactly 768 floats.

---

#### ✅ Day 9 — LangGraph: State & Nodes

**Goal:** The graph skeleton exists — all 8 nodes are defined.

**Why this matters:** LangGraph state is the object that flows through all nodes. Each node receives it, does one job, and returns an updated version. This pattern is the core of the whole project.

**Steps:**

1. Create `app/graph/state.py`:
   ```python
   from typing import TypedDict

   class ResearchState(TypedDict):
       session_id: int
       topic: str
       questions: list[str]
       search_results: list[dict]
       selected_sources: list[dict]
       extracted_sources: list[dict]
       summaries: list[str]
       enough_information: bool
       missing_areas: list[str]
       retry_count: int
       report_markdown: str
   ```
2. Create `app/graph/nodes.py` — define all 8 node functions following this pattern:
   ```python
   async def planner_node(state: ResearchState) -> ResearchState:
       # 1. Call the matching service
       questions = await generate_questions(state["topic"])
       # 2. Update session status in DB
       await update_session_status(state["session_id"], "planning", "planning", db)
       # 3. Return updated state
       return {**state, "questions": questions}
   ```
   Create: `planner_node`, `search_node`, `evaluator_node`, `extraction_node`, `summarization_node`, `sufficiency_node`, `embedding_node`, `report_node`
3. Add the shared helper used by every node:
   ```python
   async def update_session_status(session_id, status, current_step, db):
       # This DB write is what Supabase Realtime will broadcast to the frontend
       await db.execute(
           update(ResearchSession)
           .where(ResearchSession.id == session_id)
           .values(status=status, current_step=current_step)
       )
       await db.commit()
   ```

✅ **Done when:** All 8 node functions are defined. `ResearchState` compiles without errors. Files import cleanly.

---

#### ✅ Day 10 — LangGraph: Graph Assembly & Run Endpoint

**Goal:** `POST /sessions/{id}/run` triggers the full 8-node pipeline in the background.

**Steps:**

1. Create `app/graph/workflow.py`:
   ```python
   from langgraph.graph import StateGraph, END
   from app.graph.state import ResearchState
   from app.graph.nodes import *

   def build_workflow():
       workflow = StateGraph(ResearchState)

       # Add all 8 nodes
       for name, fn in [("planner", planner_node), ("search", search_node),
                         ("evaluator", evaluator_node), ("extraction", extraction_node),
                         ("summarization", summarization_node), ("sufficiency", sufficiency_node),
                         ("embedding", embedding_node), ("report", report_node)]:
           workflow.add_node(name, fn)

       # Sequential edges
       workflow.set_entry_point("planner")
       workflow.add_edge("planner", "search")
       workflow.add_edge("search", "evaluator")
       workflow.add_edge("evaluator", "extraction")
       workflow.add_edge("extraction", "summarization")
       workflow.add_edge("summarization", "sufficiency")

       # Conditional edge: retry once or continue
       def should_retry(state: ResearchState) -> str:
           if not state["enough_information"] and state["retry_count"] < 1:
               return "search"   # loop back for one more search attempt
           return "embedding"    # continue to embedding regardless

       workflow.add_conditional_edges("sufficiency", should_retry,
                                       {"search": "search", "embedding": "embedding"})
       workflow.add_edge("embedding", "report")
       workflow.add_edge("report", END)

       return workflow.compile()

   graph = build_workflow()
   ```
2. Create `async def run_workflow(session_id: int)`:
   - Build initial state with `retry_count=0`
   - Call `await graph.ainvoke(initial_state)`
   - Wrap entire thing in `try/except` — on any failure: set status to `"failed"`, save `error_message`
3. Add the run endpoint to `app/api/sessions.py`:
   ```python
   @router.post("/{id}/run")
   async def run_session(id: int, user = Depends(get_current_user)):
       session = await get_session_or_404(id, user.id)  # verify ownership
       asyncio.create_task(run_workflow(id))  # fire and forget — don't await
       return {"status": "started"}
   ```

✅ **Done when:** Triggering `POST /sessions/{id}/run` causes the session to move through all statuses and land at `completed` with `report_markdown` populated. Verify in Supabase Table Editor.

---

#### ✅ Day 11 — LangSmith Setup & Workflow Debugging

**Goal:** Every LLM call is visible in LangSmith. Three different topics run successfully end-to-end.

**Why this matters:** LangSmith traces show you exactly what prompt was sent, what came back, how many tokens were used, and which node failed and why. In an interview, opening this dashboard is extremely impressive.

**Steps:**

1. Create a free account at [smith.langchain.com](https://smith.langchain.com)
2. Add to `.env`:
   ```
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=your_key_from_smith.langchain.com
   LANGCHAIN_PROJECT=verity
   ```
   LangGraph sends traces automatically — no code changes needed.
3. Run a workflow on a simple topic: *"benefits of regular exercise"*
4. Open LangSmith dashboard — you should see the full trace with every node, every LLM call, all inputs and outputs
5. Common bugs to fix at this stage:
   - **JSON parsing failure** in evaluator or sufficiency → add `try/except` + retry with stricter prompt
   - **Web page timeout** → your `try/except` in extraction already handles it
   - **Empty scraped text** → add a minimum character check (skip sources under 200 chars)
   - **Rate limit hit** → add `asyncio.sleep(1)` between Gemini calls in the same node
6. Run 3 different topics until all complete without errors

✅ **Done when:** Three topics complete with `status = "completed"`. Full traces visible in LangSmith.

---

#### ✅ Day 12 — RAG Chat Backend

**Goal:** Users can ask questions about their research and get grounded, non-hallucinated answers.

**Steps:**

1. Finish `app/services/retrieval_service.py`:
   ```python
   async def retrieve_chunks(question: str, session_id: int, db) -> list[str]:
       # 1. Embed the question
       result = client.models.embed_content(
           model="gemini-embedding-001",
           contents=question,
           config=genai.EmbedContentConfig(output_dimensionality=768)
       )
       query_vector = result.embeddings[0].values

       # 2. pgvector similarity search, filtered by session
       rows = await db.execute(
           text("""
               SELECT content FROM document_chunks
               WHERE session_id = :session_id
               ORDER BY embedding <=> CAST(:query_vector AS vector)
               LIMIT 5
           """),
           {"session_id": session_id, "query_vector": str(query_vector)}
       )
       return [row.content for row in rows]
   ```
2. Finish `app/services/chat_service.py`:
   - Call retrieval → build RAG prompt → call Gemini → save both messages → return answer
3. Add routes to `app/api/sessions.py`:
   - `POST /sessions/{id}/chat` — body: `{"question": str}`, returns `{"answer": str}`
   - `GET /sessions/{id}/messages` — returns all messages ordered by `created_at`
4. Test with Postman: run a workflow on a topic, then ask a specific question about it

✅ **Done when:** You get a relevant, grounded answer. The answer is based on the research, not general knowledge. Messages persist on reload.

---

#### ✅ Day 13 — Backend Polish, Error Handling & Full API Testing

**Goal:** Every endpoint is tested. No session can ever get permanently stuck.

**Steps:**

1. Go through every route in Postman — test the happy path AND error cases
2. Add error handling in every node: if a service throws, catch it, set `status = "failed"`, save `error_message`
3. Add ownership validation: if a session belongs to a different user, return `403 Forbidden`
4. Add CORS to `main.py`:
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000"],  # add Vercel URL after deployment
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"]
   )
   ```
5. Test these failure scenarios — confirm `status` is always updated:
   - Tavily search fails → continue with partial results
   - Webpage can't be scraped → skip it, don't crash
   - Mistral returns invalid JSON → retry once with stricter prompt
   - Embedding API fails → set `failed`, save error
6. Write `test_services.py` that calls each service with a real topic and prints results

✅ **Done when:** All endpoints return correct responses. No session can get stuck in a non-terminal state forever.

---

#### ✅ Day 14 — Supabase Realtime Setup

**Goal:** The frontend receives live workflow step updates without any SSE endpoint or polling.

**Why this matters:** Normally you'd need to build a Server-Sent Events endpoint to push progress updates. Supabase Realtime replaces this entirely — your backend just updates the database (already happening in every node), and Supabase broadcasts those changes via WebSocket.

**Steps:**

1. In Supabase Dashboard → **Database → Replication**: enable replication for the `research_sessions` table
2. That's all the backend setup needed. Every node already updates `current_step`.
3. Write the frontend subscription code (you'll use this in Day 17):
   ```typescript
   const channel = supabase
     .channel('session-progress')
     .on(
       'postgres_changes',
       {
         event: 'UPDATE',
         schema: 'public',
         table: 'research_sessions',
         filter: `id=eq.${sessionId}`
       },
       (payload) => {
         setCurrentStep(payload.new.current_step)
         setStatus(payload.new.status)
         if (['completed', 'failed'].includes(payload.new.status)) {
           channel.unsubscribe()
         }
       }
     )
     .subscribe()
   ```
4. Verify: open the **Supabase Realtime Inspector** in the dashboard and trigger a workflow — you should see `UPDATE` events appearing live as each node runs

✅ **Done when:** Supabase Realtime Inspector shows live UPDATE events for each step as the workflow progresses.

---

### WEEK 3 — Frontend & Deployment (Days 15–21)

---

#### ✅ Day 15 — Next.js Setup, Supabase Auth & OAuth

**Goal:** Frontend runs. Email/password login works. Google OAuth work.

**Why this matters:** Supabase's `@supabase/ssr` package handles cookie-based sessions correctly for Next.js App Router. Getting this right on Day 15 means auth just works everywhere — server components, client components, and middleware.

**Steps:**

1. Create the app:
   ```bash
   cd ../frontend
   npx create-next-app@latest . --typescript --tailwind --app --eslint
   ```
2. Install dependencies:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr axios
   ```
3. Set up shadcn/ui:
   ```bash
   npx shadcn@latest init
   npx shadcn@latest add button input card badge toast skeleton dialog separator
   ```
4. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
5. Create `lib/supabase/client.ts` — browser client:
   ```typescript
   import { createBrowserClient } from '@supabase/ssr'
   export const createClient = () =>
     createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     )
   ```
6. Create `lib/supabase/server.ts` — server-side client using cookies (for Server Components and middleware)
7. Create `lib/api.ts` — Axios instance that attaches the Supabase JWT to every request:
   ```typescript
   api.interceptors.request.use(async (config) => {
     const supabase = createClient()
     const { data: { session } } = await supabase.auth.getSession()
     if (session) config.headers.Authorization = `Bearer ${session.access_token}`
     return config
   })
   ```
8. Create `app/(auth)/login/page.tsx` — email/password form + OAuth buttons:
   ```typescript
   // Email/password
   await supabase.auth.signInWithPassword({ email, password })

   // Google OAuth
   await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${window.location.origin}/auth/callback` }
   })
   ```
9. Create `app/(auth)/signup/page.tsx` — same layout, calls `supabase.auth.signUp()`
10. Create `app/auth/callback/route.ts` — the OAuth redirect handler:
    ```typescript
    import { createServerClient } from '@supabase/ssr'
    import { NextResponse } from 'next/server'
    import type { NextRequest } from 'next/server'

    export async function GET(request: NextRequest) {
      const { searchParams, origin } = new URL(request.url)
      const code = searchParams.get('code')

      if (code) {
        const supabase = createServerClient(...)
        await supabase.auth.exchangeCodeForSession(code)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
    ```
    > This is the page Google redirects to after the user approves login. It exchanges the code for a session and sends the user to the dashboard.
11. Create `middleware.ts` — protects all routes under `/dashboard` and `/sessions`:
    ```typescript
    // Redirect to /login if no valid session
    // Redirect to /dashboard if logged in and on /
    ```
12. Add your Vercel preview URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

✅ **Done when:** Email login works. Clicking "Login with Google" opens Google's consent screen and lands you on the dashboard.

---

#### ✅ Day 16 — Dashboard Page & Session Creation

**Goal:** Users see their sessions and can start new research.

**Steps:**

1. Create `app/dashboard/page.tsx`:
   - Fetch sessions from `GET /sessions`
   - Display as a grid of cards: topic, colour-coded status badge, date created
   - Status colours: pending/any-in-progress = blue, completed = green, failed = red
   - Empty state: *"No research yet. Start your first topic."*
2. Add a **New Research** button → opens a shadcn `Dialog` with a topic text input
3. On submit: `POST /sessions` → `POST /sessions/{id}/run` → navigate to `/sessions/[id]`
4. Add a header with user's email/avatar (from `supabase.auth.getUser()`) and a logout button:
   ```typescript
   await supabase.auth.signOut()
   router.push('/login')
   ```
5. Create `types/index.ts` — TypeScript interfaces for `Session`, `Question`, `Source`, `ChatMessage`

✅ **Done when:** You can create a new session from the dashboard and be redirected to the session page.

---

#### ✅ Day 17 — Session Page & Live Progress Stepper

**Goal:** The stepper lights up in real time as the workflow runs — no refresh needed.

**Steps:**

1. Create `app/sessions/[id]/page.tsx`
2. Create `components/ProgressStepper.tsx`:
   ```typescript
   const STEPS = [
     { key: "pending", label: "Waiting" },
     { key: "planning", label: "Generating Research Questions" },
     { key: "searching", label: "Searching the Web" },
     { key: "evaluating_sources", label: "Evaluating Sources" },
     { key: "extracting", label: "Reading Webpages" },
     { key: "summarizing", label: "Summarising Sources" },
     { key: "checking_sufficiency", label: "Checking Coverage" },
     { key: "embedding", label: "Building Knowledge Base" },
     { key: "generating_report", label: "Writing Report" },
     { key: "completed", label: "Done" },
   ]
   // Past steps: green checkmark ✓
   // Current step: animated spinner
   // Future steps: gray circle
   ```
3. Set up Supabase Realtime subscription:
   ```typescript
   useEffect(() => {
     const supabase = createClient()
     const channel = supabase
       .channel('session')
       .on('postgres_changes',
           { event: 'UPDATE', table: 'research_sessions', filter: `id=eq.${id}` },
           (payload) => {
             setCurrentStep(payload.new.current_step)
             setStatus(payload.new.status)
             if (['completed', 'failed'].includes(payload.new.status)) {
               channel.unsubscribe()
             }
           })
       .subscribe()
     return () => { channel.unsubscribe() }
   }, [id])
   ```
4. On page load: fetch the session — if already `completed`, show the report directly without waiting
5. If `status === "failed"`: show a red error box with `error_message`

✅ **Done when:** The stepper animates step-by-step in real time. Opening a completed session shows the report immediately.

---

#### ✅ Day 18 — Research Output: Questions, Sources & Report

**Goal:** The full research output is visible and beautifully rendered.

**Steps:**

1. Add a **Research Questions** section after the stepper:
   - Fetch from `GET /sessions/{id}/questions` when status becomes `completed`
   - Render as a numbered list in a light card with a subtle border
2. Add **Source Cards**:
   - Fetch from `GET /sessions/{id}/sources`
   - Each card: title, clickable URL link, three score badges
   - Badge colours: 1–2 = red, 3 = yellow, 4–5 = green
3. Add the **Markdown Report**:
   ```bash
   npm install react-markdown remark-gfm @tailwindcss/typography
   ```
   ```typescript
   <ReactMarkdown
     remarkPlugins={[remarkGfm]}
     className="prose prose-invert max-w-none"
   >
     {session.report_markdown}
   </ReactMarkdown>
   ```
   Add `@tailwindcss/typography` plugin to `tailwind.config.ts`
4. Layout: two-column grid on desktop (stepper left, content right). Single column stack on mobile.

✅ **Done when:** After completion, you see research questions, source cards with colour-coded scores, and a beautifully rendered markdown report.

---

#### ✅ Day 19 — Chat Interface

**Goal:** Users can ask questions in a real chat UI and get grounded answers.

**Steps:**

1. Create `components/ChatInterface.tsx`:
   - Scrollable message list at the top
   - Text input + Send button at the bottom
   - User messages: right-aligned, blue bubble
   - Assistant messages: left-aligned, gray bubble
2. On page load: `GET /sessions/{id}/messages` → populate message history
3. On send: `POST /sessions/{id}/chat` → append response to list
4. Show a typing indicator (three animated dots) while waiting for the response
5. Disable input while loading to prevent duplicate sends
6. Auto-scroll to bottom when new messages arrive
7. Only show the chat interface once `status === "completed"` — it requires embeddings to exist
8. Placeholder if no chat yet: *"The report is ready. Ask anything about this research."*

✅ **Done when:** You can ask a question, see the typing indicator, and receive a grounded answer. Chat history persists on page reload.

---

#### ✅ Day 20 — Polish, Loading States & Empty States

**Goal:** The app feels complete and professional on all screen sizes.

**Steps:**

1. Add loading skeletons (shadcn `Skeleton`) while sessions and messages are loading
2. Add toast notifications:
   - "Research started!" when session is created
   - "Research failed — please try again" when status becomes `failed`
3. Add CSS transitions to the progress stepper (each step change should be smooth)
4. Add a **Copy Report** button that copies the markdown to clipboard:
   ```typescript
   navigator.clipboard.writeText(session.report_markdown)
   ```
5. Test the full flow 3 times with different topics — fix any crashes
6. Test on mobile (Chrome DevTools → device emulation) — fix layout issues
7. Verify that failed sessions show the `error_message`, not just "failed"
8. Add a user avatar in the header showing the first letter of their email (or their OAuth profile picture if available via `user.user_metadata.avatar_url`)

✅ **Done when:** Full flow works 3 times end-to-end without crashes. App looks polished on desktop and mobile.

---

#### ✅ Day 21 — Deployment, README & Demo Prep

**Goal:** Project is live. GitHub is clean. You can demo it confidently.

**Deploy Backend to Render:**
1. Push `backend/` to a GitHub repo
2. Create a new **Web Service** on Render, connect the repo
3. Build command: `uv sync`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all `.env` variables in Render's Environment settings
6. Update CORS in `main.py`: add your Vercel URL to `allow_origins`

**Deploy Frontend to Vercel:**
1. Push `frontend/` to GitHub, import the repo in Vercel
2. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (your Render URL)

**Update OAuth redirect URLs:**
- In Supabase Dashboard → Authentication → URL Configuration → add your Vercel URL to the redirect allow list
- In Google Cloud Console → update your OAuth app's Authorized redirect URIs to include `https://[ref].supabase.co/auth/v1/callback` (this should already be set from Day 3)
- In GitHub OAuth App settings → update Homepage URL to your Vercel URL

**Write your README.md:**
```markdown
# Verity — AI Research Assistant

[Live Demo](https://your-verity.vercel.app)

Type a topic. Verity searches the web, evaluates sources, writes a full
research report, and lets you chat with it — powered by an 8-step agentic workflow.

## Tech Stack
- Backend: Python 3.12, FastAPI, LangGraph, gemini-2.5-flash, gemini-embedding-001, pgvector
- Frontend: Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui
- Infrastructure: Supabase (Auth + OAuth + Realtime + pgvector), Vercel, Render

## Architecture
[text art workflow diagram]

## Local Setup
[step-by-step instructions]
```

**Practise your 3-minute demo:**
1. Open the Vercel URL → click "Login with Google" → show it works in one click
2. Create new research: type *"Quantum Computing in Cryptography"*
3. Watch the progress stepper animate through each step live
4. Show the three research questions that appeared
5. Show the 5 source cards with their scores
6. Show the full rendered markdown report
7. Type a question in the chat → show the grounded answer
8. Open LangSmith → show every LLM call, inputs, outputs, and token counts

✅ **Done when:** Project is live at a public URL. Both OAuth providers work. README is impressive. You can demo without notes.

---

## Environment Variables

**`backend/.env`** — never commit this file

```bash
# Supabase
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # backend ONLY — never expose

DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:6543/postgres

# AI — one key for both LLM and embeddings
GOOGLE_API_KEY=your_key_from_aistudio.google.com

TAVILY_API_KEY=your_key_from_tavily.com

# LangSmith
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_key_from_smith.langchain.com
LANGCHAIN_PROJECT=verity
```

**`frontend/.env.local`** — these are public, safe to expose

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000  # Change to Render URL after deployment
```

---

## Common Mistakes to Avoid

| Mistake | What to Do Instead |
|---------|-------------------|
| Putting logic inside route files | Routes handle HTTP only. All business logic lives in service files. |
| Awaiting the workflow inside the HTTP request | Always `asyncio.create_task()` — return immediately, run in background. |
| Starting the frontend before the backend works | Backend first, always. Test every endpoint in Postman before touching Next.js. |
| Using `text-embedding-004` | It was shut down January 2026. Use `gemini-embedding-001`. |
| Using `gemini-2.0-flash` | Deprecated, shuts down June 1, 2026. Use `gemini-2.5-flash`. |
| Using the old `langchain-google-genai` package | Use the official `google-genai` SDK instead. |
| Letting a workflow crash silently | Catch ALL exceptions at the workflow level. Always set `status = "failed"` and save `error_message`. |
| Skipping LangSmith | 3 minutes to set up. Opening it in an interview makes everything 10× more impressive. |
| Forgetting to enable the pgvector extension | Run `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase SQL Editor on Day 2. |
| Committing `.env` to GitHub | `.env` must be in `.gitignore`. Provide `.env.example` with placeholder values. |
| Not adding the Vercel URL to Supabase redirect allow list | OAuth logins will break in production. Do this on Day 21. |
| Using the wrong embedding dimensions | Use `output_dimensionality=768` consistently for both storing and querying — if you change this, you must re-embed everything. |
| Letting the sufficiency checker loop forever | Hard limit: `if retry_count >= 1`, always continue to embedding regardless. |

---

## What "Done" Looks Like

When Verity V1 is complete, here's your interview demo:

| Step | What You Show |
|------|--------------|
| 1. OAuth login | Open the Vercel URL. Click "Login with Google". One click, you're in. |
| 2. New research | Click "New Research". Type *"Quantum Computing in Cryptography"*. Submit. |
| 3. Live stepper | Progress stepper lights up step-by-step in real time via Supabase Realtime. |
| 4. Research questions | Three focused questions appear after the planning step. |
| 5. Source cards | 5 scored source cards with relevance, credibility, and usefulness badges. |
| 6. Markdown report | Full structured report renders with headings and conclusion. |
| 7. RAG chat | Type *"What are the main risks?"* — grounded answer from your research. |
| 8. LangSmith | Open smith.langchain.com — every LLM call, inputs, outputs, token counts. |

That is a complete, explainable, technically impressive, production-pattern AI project. Build in order. Ship each day before starting the next. Verity is impressive because it is complete.
