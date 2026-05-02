from fastapi import APIRouter, HTTPException, Depends
from services.auth_service import get_current_user
from pydantic import BaseModel
from typing import Optional
from services.supabase_service import SupabaseService
from services.embedding_service import EmbeddingService
from services.generation_service import GenerationService
from services.security_utils import check_rate_limit

router = APIRouter(prefix="/collections", tags=["collections"])

embedding_service = EmbeddingService()
generation_service = GenerationService()

# Dependency to get an authenticated Supabase service
async def get_supabase(auth=Depends(get_current_user)):
    user, token = auth
    return SupabaseService(token=token)


# ── Request / Response models ──────────────────────────────────────────────────

class CreateCollectionRequest(BaseModel):
    name: str
    description: Optional[str] = None

class CollectionQueryRequest(BaseModel):
    question: str

class AddDocumentRequest(BaseModel):
    document_id: str


# ── Collection CRUD ────────────────────────────────────────────────────────────

@router.post("/")
async def create_collection(body: CreateCollectionRequest, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Creates a new collection."""
    user, token = auth
    collection = await sb.create_collection(body.name, user_id=user.id, description=body.description)
    return {"collection": collection, "message": "Collection created successfully."}


@router.get("/")
async def list_collections(auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Returns all collections with their document counts."""
    user, token = auth
    collections = await sb.list_collections(user_id=user.id)
    return {"collections": collections}


@router.get("/{collection_id}")
async def get_collection(collection_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Returns a single collection and its documents."""
    user, token = auth
    collection = await sb.get_collection(collection_id, user_id=user.id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found.")
    documents = await sb.list_documents_in_collection(collection_id, user_id=user.id)
    return {"collection": collection, "documents": documents}


@router.delete("/{collection_id}")
async def delete_collection(collection_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Deletes a collection (documents are unlinked, not deleted)."""
    user, token = auth
    collection = await sb.get_collection(collection_id, user_id=user.id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found.")
    await sb.delete_collection(collection_id, user_id=user.id)
    return {"message": "Collection deleted. Associated documents have been unlinked."}


@router.post("/{collection_id}/documents")
async def add_document_to_collection(collection_id: str, body: AddDocumentRequest, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Adds an existing document to a collection."""
    user, token = auth
    collection = await sb.get_collection(collection_id, user_id=user.id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found.")
 
    doc = await sb.get_document(body.document_id, user_id=user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
 
    await sb.assign_document_to_collection(body.document_id, collection_id, user_id=user.id)
    return {"message": f"Document '{doc['name']}' added to collection '{collection['name']}'."}


@router.delete("/{collection_id}/documents/{doc_id}")
async def remove_document_from_collection(collection_id: str, doc_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Removes a document from a collection (unlinks it, does not delete the document)."""
    user, token = auth
    collection = await sb.get_collection(collection_id, user_id=user.id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found.")

    await sb.assign_document_to_collection(doc_id, None, user_id=user.id)
    return {"message": "Document removed from collection."}


# ── Cross-document Query ───────────────────────────────────────────────────────

@router.post("/{collection_id}/query")
async def query_collection(collection_id: str, body: CollectionQueryRequest, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """
    RAG across ALL documents in a collection.
    """
    user, token = auth
    check_rate_limit(user.id)
    collection = await sb.get_collection(collection_id, user_id=user.id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found.")

    # Make sure there are ready documents in the collection
    documents = await sb.list_documents_in_collection(collection_id, user_id=user.id)
    ready_docs = [d for d in documents if d["status"] == "ready"]
    if not ready_docs:
        raise HTTPException(
            status_code=400,
            detail="No ready documents in this collection. Upload and process documents first."
        )

    # 1. Embed the query
    query_embedding = await embedding_service.generate_query_embedding(body.question)

    # 2. Similarity search across ALL docs in the collection
    relevant_chunks = await sb.match_chunks_in_collection(
        collection_id=collection_id,
        query_embedding=query_embedding,
        match_count=10
    )

    if not relevant_chunks:
        raise HTTPException(status_code=404, detail="No relevant content found across this collection.")

    # 3. Generate cross-document answer with source attribution
    answer = await generation_service.answer_cross_document(body.question, relevant_chunks, ready_docs)

    # 4. Build citations — include document name alongside page number
    sources = []
    seen = set()
    for chunk in relevant_chunks:
        key = (chunk.get("doc_id"), chunk.get("page_number"))
        if key not in seen:
            seen.add(key)
            sources.append({
                "doc_id": chunk.get("doc_id"),
                "document_name": chunk.get("doc_name", "Unknown Document"),
                "page_number": chunk.get("page_number"),
                "excerpt": chunk.get("content", "")[:200] + "..."
            })

    return {
        "collection_id": collection_id,
        "collection_name": collection["name"],
        "question": body.question,
        "answer": answer,
        "sources": sources,
        "documents_searched": len(ready_docs),
    }

@router.get("/{collection_id}/summary")
async def summarize_collection(collection_id: str, auth=Depends(get_current_user), sb: SupabaseService = Depends(get_supabase)):
    """Generates a high-level AI summary of all documents in the collection."""
    user, token = auth
    check_rate_limit(user.id)
    collection = await sb.get_collection(collection_id, user_id=user.id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found.")
 
    documents = await sb.list_documents_in_collection(collection_id, user_id=user.id)
    ready_docs = [d for d in documents if d["status"] == "ready"]
    if not ready_docs:
        raise HTTPException(status_code=400, detail="No ready documents in collection.")

    # Get top chunks from up to 5 documents to avoid context window explosion
    # but still provide a good overview.
    all_context = []
    doc_names = [d["name"] for d in ready_docs]
    
    for doc in ready_docs[:5]:
        chunks = await sb.get_top_chunks(doc["id"], limit=5)
        all_context.extend(chunks)

    if not all_context:
        raise HTTPException(status_code=404, detail="No content found in collection.")

    summary = await generation_service.summarize_collection(all_context, doc_names)
    return {
        "collection_id": collection_id,
        "collection_name": collection["name"],
        "summary": summary,
        "document_count": len(ready_docs)
    }
