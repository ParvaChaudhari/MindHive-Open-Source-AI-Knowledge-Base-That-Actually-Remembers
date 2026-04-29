from fastapi import APIRouter, HTTPException, Depends
from services.auth_service import get_current_user
from pydantic import BaseModel
from services.supabase_service import SupabaseService
from services.embedding_service import EmbeddingService
from services.generation_service import GenerationService
from services.upstream_errors import UpstreamServiceUnavailable, UpstreamDailyQuotaReached
from services.chat_service import ChatService

router = APIRouter(prefix="/documents", tags=["documents"])

supabase_service = SupabaseService()
embedding_service = EmbeddingService()
generation_service = GenerationService()
chat_service = ChatService()

class QueryRequest(BaseModel):
    question: str


@router.post("/{doc_id}/query")
async def query_document(doc_id: str, body: QueryRequest, user=Depends(get_current_user)):
    """RAG: Find relevant chunks and answer the question using Gemini."""
    doc = await supabase_service.get_document(doc_id, user_id=user.id)
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
    relevant_chunks = await supabase_service.match_chunks(doc_id, query_embedding, match_count=5)

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

    # 5. Return answer + citations
    return {
        "question": body.question,
        "answer": answer,
        "sources": [
            {"page_number": c["page_number"], "excerpt": c["content"][:200] + "..."}
            for c in relevant_chunks
        ]
    }

@router.get("/{doc_id}/summary")
async def summarize_document(doc_id: str, user=Depends(get_current_user)):
    """Returns cached summary, or generates + caches one on first request."""
    doc = await supabase_service.get_document(doc_id, user_id=user.id)
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
    top_chunks = await supabase_service.get_top_chunks(doc_id, limit=10)
    if not top_chunks:
        raise HTTPException(status_code=404, detail="No content found for this document.")

    try:
        summary = await generation_service.summarize_document(top_chunks)
    except UpstreamServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except UpstreamDailyQuotaReached as e:
        raise HTTPException(status_code=429, detail=str(e))

    # Store for next time
    await supabase_service.store_document_summary(doc_id, summary)

    return {
        "document_id": doc_id,
        "document_name": doc["name"],
        "summary": summary,
        "cached": False
    }

@router.get("/{doc_id}/flashcards")
async def generate_flashcards(doc_id: str, user=Depends(get_current_user)):
    """Generates AI flashcards for the document."""
    doc = await supabase_service.get_document(doc_id, user_id=user.id)
    if not doc:
        raise HTTPException(status_code=400, detail="Document not found or ready.")
    if doc["status"] != "ready":
        raise HTTPException(status_code=400, detail="Document not ready.")

    top_chunks = await supabase_service.get_top_chunks(doc_id, limit=15)
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
async def get_chat_history(doc_id: str, user=Depends(get_current_user)):
    """Fetches all past Q&A for this document."""
    doc = await supabase_service.get_document(doc_id, user_id=user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    history = await chat_service.get_chat_history(doc_id, user.id)
    return {"chats": history}

@router.get("/{doc_id}/chats/summary")
async def summarize_chat_history(doc_id: str, user=Depends(get_current_user)):
    """Generates an AI summary of the conversation history."""
    doc = await supabase_service.get_document(doc_id, user_id=user.id)
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
        raise HTTPException(status_code=500, detail=str(e))
