import os
from google import genai
from google.genai import types
from typing import List
import json
import asyncio

from services.upstream_errors import UpstreamServiceUnavailable, UpstreamDailyQuotaReached
from services.security_utils import sanitize_log

class GenerationService:
    def __init__(self):
        self.client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        self.model = "gemini-2.5-flash"

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

    async def _generate_with_retry(self, *, prompt: str, config: types.GenerateContentConfig):
        last_err = None
        for attempt in range(3):
            try:
                return self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config,
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

    async def answer_question(self, question: str, context_chunks: List[dict]) -> str:
        """Generates an answer grounded in the provided context chunks."""
        context = "\n\n---\n\n".join([
            f"[Page {c['page_number']}]: {c['content']}"
            for c in context_chunks
        ])

        prompt = f"""You are an expert assistant for a knowledge base called MindHive.
Answer the user's question based ONLY on the context provided below.
If the answer is not contained in the context, say: "I couldn't find relevant information in this document."
Do not make up any information. Be concise and direct.

Context:
{context}

Question: {question}

Answer:"""

        response = await self._generate_with_retry(
            prompt=prompt,
            config=types.GenerateContentConfig(temperature=0.2),
        )
        return response.text

    async def summarize_document(self, context_chunks: List[dict]) -> str:
        """Generates a concise summary from the top chunks of a document."""
        context = "\n\n".join([c['content'] for c in context_chunks])

        prompt = f"""You are an expert summarizer for a knowledge base called MindHive.
Create a clear, structured summary of the document based on the content below.
Include:
- A 2-3 sentence overview
- Key topics or themes covered
- Important facts or conclusions

Document content:
{context}

Summary:"""

        response = await self._generate_with_retry(
            prompt=prompt,
            config=types.GenerateContentConfig(temperature=0.3),
        )
        return response.text

    async def youtube_title_and_summary(self, transcript_text: str) -> dict:
        """
        Generates BOTH a clean YouTube title and a TL;DR summary in ONE model call.
        Returns: {"title": str, "summary": str}
        """
        prompt = f"""You are MindHive's YouTube ingestion assistant.
Given a YouTube transcript, produce:
1) A short, human-friendly title (3-12 words). No quotes. Title case if it fits.
2) A concise TL;DR summary (5-10 bullet points max). Grounded in the transcript.

Return ONLY JSON:
{{
  "title": "...",
  "summary": "..."
}}

Transcript:
{transcript_text}
"""

        response = await self._generate_with_retry(
            prompt=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )

        try:
            parsed = json.loads(response.text)
        except Exception:
            parsed = {}

        def _coerce_to_text(value) -> str:
            if value is None:
                return ""
            if isinstance(value, str):
                return value
            # Gemini can occasionally emit arrays/objects even when asked for strings.
            if isinstance(value, list):
                return " ".join([str(v) for v in value if v is not None])
            if isinstance(value, dict):
                # Prefer common keys if present, else stringify the dict.
                for k in ("text", "value", "title", "summary"):
                    if k in value:
                        return str(value.get(k))
                return json.dumps(value, ensure_ascii=False)
            return str(value)

        title = _coerce_to_text(parsed.get("title")).strip()
        summary = _coerce_to_text(parsed.get("summary")).strip()

        # Safe fallbacks
        if not title:
            title = "YouTube Video"
        if not summary:
            summary = response.text.strip()

        return {"title": title, "summary": summary}

    async def answer_cross_document(
        self,
        question: str,
        context_chunks: List[dict],
        documents: List[dict]
    ) -> str:
        """
        Generates an answer grounded in chunks from MULTIPLE documents.
        Each chunk is labeled with its source document name for multi-doc attribution.
        """
        # Build a doc name lookup from doc_id → name
        doc_name_map = {d["id"]: d["name"] for d in documents}

        context = "\n\n---\n\n".join([
            f"[Source: {doc_name_map.get(c.get('doc_id'), 'Unknown')} | Page {c['page_number']}]: {c['content']}"
            for c in context_chunks
        ])

        prompt = f"""You are an expert research assistant for a knowledge base called MindHive.
You have been given content from MULTIPLE documents in a collection.
Answer the user's question by synthesizing information across all relevant sources.

Rules:
- Base your answer ONLY on the context provided below
- When referencing information, cite the source document name in parentheses, e.g. "(Source: Document Name)"
- If documents disagree, note the discrepancy explicitly
- If the answer is not found in any document, say: "I couldn't find relevant information in this collection."
- Be thorough but concise. Structure your answer clearly.

Context from {len(documents)} document(s):
{context}

Question: {question}

Answer:"""

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
            )
        )
        return response.text

    async def generate_flashcards(self, context_chunks: List[dict]) -> List[dict]:
        """Generates a list of Q&A flashcards based on the document content."""
        context = "\n\n".join([c['content'] for c in context_chunks])

        prompt = f"""You are an educational assistant for MindHive. 
Generate a list of exactly 8 high-quality flashcards (question and answer pairs) based on the document content provided below.
The flashcards should cover the most important facts, concepts, or definitions.
Keep questions clear and answers concise but complete.

Return ONLY a JSON list of objects with "question" and "answer" keys.

Document content:
{context}

Flashcards JSON:"""

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.5,
                response_mime_type="application/json"
            )
        )
        
        try:
            return json.loads(response.text)
        except Exception as e:
            print(sanitize_log(f"[generate_flashcards] JSON parse error: {e}"))
            return []

    async def summarize_collection(self, context_chunks: List[dict], doc_names: List[str]) -> str:
        """Generates a high-level summary of an entire collection."""
        context = "\n\n---\n\n".join([c['content'] for c in context_chunks])

        prompt = f"""You are an expert knowledge architect for MindHive.
Create a "Daily Digest" summary for a collection of {len(doc_names)} documents.
The documents are: {", ".join(doc_names)}

Your summary should:
1. Synthesize the core themes across all documents
2. Highlight unique insights from specific documents
3. Identify connections or contradictions between sources
4. Be structured with clear headings and bullet points

Context from documents:
{context}

Daily Digest:"""

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.4,
            )
        )
        return response.text

    async def summarize_learning_period(self, period_name: str, doc_summaries: List[dict]) -> str:
        """Generates a summary of what was learned during a specific period (e.g. "April 2024")."""
        context = "\n\n---\n\n".join([
            f"Document: {d['name']}\nSummary: {d['summary']}"
            for d in doc_summaries
        ])

        prompt = f"""You are MindHive's Knowledge Agent. 
The user studied the following documents during {period_name}.
Provide a high-level "Monthly Knowledge Review" that:
1. Synthesizes the major themes learned this month.
2. Identifies connections between different documents.
3. Provides a "Mastery Score" summary (how much breadth/depth was covered).

Be encouraging and professional.

Documents learned:
{context}

Monthly Review:"""

        response = await self._generate_with_retry(
            prompt=prompt,
            config=types.GenerateContentConfig(temperature=0.4),
        )
        return response.text

    async def summarize_chat(self, chat_history: List[dict]) -> str:
        """Generates a summary of the conversation based on chat history."""
        # chat_history: list of {"question": str, "answer": str}
        context = "\n\n".join([
            f"User: {c['question']}\nAgent: {c['answer']}"
            for c in chat_history
        ])

        prompt = f"""You are MindHive's Knowledge Agent.
Summarize the following conversation history between the user and the agent regarding a document.
Focus on the key questions the user asked and the main takeaways from the agent's answers.
Keep the summary concise and structured.

Conversation History:
{context}

Summary:"""

        response = await self._generate_with_retry(
            prompt=prompt,
            config=types.GenerateContentConfig(temperature=0.3),
        )
        return response.text
