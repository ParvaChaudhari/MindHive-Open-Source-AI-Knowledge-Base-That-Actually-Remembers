# MindHive — Project Roadmap

> AI-powered knowledge base — upload PDFs, chat with your documents, get instant summaries.

**Stack:** FastAPI · Supabase (Postgres + pgvector + Storage) · Gemini API · React/Next.js · GCP Cloud Run

---

## Phase 1 — Project Setup & Infrastructure

Get the foundation in place before writing any feature code.

### Tasks
- [ ] Create a new Supabase project
- [ ] Enable the `pgvector` extension in Supabase SQL editor
  ```sql
  create extension if not exists vector;
  ```
- [ ] Create the following tables in Supabase:
  - `documents` — stores file metadata (id, name, file_url, created_at, user_id)
  - `chunks` — stores text chunks + embeddings (id, doc_id, content, embedding vector(768), page_number)
  - `collections` — groups of documents (id, name, user_id)
- [ ] Set up Supabase Storage bucket called `pdfs` (public or private)
- [ ] Create a new FastAPI project locally
  ```
  mindhive/
  ├── main.py
  ├── routes/
  ├── services/
  ├── models/
  └── requirements.txt
  ```
- [ ] Install core dependencies
  ```
  fastapi uvicorn supabase pymupdf google-generativeai python-dotenv langchain-text-splitters
  ```
- [ ] Set up `.env` file with keys:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `GEMINI_API_KEY`
- [ ] Test Supabase connection from FastAPI
- [ ] Set up a basic React or Next.js frontend project

---

## Phase 2 — PDF Ingestion Pipeline

This is the core of MindHive. A PDF goes in, gets processed, and is stored ready for querying.

### Tasks
- [ ] Build a `/upload` endpoint in FastAPI that accepts a PDF file
- [ ] Upload the raw PDF to Supabase Storage and get back a public URL
- [ ] Save document metadata to the `documents` table
- [ ] Extract text from the PDF using PyMuPDF
  ```python
  import fitz  # PyMuPDF
  doc = fitz.open(stream=file_bytes, filetype="pdf")
  text = ""
  for page in doc:
      text += page.get_text()
  ```
- [ ] Split extracted text into chunks (500 words, 50 word overlap) using LangChain text splitter
  ```python
  from langchain_text_splitters import RecursiveCharacterTextSplitter
  splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
  chunks = splitter.split_text(text)
  ```
- [ ] For each chunk, generate an embedding using Gemini `text-embedding-004`
  ```python
  import google.generativeai as genai
  result = genai.embed_content(
      model="models/text-embedding-004",
      content=chunk,
      task_type="retrieval_document"
  )
  embedding = result['embedding']
  ```
- [ ] Store each chunk + its embedding in the `chunks` table in Supabase
- [ ] Add a processing status field to `documents` (`pending` → `processing` → `ready`)
- [ ] Test the full pipeline end to end with a sample PDF
- [ ] Handle edge cases — password protected PDFs, scanned-only PDFs, empty pages

---

## Phase 3 — Query & Answer Pipeline (RAG)

User asks a question, system finds relevant chunks, Gemini answers based on them.

### Tasks
- [ ] Build a `/query` endpoint that accepts `{ doc_id, question }`
- [ ] Convert the user's question into an embedding using Gemini `text-embedding-004`
  ```python
  result = genai.embed_content(
      model="models/text-embedding-004",
      content=question,
      task_type="retrieval_query"
  )
  query_embedding = result['embedding']
  ```
- [ ] Run a similarity search in pgvector to find the top 5 most relevant chunks
  ```sql
  SELECT content, 1 - (embedding <=> '[query_vector]') AS similarity
  FROM chunks
  WHERE doc_id = :doc_id
  ORDER BY similarity DESC
  LIMIT 5;
  ```
- [ ] Assemble the top chunks into a context block
- [ ] Send context + question to Gemini 1.5 Flash and get an answer
  ```python
  model = genai.GenerativeModel("gemini-1.5-flash")
  prompt = f"""
  Answer the question based only on the context below.
  Context: {context}
  Question: {question}
  """
  response = model.generate_content(prompt)
  ```
