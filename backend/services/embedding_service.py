import os
from google import genai
from typing import List

from google import genai
from google.genai import types
import asyncio

from services.upstream_errors import UpstreamServiceUnavailable, UpstreamDailyQuotaReached

class EmbeddingService:
    def __init__(self):
        self.client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        self.model = "gemini-embedding-001"
        self.batch_size = 100

    def _is_daily_quota_error(self, msg: str) -> bool:
        m = (msg or "").lower()
        return (
            "daily quota" in m
            or "quota exceeded" in m
            or "quota" in m and "exceed" in m
            or "resource_exhausted" in m
        )

    def _is_overloaded_error(self, msg: str) -> bool:
        m = (msg or "").lower()
        return ("503" in m) or ("high demand" in m) or ("unavailable" in m)

    async def _embed_with_retry(self, contents):
        last_err = None
        for attempt in range(3):
            try:
                return self.client.models.embed_content(
                    model=self.model,
                    contents=contents,
                    config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
                )
            except Exception as e:
                msg = str(e)
                last_err = e

                if self._is_daily_quota_error(msg):
                    raise UpstreamDailyQuotaReached("Today's quota reached.")

                if self._is_overloaded_error(msg):
                    if attempt < 2:
                        await asyncio.sleep(0.5 * (2 ** attempt))
                        continue
                    raise UpstreamServiceUnavailable(
                        "Sorry, there is too much traffic right now. Please try again in a bit."
                    )
                raise
        raise last_err

    async def generate_embeddings(self, text_chunks: List[str]) -> List[List[float]]:
        """Generates vector embeddings for a list of text chunks."""
        if not text_chunks:
            raise ValueError("generate_embeddings received an empty list. Nothing to embed.")

        # Filter out any empty strings that could cause issues
        text_chunks = [t for t in text_chunks if t and t.strip()]
        if not text_chunks:
            raise ValueError("All text chunks are empty after filtering whitespace.")

        # Gemini embedding API accepts up to 100 contents per call.
        all_embeddings: List[List[float]] = []
        for i in range(0, len(text_chunks), self.batch_size):
            batch = text_chunks[i:i + self.batch_size]
            response = await self._embed_with_retry(batch)
            all_embeddings.extend([item.values for item in response.embeddings])

        return all_embeddings

    async def generate_query_embedding(self, query: str) -> List[float]:
        last_err = None
        for attempt in range(3):
            try:
                response = self.client.models.embed_content(
                    model=self.model,
                    contents=query,
                    config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
                )
                return response.embeddings[0].values
            except Exception as e:
                msg = str(e)
                last_err = e

                if self._is_daily_quota_error(msg):
                    raise UpstreamDailyQuotaReached("Today's quota reached.")

                if self._is_overloaded_error(msg):
                    if attempt < 2:
                        await asyncio.sleep(0.5 * (2 ** attempt))
                        continue
                    raise UpstreamServiceUnavailable(
                        "Sorry, there is too much traffic right now. Please try again in a bit."
                    )
                raise
        raise last_err