import os
from supabase import create_client, Client
from typing import List, Dict

class SupabaseService:
    def __init__(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")
        self.client: Client = create_client(url, key)

    async def upload_pdf(self, file_name: str, file_bytes: bytes) -> str:
        """Uploads a PDF to Supabase Storage and returns the public URL."""
        bucket = "pdfs"
        # Ensure file name is unique-ish
        path = f"uploads/{file_name}"
        
        self.client.storage.from_(bucket).upload(
            path=path,
            file=file_bytes,
            file_options={"content-type": "application/pdf"}
        )
        
        return self.client.storage.from_(bucket).get_public_url(path)

    async def create_document(self, name: str, file_url: str, user_id: str, collection_id: str = None) -> str:
        """Creates a document record and returns the ID."""
        data = {
            "name": name,
            "file_url": file_url,
            "status": "processing",
            "collection_id": collection_id,
            "user_id": user_id
        }
        result = self.client.table("documents").insert(data).execute()
        return result.data[0]["id"]

    async def update_document_status(self, doc_id: str, status: str):
        """Updates document processing status."""
        self.client.table("documents").update({"status": status}).eq("id", doc_id).execute()

    async def update_document_name(self, doc_id: str, user_id: str, name: str) -> Dict:
        """
        Renames a document (scoped to user) and returns the updated record.

        Note: some Supabase/PostgREST client versions don't support chaining `.select()`
        on update builders, so we update then re-fetch.
        """
        # Perform the update (some client versions don't return rows by default).
        (
            self.client.table("documents")
            .update({"name": name})
            .eq("id", doc_id)
            .eq("user_id", user_id)
            .execute()
        )

        result = (
            self.client.table("documents")
            .select("id, name, status, file_url, created_at, collection_id")
            .eq("id", doc_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not getattr(result, "data", None):
            raise ValueError("Document not found")
        return result.data[0]

    async def insert_chunks(self, doc_id: str, chunks: List[Dict], embeddings: List[List[float]]):
        """Inserts text chunks and their embeddings into the database."""
        data = []
        for i, chunk in enumerate(chunks):
            data.append({
                "doc_id": doc_id,
                "content": chunk["content"],
                "embedding": embeddings[i],
                "page_number": chunk["page_number"]
            })
        
        # Insert in batches to avoid payload limits
        batch_size = 100
        for i in range(0, len(data), batch_size):
            self.client.table("chunks").insert(data[i:i+batch_size]).execute()

    async def match_chunks(self, doc_id: str, query_embedding: List[float], match_count: int = 5) -> List[Dict]:
        """Runs a pgvector similarity search to find the most relevant chunks."""
        result = self.client.rpc("match_chunks", {
            "query_embedding": query_embedding,
            "match_doc_id": doc_id,
            "match_count": match_count
        }).execute()
        return result.data

    async def get_top_chunks(self, doc_id: str, limit: int = 10) -> List[Dict]:
        """Returns the top N chunks for a document (for summarization)."""
        result = (
            self.client.table("chunks")
            .select("content, page_number")
            .eq("doc_id", doc_id)
            .limit(limit)
            .execute()
        )
        return result.data

    async def list_documents(self, user_id: str) -> List[Dict]:
        """Returns all documents for a specific user."""
        result = (
            self.client.table("documents")
            .select("id, name, status, file_url, created_at, collection_id, collections(name)")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data

    async def get_document(self, doc_id: str, user_id: str = None) -> Dict:
        """Returns a single document by ID, optionally filtered by user."""
        query = self.client.table("documents").select(
            "id, name, status, file_url, created_at, collection_id, user_id, summary, summary_generated_at"
        ).eq("id", doc_id)
        if user_id:
            query = query.eq("user_id", user_id)
        
        result = query.single().execute()
        return result.data

    async def delete_document(self, doc_id: str, user_id: str):
        """Deletes document record, chunks, and the file from storage."""
        try:
            # 1. Get document details for the file path
            doc = await self.get_document(doc_id, user_id)
            file_name = doc["name"]
            path = f"uploads/{file_name}"
            
            # 2. Delete chunks (RLS or explicit filter)
            self.client.table("chunks").delete().eq("doc_id", doc_id).execute()
            
            # 3. Delete document record
            self.client.table("documents").delete().eq("id", doc_id).eq("user_id", user_id).execute()
            
            # 4. Delete file from storage
            # Note: We try-catch storage delete in case the file was already gone
            try:
                self.client.storage.from_("pdfs").remove([path])
            except:
                pass
                
            return True
        except Exception as e:
            print(f"Error deleting document: {e}")
            raise e

    async def store_document_summary(self, doc_id: str, summary: str):
        """Writes (or overwrites) the cached summary for a document."""
        from datetime import datetime, timezone
        self.client.table("documents").update({
            "summary": summary,
            "summary_generated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", doc_id).execute()

    async def find_document_by_name(self, name: str, user_id: str) -> Dict:
        """
        Returns the first ready document matching the filename for a user.
        Used to detect duplicate uploads.
        """
        result = (
            self.client.table("documents")
            .select("id, name, status, file_url, created_at, collection_id, summary, summary_generated_at")
            .eq("name", name)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    # ── Collection CRUD ────────────────────────────────────────────────────────

    async def create_collection(self, name: str, user_id: str, description: str = None) -> Dict:
        """Creates a new collection for a specific user."""
        data = {"name": name, "user_id": user_id}
        if description:
            data["description"] = description
        result = self.client.table("collections").insert(data).execute()
        return result.data[0]

    async def list_collections(self, user_id: str) -> List[Dict]:
        """Returns all collections for a specific user."""
        result = (
            self.client.table("collections")
            .select("id, name, description, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        collections = result.data

        # Attach document counts
        for col in collections:
            count_result = (
                self.client.table("documents")
                .select("id", count="exact")
                .eq("collection_id", col["id"])
                .execute()
            )
            col["document_count"] = count_result.count or 0

        return collections

    async def get_collection(self, collection_id: str, user_id: str) -> Dict:
        """Returns a single collection by ID."""
        result = (
            self.client.table("collections")
            .select("id, name, description, created_at")
            .eq("id", collection_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data

    async def delete_collection(self, collection_id: str):
        """Deletes a collection. Documents are unlinked (collection_id set to null)."""
        # Unlink documents first
        self.client.table("documents").update({"collection_id": None}).eq("collection_id", collection_id).execute()
        # Delete the collection
        self.client.table("collections").delete().eq("id", collection_id).execute()

    async def assign_document_to_collection(self, doc_id: str, collection_id: str, user_id: str):
        """Assigns (or unassigns) a document to a collection, scoped to the user."""
        self.client.table("documents").update({"collection_id": collection_id}).eq("id", doc_id).eq("user_id", user_id).execute()

    async def list_documents_in_collection(self, collection_id: str, user_id: str) -> List[Dict]:
        """Returns all documents belonging to a collection."""
        result = (
            self.client.table("documents")
            .select("id, name, status, file_url, created_at, collection_id")
            .eq("collection_id", collection_id)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data

    async def match_chunks_in_collection(
        self,
        collection_id: str,
        query_embedding: List[float],
        match_count: int = 10
    ) -> List[Dict]:
        """
        Runs cross-document similarity search across all docs in a collection.
        Calls the `match_chunks_in_collection` Postgres RPC function.
        """
        result = self.client.rpc("match_chunks_in_collection", {
            "query_embedding": query_embedding,
            "match_collection_id": collection_id,
            "match_count": match_count
        }).execute()
        return result.data
