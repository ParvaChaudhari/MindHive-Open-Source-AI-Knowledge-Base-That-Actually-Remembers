# MindHive — AI Knowledge Base That Actually Remembers

> Upload PDFs, YouTube videos, and web pages. Ask questions. Get answers with citations. And now — query your entire knowledge base directly from Claude Desktop via MCP.

**[🚀 Live Demo → mindhive-ai.vercel.app](https://mindhive-ai.vercel.app/)**

![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=flat&logo=google&logoColor=white)

---

## What is MindHive?

MindHive is a full-stack **RAG (Retrieval-Augmented Generation)** application that turns any content — PDFs, YouTube videos, web articles — into a searchable, queryable knowledge base.

Unlike a simple chatbot, MindHive remembers *your* documents. Every answer is grounded in your actual uploaded content, with page-level citations so you always know where the information came from. Collections let you group related documents and query across all of them at once.

The backend is live on GCP — you can sign up and start using it immediately at the link above.

---

## Features

- **Multi-source ingestion** — Upload PDFs, paste a YouTube URL, or scrape any web page
- **Single-document Q&A** — Ask questions about a specific document with page-level citations
- **Collections** — Group documents and run cross-document RAG queries across an entire collection
- **AI Summaries** — Auto-generated TL;DRs for any document or collection
- **Flashcard generation** — Generate Q&A study cards from any document in one click
- **Queen Bee Agent** — A persistent AI assistant that manages your knowledge base, remembers your collections, and learns your research history (powered by Gemini)
- **Claude MCP Integration** — Query your MindHive knowledge base directly from Claude Desktop
- **Export** — Download any chat conversation as Markdown
- **Full auth + data isolation** — Supabase Auth with PostgreSQL Row Level Security keeps every user's data completely separate

---

## Claude MCP Integration

MindHive ships with a **Model Context Protocol (MCP) server** that lets you query your knowledge base directly from Claude Desktop — no browser required.

Once configured, Claude can:
- `list_collections` — see all your collections
- `list_documents` — browse all your documents
- `get_collection_details` — get documents inside a collection
- `get_document_summary` — fetch AI-generated summaries
- `query_document` — ask RAG questions about a specific document
- `query_collection` — ask RAG questions across all documents in a collection

**To set it up**, open the live app, click **Claude MCP Integration** in the sidebar, and follow the 3-step guide. Your bearer token is injected automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, TailwindCSS v4, React Query, react-virtual |
| **Backend** | FastAPI, Uvicorn, Python 3.11+ |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Caching / Rate Limiting** | Redis + fastapi-limiter |
| **Storage** | Supabase Storage (PDFs) |
| **AI — Embeddings** | Google Gemini (`text-embedding-004`) |
| **AI — Chat & Flashcards** | NVIDIA NIM (Llama 3.2 3B, Llama 3.1 8B) |
| **AI — Agent** | Google Gemini (`gemini-3.1-pro-preview`) |
| **Auth** | Supabase Auth + JWT |
| **DevOps** | Docker, Docker Compose |

---

## Security & Production Hardening

- **Distributed Rate Limiting** — Redis + `fastapi-limiter` enforces global rate limits across server instances
- **SSRF Prevention** — Strict URL validation and local IP blocking on the web ingestion pipeline
- **Payload Validation** — File size limits, PDF magic-byte verification, and strict Pydantic models
- **Global Exception Handling** — Centralized middleware ensures consistent, safe JSON error responses
- **Log Sanitization** — Automatic redaction of API keys and DB credentials from server logs
- **Row Level Security** — PostgreSQL RLS ensures users can only ever access their own data

---

## Performance

- **Chat List Virtualization** — `@tanstack/react-virtual` keeps even thousand-message conversations lag-free
- **Skeleton Loaders** — Content-aware loading placeholders instead of spinners
- **Modular Architecture** — Single-responsibility components and feature modules for fast builds

---

## Project Structure

```
MindHive/
├── backend/                     # FastAPI application
│   ├── main.py                  # App entry point, route registration
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── document_routes.py   # Upload, list, delete, rename, YouTube, web
│   │   ├── collection_routes.py # CRUD, manage docs, cross-doc query & summary
│   │   └── query_routes.py      # Single-document Q&A + summarization
│   └── services/
│       ├── supabase_service.py  # All database & storage operations
│       ├── embedding_service.py # Gemini embeddings with batching
│       ├── generation_service.py# Answer, summary, flashcard generation
│       ├── pdf_service.py       # PyMuPDF extraction + LangChain chunking
│       ├── scraper_service.py   # YouTube transcript + web scraping
│       ├── auth_service.py      # JWT validation via Supabase
│       ├── agent_service.py     # Queen Bee agent logic
│       └── security_utils.py   # Log sanitization, rate limiting helpers
│
├── frontend/                    # React + Vite application
│   └── src/
│       ├── api.js               # Typed, auth-aware fetch helpers
│       ├── App.jsx              # Router + layout
│       ├── pages/               # One file per route
│       └── components/          # Sidebar, modals, QueenBee widget, etc.
│
└── mcp-server/                  # MCP server (Claude Desktop bridge)
    ├── main.py
    └── requirements.txt
```

---

## Getting Started (Self-Hosting)

The backend is already live — you don't need to host anything to use MindHive. But if you want to run your own instance:

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project with `pgvector` enabled (see schema below)
- A [Google Gemini API key](https://aistudio.google.com/)
- An [NVIDIA NIM API key](https://build.nvidia.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)

---

### Quickstart with Docker

```bash
# Clone the repo
git clone https://github.com/ParvaChaudhari/MindHive-Open-Source-AI-Knowledge-Base-That-Actually-Remembers
cd MindHive-Open-Source-AI-Knowledge-Base-That-Actually-Remembers

# Fill in your keys
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files with your credentials

# Launch everything
docker-compose up --build
```

Frontend → `http://localhost:5174` · Backend → `http://localhost:8000`

---

### Manual Setup

**Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
cp .env.example .env         # Fill in your keys
python main.py
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env         # Fill in your Supabase public keys
npm run dev
```

---

### Environment Variables

#### `backend/.env`

| Variable | Description | Where to find |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Service role key (**keep secret**) | Project Settings → API |
| `GEMINI_API_KEY` | For embeddings + Queen Bee agent | [aistudio.google.com](https://aistudio.google.com) |
| `NVIDIA_API_KEY` | For chat + flashcard models | [build.nvidia.com](https://build.nvidia.com) |
| `GEMINI_MODEL` | Agent model name | `gemini-3.1-pro-preview` |
| `NVIDIA_MODEL_CHAT` | Fast chat model | `meta/llama-3.2-3b-instruct` |
| `NVIDIA_MODEL_FLASHCARD` | Flashcard generation model | `meta/llama-3.1-8b-instruct` |

#### `frontend/.env`

| Variable | Description | Where to find |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe to expose) | Project Settings → API |

---

### Database Schema

<details>
<summary>Click to expand SQL setup</summary>

Run this in your Supabase SQL editor:

```sql
-- Enable pgvector
create extension if not exists vector;

-- Collections table
create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_url text,
  status text default 'pending',
  collection_id uuid references collections(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Chunks table (embeddings live here)
create table chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references documents(id) on delete cascade,
  content text not null,
  embedding vector(768),
  page_number int,
  created_at timestamptz default now()
);

-- Similarity search (single document)
create or replace function match_chunks(
  query_embedding vector(768),
  match_doc_id uuid,
  match_count int default 5
)
returns table (id uuid, doc_id uuid, content text, page_number int, similarity float)
language sql stable as $$
  select id, doc_id, content, page_number,
         1 - (embedding <=> query_embedding) as similarity
  from chunks
  where doc_id = match_doc_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Similarity search (cross-collection)
create or replace function match_chunks_in_collection(
  query_embedding vector(768),
  match_collection_id uuid,
  match_count int default 10
)
returns table (id uuid, doc_id uuid, doc_name text, content text, page_number int, similarity float)
language sql stable as $$
  select c.id, c.doc_id, d.name as doc_name, c.content, c.page_number,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.doc_id
  where d.collection_id = match_collection_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

</details>

---

## License

MIT — free to fork, extend, and build on.
