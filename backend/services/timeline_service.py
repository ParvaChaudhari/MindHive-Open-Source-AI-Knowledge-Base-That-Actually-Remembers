from typing import List, Dict
from datetime import datetime
from services.supabase_service import SupabaseService
from services.generation_service import GenerationService

class TimelineService:
    def __init__(self):
        self.supabase = SupabaseService()
        self.generation = GenerationService()

    async def get_timeline(self, user_id: str) -> Dict:
        """
        Groups documents by year and month.
        Returns: { "2024": { "April": [doc1, doc2], "March": [...] }, ... }
        """
        docs = await self.supabase.list_documents(user_id=user_id)
        
        timeline = {}
        
        # Sort by date descending
        sorted_docs = sorted(docs, key=lambda x: x["created_at"], reverse=True)
        
        for doc in sorted_docs:
            dt = datetime.fromisoformat(doc["created_at"].replace("Z", "+00:00"))
            year = str(dt.year)
            month = dt.strftime("%B")
            
            if year not in timeline:
                timeline[year] = {}
            if month not in timeline[year]:
                timeline[year][month] = []
                
            timeline[year][month].append(doc)
            
        return timeline

    async def summarize_month(self, user_id: str, year: int, month: int) -> str:
        """
        Fetches all documents from a specific month and generates an AI summary.
        Uses cached summaries if available.
        """
        # 1. Fetch documents for that month
        # We'll filter in Python for simplicity, or we could do it in SQL
        all_docs = await self.supabase.list_documents(user_id=user_id)
        
        month_docs = []
        month_name = datetime(year, month, 1).strftime("%B")
        
        for doc in all_docs:
            dt = datetime.fromisoformat(doc["created_at"].replace("Z", "+00:00"))
            if dt.year == year and dt.month == month:
                # We need the summary. If not present in list_documents, we might need a more detailed fetch
                # or ensure list_documents returns it.
                # Currently supabase_service.list_documents includes 'summary' (I added it in Step 1)
                month_docs.append({
                    "name": doc["name"],
                    "summary": doc.get("summary") or "No summary available."
                })
        
        if not month_docs:
            return f"No documents found for {month_name} {year}."

        # 2. Generate summary
        try:
            # We'll use a new method in GenerationService (I'll add it properly now)
            summary = await self.generation.summarize_learning_period(f"{month_name} {year}", month_docs)
            return summary
        except Exception as e:
            return f"Failed to generate monthly summary: {str(e)}"
