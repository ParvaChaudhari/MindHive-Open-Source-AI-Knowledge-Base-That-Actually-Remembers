# MindHive — AI-Powered Knowledge Base

> Upload PDFs, YouTube videos, and web pages — then chat with your documents using Gemini AI.

MindHive is a full-stack RAG (Retrieval-Augmented Generation) application that lets you build a personal knowledge base from any content source. Chunk it, embed it, and query it with natural language through a clean, modern interface.

---

## Features

- **PDF ingestion** — Upload PDFs, extract text, chunk and embed automatically
- **YouTube ingestion** — Paste a YouTube URL and ingest the transcript
- **Web page ingestion** — Scrape any URL and add it to your knowledge base
- **Single-document chat** — Ask questions about a specific document with page-level citations
- **Collections** — Group documents and query across all of them simultaneously
- **Cross-document RAG** — Powered by pgvector similarity search + Gemini AI
- **Document summaries** — Auto-generated TL;DRs for any document or collection
- **Flashcard generation** — Generate Q&A study cards from any document
- **Rename & manage** — Rename documents and manage collection membership
- **Auth & RLS** — Supabase Auth with strict PostgreSQL Row Level Security
- **Export** — Download chat conversations as Markdown
- **Queen Bee Agent** — Persistent AI assistant managing collections and learning history (Powered by Llama 3.3 Nemotron)

---

## Security & Production Hardening

Built with production readiness in mind, showcasing robust security practices:
- **Data Isolation:** Strict PostgreSQL Row Level Security (RLS) policies ensure users can only access and modify their own documents and collections.
- **XSS Protection:** Frontend sanitization using `rehype-sanitize` prevents Markdown-based Cross-Site Scripting attacks.
- **Rate Limiting:** In-memory sliding window rate limiter protects AI endpoints from abuse and quota exhaustion.
- **SSRF Prevention:** Strict URL validation and local IP blocking for the web ingestion pipeline.
- **Payload Validation:** Enforced file size limits, PDF magic-byte verification, and strict Pydantic models for request bodies.
- **Log Sanitization:** Automated redaction of sensitive environment variables (API keys, DB credentials) from backend server logs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, TailwindCSS v4, React Query, React Router |
| **Backend** | FastAPI, Uvicorn, Python 3.11+ |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Storage** | Supabase Storage (PDFs) |
| **AI** | Google Gemini API (`gemini-2.5-flash`, `text-embedding-004`), NVIDIA NIM (`llama-3.3-nemotron-super-49b-v1.5`) |
| **Auth** | Supabase Auth + JWT |

---

## Project Structure

```
MindHive/
├── backend/                  # FastAPI application
│   ├── main.py               # App entry point, route registration
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Environment variable template
│   ├── routes/
│   │   ├── document_routes.py   # Upload, list, delete, rename, YouTube, web
│   │   ├── collection_routes.py # CRUD, manage docs, cross-doc query & summary
│   │   └── query_routes.py      # Single-document Q&A + summarization
│   └── services/
│       ├── supabase_service.py  # All database & storage operations
│       ├── embedding_service.py # Gemini text-embedding-004 with batching
│       ├── generation_service.py# Gemini answer, summary, flashcard generation
│       ├── pdf_service.py       # PyMuPDF extraction + LangChain chunking
│       ├── scraper_service.py   # YouTube transcript + web page scraping
│       ├── auth_service.py      # JWT validation via Supabase
│       ├── agent_service.py     # Queen Bee autonomous agent logic
│       ├── security_utils.py    # Log sanitization and rate limiting
│       └── upstream_errors.py   # Typed upstream error classes
│
├── frontend/                 # React + Vite application
│   ├── index.html
│   ├── package.json
│   ├── .env.example          # Environment variable template
│   └── src/
│       ├── api.js            # All fetch helpers (typed, auth-aware)
│       ├── supabaseClient.js # Supabase JS client initialisation
│       ├── App.jsx           # Router + layout
│       ├── pages/
│       │   ├── DashboardPage.jsx
│       │   ├── DocumentsPage.jsx
│       │   ├── CollectionsPage.jsx
│       │   ├── ChatPage.jsx
│       │   ├── UploadPage.jsx
│       │   ├── LoginPage.jsx
│       │   └── SignupPage.jsx
│       └── components/
│           ├── Sidebar.jsx
│           ├── UploadWidget.jsx
│           ├── FlashcardsModal.jsx
│           ├── ProfileDropdown.jsx
│           └── QueenBee.jsx      # Agent floating widget
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project with:
  - `pgvector` extension enabled
  - `documents`, `chunks`, and `collections` tables (see schema below)
  - A `pdfs` storage bucket
  - Auth enabled
- A [Google Gemini API key](https://aistudio.google.com/)

---

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Copy env template and fill in your values
copy .env.example .env
# Then edit backend/.env with your keys

# Start the API server
python main.py
# Runs on http://localhost:8000
```

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env template and fill in your values
copy .env.example .env
# Then edit frontend/.env with your Supabase public keys