- [ ] Return the answer + which chunks were used (for citations)
- [ ] Build a `/summarize` endpoint — same flow but with a fixed summarization prompt
- [ ] Test with real documents and verify answers are grounded in the PDF content

---

## Phase 4 — Collections & Cross-Document Querying

Group documents into collections and query across all of them at once. This is the feature that makes MindHive stand out.

### Tasks
- [ ] Build CRUD endpoints for collections (`/collections` — create, list, delete)
- [ ] Add `collection_id` field to the `documents` table
- [ ] Build a `/collections/:id/query` endpoint
- [ ] Modify the similarity search to query across all docs in a collection (remove `doc_id` filter)
  ```sql
  SELECT content, doc_id, 1 - (embedding <=> '[query_vector]') AS similarity
  FROM chunks
  WHERE doc_id IN (
      SELECT id FROM documents WHERE collection_id = :collection_id
  )
  ORDER BY similarity DESC
  LIMIT 10;
  ```
- [ ] Return answers with source attribution — which document each chunk came from
- [ ] Test cross-document query: e.g. "compare what these 3 papers say about X"

---

## Phase 5 — Frontend UI

Connect everything to a usable interface.

### Tasks
- [ ] Build an upload page — drag and drop PDF upload, shows processing status
- [ ] Build a document list page — shows all uploaded docs with status badges
- [ ] Build a chat interface for single document Q&A
  - Text input for question
  - Answer displayed with citations (which page/chunk it came from)
- [ ] Build a collections view — group docs, query across a collection
- [ ] Add a summary panel — auto-generated TL;DR shown after upload completes
- [ ] Add loading states and error handling throughout
- [ ] Make it mobile-friendly

---

## Phase 6 — Extra Features (Post-MVP)

Nice-to-haves once the core is solid.

### Tasks
- [ ] **Flashcard generation** — from any doc, auto-generate Q&A pairs for studying
- [ ] **Annotations** — highlight text in PDF viewer, highlights become searchable notes
- [ ] **YouTube ingestion** — paste a YT URL, fetch transcript, run through same RAG pipeline
- [ ] **Web URL ingestion** — scrape a URL, chunk and embed the content
- [ ] **Daily digest** — scheduled job that summarizes new docs added to a collection
- [ ] **Export** — download answers/summaries as Markdown or Notion-formatted text
- [ ] **Auth** — add Supabase Auth so multiple users can have their own document libraries
- [ ] **Row Level Security** — add RLS policies in Supabase so users only see their own docs

---

## Personal Observations

PENDING:


DONE:
in collection you can now remove a doc (fixed broken backend endpoint and added UI actions)

An exception to work on:
The embedding API can only take 100 chunks as input and a document might be split into more than 100 chunks we have to make sure that we are able to handle that scenario.

When i upload or injest something and click on start chatting it opens the chat tab thats as expected but it takes some time to load the document so maybe we should show a blank chat with a loading state till the document is loaded?

The yt url show the YouTube Video (vKeCr-MAyH4)
can we show the video name instead of this? show Youtube video (video title)

give ability to rename the documents?

## Quick Reference — API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload and process a PDF |
| GET | `/documents` | List all documents |
| GET | `/documents/:id` | Get a single document |
| DELETE | `/documents/:id` | Delete a document |
| POST | `/documents/:id/query` | Ask a question about a doc |
| GET | `/documents/:id/summary` | Get auto-summary |
| POST | `/collections` | Create a collection |
| GET | `/collections` | List collections |
| POST | `/collections/:id/query` | Query across a collection |

---

## Quick Reference — DB Schema

```sql
-- Enable pgvector
create extension if not exists vector;

-- Documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_url text,
  status text default 'pending',
  collection_id uuid references collections(id),
  user_id uuid,
  created_at timestamptz default now()
);

-- Chunks table
create table chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references documents(id) on delete cascade,
  content text not null,
  embedding vector(768),
  page_number int,
  created_at timestamptz default now()
);

-- Collections table
create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid,
  created_at timestamptz default now()
);
```

---

*Start with Phase 1 → Phase 2 → Phase 3. That's your MVP. Everything else is layered on top.*

