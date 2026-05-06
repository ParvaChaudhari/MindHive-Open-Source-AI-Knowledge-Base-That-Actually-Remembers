import os
import json
import asyncio
from openai import AsyncOpenAI
from typing import List

from services.upstream_errors import UpstreamServiceUnavailable, UpstreamDailyQuotaReached
from services.security_utils import sanitize_log

class GenerationService:
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.environ.get("NVIDIA_API_KEY")
        )
        # Default model for chat and simple tasks
        self.model = os.environ.get("NVIDIA_MODEL_CHAT")
        # High quality model for flashcards
        self.flashcard_model = os.environ.get("NVIDIA_MODEL_FLASHCARD")

    async def _generate_with_retry(self, messages: List[dict], temperature: float = 0.3, model: str = None):
        """Generates content using NVIDIA NIM with timing logs."""
        target_model = model or self.model
        last_err = None
        for attempt in range(3):
            try:
                start_time = asyncio.get_event_loop().time()
                response = await self.client.chat.completions.create(
                    model=target_model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=2048
                )
                duration = asyncio.get_event_loop().time() - start_time
                print(f"INFO:     AI Generation ({target_model}) took {duration:.2f}s")
                return response.choices[0].message.content
            except Exception as e:
                msg = str(e).lower()
                last_err = e
                
                if "quota" in msg or "429" in msg:
                    raise UpstreamDailyQuotaReached("AI quota reached. Please try again later.")
                
                if "503" in msg or "unavailable" in msg or "overloaded" in msg:
                    if attempt < 2:
                        await asyncio.sleep(1 * (2 ** attempt))
                        continue
                    raise UpstreamServiceUnavailable("AI service is currently overloaded. Please try again in a bit.")
                raise
        raise last_err

    async def answer_question(self, question: str, context_chunks: List[dict]) -> str:
        """Generates an answer grounded in the provided context chunks."""
        context = "\n\n---\n\n".join([
            f"[Page {c['page_number']}]: {c['content']}"
            for c in context_chunks
        ])

        messages = [
            {"role": "system", "content": "You are an expert assistant for MindHive. Answer the question based ONLY on the provided context. If the answer is not in the context, say you don't know. Be concise."},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ]

        return await self._generate_with_retry(messages, temperature=0.2)

    async def summarize_document(self, context_chunks: List[dict]) -> str:
        """Generates a high-quality summary."""
        context = "\n\n".join([c['content'] for c in context_chunks])

        messages = [
            {"role": "system", "content": "You are an expert summarizer. Create a clear, structured summary with an overview and key facts."},
            {"role": "user", "content": f"Document content:\n{context}"}
        ]

        return await self._generate_with_retry(messages, temperature=0.3)

    async def youtube_title_and_summary(self, transcript_text: str) -> dict:
        """Generates a clean YouTube title and TL;DR summary."""
        messages = [
            {"role": "system", "content": "You are a YouTube ingestion assistant. Return ONLY JSON with 'title' and 'summary' keys."},
            {"role": "user", "content": f"Transcript:\n{transcript_text}"}
        ]

        response_text = await self._generate_with_retry(messages, temperature=0.3)
        
        try:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start != -1 and end != -1:
                parsed = json.loads(response_text[start:end])
            else:
                parsed = json.loads(response_text)
        except:
            parsed = {"title": "YouTube Video", "summary": response_text}

        return {
            "title": parsed.get("title", "YouTube Video"),
            "summary": parsed.get("summary", response_text)
        }

    async def answer_cross_document(self, question: str, context_chunks: List[dict], documents: List[dict]) -> str:
        """Generates a synthesized answer across multiple documents."""
        doc_name_map = {d["id"]: d["name"] for d in documents}
        context = "\n\n---\n\n".join([
            f"[Source: {doc_name_map.get(c.get('doc_id'), 'Unknown')} | Page {c['page_number']}]: {c['content']}"
            for c in context_chunks
        ])

        messages = [
            {"role": "system", "content": "Synthesize information across multiple documents. Cite sources in parentheses, e.g. (Source: Name)."},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ]

        return await self._generate_with_retry(messages, temperature=0.2)

    async def generate_flashcards(self, context_chunks: List[dict]) -> List[dict]:
        """Generates 8 high-quality flashcards using the dedicated high-quality model."""
        context = "\n\n".join([c['content'] for c in context_chunks])

        messages = [
            {"role": "system", "content": "Generate exactly 8 Q&A flashcards as a JSON list of objects with 'question' and 'answer' keys. Return ONLY JSON."},
            {"role": "user", "content": f"Content:\n{context}"}
        ]

        # Use the specialized flashcard model
        response_text = await self._generate_with_retry(messages, temperature=0.5, model=self.flashcard_model)
        
        try:
            start = response_text.find('[')
            end = response_text.rfind(']') + 1
            return json.loads(response_text[start:end])
        except:
            return []

    async def summarize_collection(self, context_chunks: List[dict], doc_names: List[str]) -> str:
        """Generates a high-level collection digest."""
        context = "\n\n---\n\n".join([c['content'] for c in context_chunks])
        
        messages = [
            {"role": "system", "content": f"Synthesize themes across {len(doc_names)} documents: {', '.join(doc_names)}. Create a structured 'Daily Digest'."},
            {"role": "user", "content": f"Context:\n{context}"}
        ]

        return await self._generate_with_retry(messages, temperature=0.4)

    async def summarize_learning_period(self, period_name: str, doc_summaries: List[dict]) -> str:
        """Monthly knowledge review synthesis."""
        context = "\n\n".join([f"Doc: {d['name']} | Summary: {d['summary']}" for d in doc_summaries])

        messages = [
            {"role": "system", "content": f"You are MindHive's Knowledge Agent. Provide a Monthly Knowledge Review for {period_name}."},
            {"role": "user", "content": f"Docs studied:\n{context}"}
        ]

        return await self._generate_with_retry(messages, temperature=0.4)

    async def summarize_chat(self, chat_history: List[dict]) -> str:
        """Summarizes a conversation history."""
        context = "\n\n".join([f"User: {c['question']}\nAgent: {c['answer']}" for c in chat_history])

        messages = [
            {"role": "system", "content": "Summarize the key takeaways from this chat history."},
            {"role": "user", "content": f"History:\n{context}"}
        ]

        return await self._generate_with_retry(messages, temperature=0.3)
