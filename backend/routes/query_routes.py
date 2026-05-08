from fastapi import APIRouter, HTTPException, Depends
from services.auth_service import get_current_user
from pydantic import BaseModel
from services.supabase_service import SupabaseService
from services.embedding_service import EmbeddingService
from services.generation_service import GenerationService
from services.upstream_errors import UpstreamServiceUnavailable, UpstreamDailyQuotaReached
from services.chat_service import ChatService
from fastapi_limiter.depends import RateLimiter

router = APIRouter(prefix="/documents", tags=["documents"])

embedding_service = EmbeddingService()
generation_service = GenerationService()
chat_service = ChatService()

# Dependency to get an authenticated Supabase service
async def get_supabase(auth=Depends(get_current_user)):
    user, token = auth
    return SupabaseService(token=token)

class QueryRequest(BaseModel):
    question: str


@router.post("/{doc_id}/query", dependencies=[Depends(RateLimiter(times=15, seconds=60))])
async def query_document(doc_id: str, body: QueryRequest, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """RAG: Find relevant chunks and answer the question using Gemini."""
    user, token = auth
    doc = await sb.get_document(doc_id, user_id=user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc["status"] != "ready":
        raise HTTPException(status_code=400, detail=f"Document is not ready yet. Status: {doc['status']}")

    # 1. Embed the query
    try:
        query_embedding = await embedding_service.generate_query_embedding(body.question)
    except UpstreamServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except UpstreamDailyQuotaReached as e:
        raise HTTPException(status_code=429, detail=str(e))

    # 2. Find most relevant chunks via similarity search
    relevant_chunks = await sb.match_chunks(doc_id, query_embedding, match_count=5)

    if not relevant_chunks:
        raise HTTPException(status_code=404, detail="No relevant content found in this document.")

    # 3. Generate an answer
    try:
        answer = await generation_service.answer_question(body.question, relevant_chunks)
    except UpstreamServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except UpstreamDailyQuotaReached as e:
        raise HTTPException(status_code=429, detail=str(e))

    # 4. Save to chat history
    await chat_service.save_message(doc_id, user.id, body.question, answer)

    # 5. Build deduplicated citations
    sources = []
    seen = set()
    for c in relevant_chunks:
        if c["page_number"] not in seen:
            seen.add(c["page_number"])
            sources.append({
                "page_number": c["page_number"],
                "excerpt": c["content"][:200] + "..."
            })
            if len(sources) >= 3:
                break

    return {
        "question": body.question,
        "answer": answer,
        "sources": sources
    }

@router.get("/{doc_id}/summary", dependencies=[Depends(RateLimiter(times=15, seconds=60))])
async def summarize_document(doc_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Returns cached summary, or generates + caches one on first request."""
    user, token = auth
    doc = await sb.get_document(doc_id, user_id=user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc["status"] != "ready":
        raise HTTPException(status_code=400, detail=f"Document is not ready yet. Status: {doc['status']}")

    # ── Cache hit ─────────────────────────────────────────────────────────────
    if doc.get("summary"):
        return {
            "document_id": doc_id,
            "document_name": doc["name"],
            "summary": doc["summary"],
            "cached": True,
            "cached_at": doc.get("summary_generated_at")
        }

    # ── Cache miss: generate, store, return ──────────────────────────────────
    top_chunks = await sb.get_top_chunks(doc_id, limit=10)
    if not top_chunks:
        raise HTTPException(status_code=404, detail="No content found for this document.")

    try:
        summary = await generation_service.summarize_document(top_chunks)
    except UpstreamServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except UpstreamDailyQuotaReached as e:
        raise HTTPException(status_code=429, detail=str(e))

    # Store for next time
    await sb.store_document_summary(doc_id, summary)

    return {
        "document_id": doc_id,
        "document_name": doc["name"],
        "summary": summary,
        "cached": False
    }

@router.get("/{doc_id}/flashcards", dependencies=[Depends(RateLimiter(times=15, seconds=60))])
async def generate_flashcards(doc_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Generates AI flashcards for the document."""
    user, token = auth
    doc = await sb.get_document(doc_id, user_id=user.id)
    if not doc:
        raise HTTPException(status_code=400, detail="Document not found or ready.")
    if doc["status"] != "ready":
        raise HTTPException(status_code=400, detail="Document not ready.")

    top_chunks = await sb.get_top_chunks(doc_id, limit=15)
    if not top_chunks:
        raise HTTPException(status_code=404, detail="No content found.")

    try:
        flashcards = await generation_service.generate_flashcards(top_chunks)
    except UpstreamServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except UpstreamDailyQuotaReached as e:
        raise HTTPException(status_code=429, detail=str(e))
    return {"flashcards": flashcards}

@router.get("/{doc_id}/chats")
async def get_chat_history(doc_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Fetches all past Q&A for this document."""
    user, token = auth
    doc = await sb.get_document(doc_id, user_id=user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    history = await chat_service.get_chat_history(doc_id, user.id)
    return {"chats": history}

@router.get("/{doc_id}/chats/summary", dependencies=[Depends(RateLimiter(times=15, seconds=60))])
async def summarize_chat_history(doc_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Generates an AI summary of the conversation history."""
    user, token = auth
    doc = await sb.get_document(doc_id, user_id=user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        result = await chat_service.summarize_chat(doc_id, user.id)
        return result
    except UpstreamServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except UpstreamDailyQuotaReached as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        print(f"[summarize_chat] Internal error: {e}")
        raise HTTPException(status_code=500, detail="Failed to summarize chat history.")

@router.delete("/{doc_id}/chats")
async def clear_chat_history(doc_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Deletes all chat history for this document."""
    user, token = auth
    doc = await sb.get_document(doc_id, user_id=user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        await chat_service.clear_chat_history(doc_id, user.id)
        return {"status": "success", "message": "Chat history cleared"}
    except Exception as e:
        print(f"[clear_chat_history] Internal error: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear chat history.")