# Start the dev server
npm run dev
# Runs on http://localhost:5173
```

---

### 3. Environment Variables

#### `backend/.env`

| Variable | Description | Where to find |
|---|---|---|
| `SUPABASE_URL` | Your Supabase project URL | Project Settings → API |
| `SUPABASE_SERVICE_KEY` | Service role key (secret!) | Project Settings → API |
| `GEMINI_API_KEY` | Google Gemini API key | [aistudio.google.com](https://aistudio.google.com) |
| `NVIDIA_API_KEY` | NVIDIA NIM API key (for Agent) | build.nvidia.com |

#### `frontend/.env`

| Variable | Description | Where to find |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe to expose) | Project Settings → API |

---

### 4. Database Schema

Run this SQL in your Supabase SQL editor:

```sql
-- Enable pgvector
create extension if not exists vector;

-- Collections table (must exist before documents due to FK)
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

-- pgvector similarity search function (single document)
create or replace function match_chunks(
  query_embedding vector(768),
  match_doc_id uuid,
  match_count int default 5
)
returns table (
  id uuid, doc_id uuid, content text, page_number int, similarity float
)
language sql stable
as $$
  select id, doc_id, content, page_number,
         1 - (embedding <=> query_embedding) as similarity
  from chunks
  where doc_id = match_doc_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- pgvector similarity search function (cross-collection)
create or replace function match_chunks_in_collection(
  query_embedding vector(768),
  match_collection_id uuid,
  match_count int default 10
)
returns table (
  id uuid, doc_id uuid, doc_name text, content text, page_number int, similarity float
)
language sql stable
as $$
  select c.id, c.doc_id, d.name as doc_name, c.content, c.page_number,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.doc_id
  where d.collection_id = match_collection_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/documents/upload` | Upload and process a PDF |
| `POST` | `/documents/youtube` | Ingest a YouTube video transcript |
| `POST` | `/documents/web` | Ingest a web page |
| `GET` | `/documents/` | List all documents for current user |
| `GET` | `/documents/:id` | Get a single document |
| `PATCH` | `/documents/:id` | Rename a document |
| `DELETE` | `/documents/:id` | Delete a document and its embeddings |
| `POST` | `/documents/:id/query` | Ask a question about a document |
| `GET` | `/documents/:id/summary` | Get an AI summary |
| `GET` | `/documents/:id/flashcards` | Generate flashcards |
| `POST` | `/collections/` | Create a collection |
| `GET` | `/collections/` | List collections |
| `GET` | `/collections/:id` | Get collection + its documents |
| `DELETE` | `/collections/:id` | Delete a collection |
| `POST` | `/collections/:id/documents` | Add a document to a collection |
| `DELETE` | `/collections/:id/documents/:doc_id` | Remove a document from a collection |
| `POST` | `/collections/:id/query` | Cross-document RAG query |
| `GET` | `/collections/:id/summary` | AI summary across all docs in collection |
| `POST` | `/agent/chat` | Interact with Queen Bee autonomous agent |

---


## License

MIT — feel free to fork and build on it.
