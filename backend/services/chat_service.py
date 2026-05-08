from typing import List, Dict
from services.supabase_service import SupabaseService
from services.generation_service import GenerationService

class ChatService:
    def __init__(self):
        self.supabase = SupabaseService()
        self.generation = GenerationService()

    async def save_message(self, doc_id: str, user_id: str, question: str, answer: str) -> None:
        """Saves a Q&A pair to the chats table."""
        self.supabase.client.table("chats").insert({
            "doc_id": doc_id,
            "user_id": user_id,
            "question": question,
            "answer": answer
        }).execute()

    async def get_chat_history(self, doc_id: str, user_id: str) -> List[Dict]:
        """Fetches all chat history for a specific document and user."""
        result = (
            self.supabase.client.table("chats")
            .select("id, question, answer, created_at")
            .eq("doc_id", doc_id)
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        return result.data

    async def summarize_chat(self, doc_id: str, user_id: str) -> Dict:
        """
        Generates a summary of the chat history.
        Uses cached summary if message count hasn't changed.
        """
        # 1. Get current chat history
        history = await self.get_chat_history(doc_id, user_id)
        if not history:
            return {"summary": "No conversation history to summarize.", "message_count": 0}

        current_count = len(history)

        # 2. Check cache
        cache_response = (
            self.supabase.client.table("chat_summaries")
            .select("summary, message_count")
            .eq("doc_id", doc_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        cached_data = cache_response.data[0] if cache_response.data else None

        # Return cached if counts match
        if cached_data and cached_data.get("message_count") == current_count:
            return {
                "summary": cached_data["summary"],
                "message_count": current_count,
                "cached": True
            }

        # 3. Generate new summary
        summary_text = await self.generation.summarize_chat(history)

        # 4. Save/Update cache
        if cached_data:
            self.supabase.client.table("chat_summaries").update({
                "summary": summary_text,
                "message_count": current_count
            }).eq("doc_id", doc_id).eq("user_id", user_id).execute()
        else:
            self.supabase.client.table("chat_summaries").insert({
                "doc_id": doc_id,
                "user_id": user_id,
                "summary": summary_text,
                "message_count": current_count
            }).execute()

        return {
            "summary": summary_text,
            "message_count": current_count,
            "cached": False
        }

    async def clear_chat_history(self, doc_id: str, user_id: str) -> None:
        """Deletes all chat messages and cached summaries for a document."""
        # Delete messages
        self.supabase.client.table("chats").delete().eq("doc_id", doc_id).eq("user_id", user_id).execute()
        # Delete cached summary
        self.supabase.client.table("chat_summaries").delete().eq("doc_id", doc_id).eq("user_id", user_id).execute()
