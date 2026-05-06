from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from typing import Optional
from services.pdf_service import PDFService
from services.supabase_service import SupabaseService
from services.embedding_service import EmbeddingService
from services.scraper_service import ScraperService
from services.generation_service import GenerationService
from services.upstream_errors import UpstreamServiceUnavailable, UpstreamDailyQuotaReached
from services.auth_service import get_current_user
from services.security_utils import is_safe_url
from exceptions import AIServiceError, DatabaseError, MindHiveException, DocumentProcessingError
from cachetools import TTLCache
from pydantic import BaseModel
from fastapi import Depends
import time
import asyncio
import hashlib

router = APIRouter(prefix="/documents", tags=["documents"])

pdf_service = PDFService()
embedding_service = EmbeddingService()
scraper_service = ScraperService()
generation_service = GenerationService()

# Dependency to get an authenticated Supabase service
async def get_supabase(auth=Depends(get_current_user)):
    user, token = auth
    return SupabaseService(token=token)

# Global service for background tasks (uses service key)
admin_supabase = SupabaseService()

class ExternalUrlRequest(BaseModel):
    url: str
    collection_id: Optional[str] = None

class RenameDocumentRequest(BaseModel):
    name: str

_RATE_LIMIT_LOCK = asyncio.Lock()
# Simple cooldown to prevent spam-clicking ingestion endpoints.
INGEST_COOLDOWN_SECONDS = 8.0

# TTLCache ensures memory is bounded and entries expire automatically.
_LAST_INGEST_BY_USER = TTLCache(maxsize=1000, ttl=INGEST_COOLDOWN_SECONDS * 2)

async def _enforce_ingest_cooldown(user_id: str):
    now = time.time()
    async with _RATE_LIMIT_LOCK:
        last = _LAST_INGEST_BY_USER.get(user_id)
        if last and (now - last) < INGEST_COOLDOWN_SECONDS:
            retry_after = max(1, int(INGEST_COOLDOWN_SECONDS - (now - last)))
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Please wait {retry_after}s and try again."
            )
        _LAST_INGEST_BY_USER[user_id] = now

def _validate_non_empty(value: str, label: str):
    if value is None or not str(value).strip():
        raise ValueError(f"{label} is empty.")

def _validate_chunks(chunks, label: str = "Chunks"):
    if not chunks:
        raise ValueError(f"{label} are empty.")
    # Ensure each chunk has usable content
    bad = [c for c in chunks if not (c.get("content") or "").strip()]
    if bad:
        raise ValueError(f"{label} contain empty content.")

def _validate_embeddings(embeddings, expected_count: int):
    if embeddings is None:
        raise ValueError("Embeddings are missing.")
    if len(embeddings) != expected_count:
        raise ValueError(f"Embeddings count mismatch: expected {expected_count}, got {len(embeddings)}.")

async def process_pdf_task(doc_id: str, file_bytes: bytes):
    """Background task to process PDF: extract, chunk, embed, store, then cache summary."""
    final_status = "error"
    try:
        # 1. Extract text
        print(f"[{doc_id}] Step 1: Extracting text from PDF...")
        pages = await pdf_service.extract_text_from_bytes(file_bytes)
        print(f"[{doc_id}] Extracted {len(pages)} pages with text.")

        if not pages:
            raise ValueError("PDF has no extractable text. It may be a scanned/image-only PDF.")
        for p in pages:
            _validate_non_empty(p.get("content"), "Extracted page content")

        # 2. Chunk text
        print(f"[{doc_id}] Step 2: Chunking text...")
        chunks = pdf_service.chunk_text(pages)
        print(f"[{doc_id}] Created {len(chunks)} chunks.")
        _validate_chunks(chunks)

        # 3. Generate embeddings
        print(f"[{doc_id}] Step 3: Generating embeddings for {len(chunks)} chunks...")
        chunk_texts = [c["content"] for c in chunks]
        _validate_non_empty("".join(chunk_texts[:1]), "Chunk text")
        embeddings = await embedding_service.generate_embeddings(chunk_texts)
        print(f"[{doc_id}] Got {len(embeddings)} embeddings.")
        _validate_embeddings(embeddings, expected_count=len(chunks))

        # 4. Store chunks
        print(f"[{doc_id}] Step 4: Storing chunks in database...")
        await admin_supabase.insert_chunks(doc_id, chunks, embeddings)

        # 5. Generate and cache summary (non-fatal)
        print(f"[{doc_id}] Step 5: Generating and caching summary...")
        try:
            top_chunks = chunks[:10]  # use first 10 chunks for summary
            summary = await generation_service.summarize_document(top_chunks)
            await admin_supabase.store_document_summary(doc_id, summary)
            print(f"[{doc_id}] Summary cached.")
        except Exception as summary_err:
            # Non-fatal — the document is still usable without a cached summary
            print(f"[{doc_id}] ⚠️ Summary generation failed (non-fatal): {summary_err}")

        # Mark as ready
        final_status = "ready"
        print(f"[{doc_id}] ✅ Processing complete!")
    except Exception as e:
        print(f"[{doc_id}] ❌ Error: {str(e)}")
    finally:
        await admin_supabase.update_document_status(doc_id, final_status)

async def process_text_task(doc_id: str, text: str):
    """Background task to process plain text (YouTube/Web): chunk, embed, store, cache summary."""
    final_status = "error"
    try:
        # 0. Validate fetched text
        _validate_non_empty(text, "Fetched text")

        # 1. Chunk text (treat as one page)
        print(f"[{doc_id}] Step 1: Chunking text...")
        pages = [{"page_number": 1, "content": text}]
        chunks = pdf_service.chunk_text(pages)
        print(f"[{doc_id}] Created {len(chunks)} chunks.")
        _validate_chunks(chunks)

        # 2. Generate embeddings
        print(f"[{doc_id}] Step 2: Generating embeddings...")
        chunk_texts = [c["content"] for c in chunks]
        embeddings = await embedding_service.generate_embeddings(chunk_texts)
        _validate_embeddings(embeddings, expected_count=len(chunks))

        # 3. Store chunks
        print(f"[{doc_id}] Step 3: Storing chunks...")
        await admin_supabase.insert_chunks(doc_id, chunks, embeddings)

        # 4. Generate and cache summary (non-fatal)
        print(f"[{doc_id}] Step 4: Generating and caching summary...")
        try:
            top_chunks = chunks[:10]
            summary = await generation_service.summarize_document(top_chunks)
            await admin_supabase.store_document_summary(doc_id, summary)
            print(f"[{doc_id}] Summary cached.")
        except Exception as summary_err:
            print(f"[{doc_id}] ⚠️ Summary generation failed (non-fatal): {summary_err}")

        # Mark as ready
        final_status = "ready"
        print(f"[{doc_id}] ✅ Processing complete!")
    except Exception as e:
        print(f"[{doc_id}] ❌ Error: {str(e)}")
    finally:
        await admin_supabase.update_document_status(doc_id, final_status)

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    collection_id: Optional[str] = None,
    auth=Depends(get_current_user),
    sb: SupabaseService = Depends(get_supabase)
):
    user, token = auth
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        file_bytes = await file.read()
        
        # Check file size (3MB limit)
        if len(file_bytes) > 3 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds the 3MB limit.")
            
        # Validate magic bytes (PDF header: %PDF-)
        if not file_bytes.startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail="Invalid PDF content. The file header is missing.")
            
        # Compute file hash
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Duplicate guard
        existing = await sb.find_document_by_hash(file_hash, user.id)
        if existing and existing.get("status") == "ready":
            return {
                "message": f"Document '{existing['name']}' is already present in your knowledge base.",
                "document_id": existing["id"],
                "file_url": existing["file_url"],
                "duplicate": True
            }

        # Resolve name conflicts
        import os
        base_name, ext = os.path.splitext(file.filename)
        existing_docs = await sb.find_documents_by_name_prefix(base_name, user.id)
        existing_names = {doc["name"] for doc in existing_docs}

        final_name = file.filename
        counter = 1
        while final_name in existing_names:
            final_name = f"{base_name} ({counter}){ext}"
            counter += 1
        
        # 1. Upload to Storage
        file_url = await sb.upload_pdf(final_name, file_bytes)
        
        # 2. Create Document Record
        doc_id = await sb.create_document(
            name=final_name,
            file_url=file_url,
            collection_id=collection_id,
            user_id=user.id,
            file_hash=file_hash
        )
        
        # 3. Start Background Processing
        background_tasks.add_task(process_pdf_task, doc_id, file_bytes)
        
        return {
            "message": "Upload successful. Processing started.",
            "document_id": doc_id,
            "file_url": file_url,
            "name": final_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise DocumentProcessingError(f"Upload failed: {str(e)}")

@router.get("/")
async def list_documents(auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    user, token = auth
    docs = await sb.list_documents(user_id=user.id)
    return {"documents": docs}

@router.get("/{doc_id}")
async def get_document(doc_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    user, token = auth
    doc = await sb.get_document(doc_id, user_id=user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    user, token = auth
    await sb.delete_document(doc_id, user_id=user.id)
    return {"message": "Document deleted successfully."}

@router.patch("/{doc_id}")
async def rename_document(doc_id: str, payload: RenameDocumentRequest, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    user, token = auth
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Document name cannot be empty.")
    if len(name) > 255:
        raise HTTPException(status_code=400, detail="Document name is too long (max 255).")
    try:
        updated = await sb.update_document_name(doc_id, user_id=user.id, name=name)
        return updated
    except ValueError:
        raise HTTPException(status_code=404, detail="Document not found.")

@router.post("/youtube")
async def ingest_youtube(request: ExternalUrlRequest, background_tasks: BackgroundTasks, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Ingests a YouTube video transcript."""
    user, token = auth
    if not is_safe_url(request.url):
        raise HTTPException(status_code=400, detail="Invalid or restricted URL.")
    try:
        await _enforce_ingest_cooldown(user.id)
        data = scraper_service.get_youtube_transcript(request.url)
        if data.get("error"):
            raise HTTPException(status_code=400, detail=data["error"])
        if not (data.get("content") or "").strip():
            raise HTTPException(status_code=400, detail="No transcript content found for this YouTube URL.")

        # One Gemini call for both title + summary (YouTube only).
        try:
            yt_ai = await generation_service.youtube_title_and_summary(data["content"])
        except UpstreamServiceUnavailable as e:
            raise HTTPException(status_code=503, detail=str(e))
        except UpstreamDailyQuotaReached as e:
            raise HTTPException(status_code=429, detail=str(e))
        doc_id = await sb.create_document(
            name=yt_ai["title"],
            file_url=request.url,
            collection_id=request.collection_id,
            user_id=user.id
        )
        background_tasks.add_task(process_text_task, doc_id, data["content"])
        return {
            "message": "YouTube transcript ingestion started.",
            "document_id": doc_id,
            "title": yt_ai["title"],
            "summary": yt_ai["summary"]
        }
    except (UpstreamServiceUnavailable, UpstreamDailyQuotaReached) as e:
        raise AIServiceError(str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise AIServiceError(f"YouTube ingestion failed: {str(e)}")

@router.post("/web")
async def ingest_web(request: ExternalUrlRequest, background_tasks: BackgroundTasks, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Ingests a web page content."""
    user, token = auth
    if not is_safe_url(request.url):
        raise HTTPException(status_code=400, detail="Invalid or restricted URL.")
    try:
        await _enforce_ingest_cooldown(user.id)
        data = scraper_service.scrape_web_url(request.url)
        doc_id = await sb.create_document(
            name=data["title"],
            file_url=request.url,
            collection_id=request.collection_id,
            user_id=user.id
        )
        background_tasks.add_task(process_text_task, doc_id, data["content"])
        return {"message": "Web page ingestion started.", "document_id": doc_id}
    except Exception as e:
        print(f"[ingest_web] Internal error: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while scraping the web page.")
