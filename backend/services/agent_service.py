import os
import json
import asyncio
from openai import AsyncOpenAI

from services.timeline_service import TimelineService
from services.supabase_service import SupabaseService
from services.scraper_service import ScraperService
from services.generation_service import GenerationService
from services.chat_service import ChatService
from services.embedding_service import EmbeddingService

QUEEN_BEE_TOOLS = [
    {
        "name": "get_timeline",
        "description": "Shows the user's knowledge timeline — documents grouped by month. Use when user asks about their timeline, learning history, or what they've uploaded.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "summarize_month",
        "description": "Generates an AI summary of what the user studied in a specific month.",
        "parameters": {
            "type": "object",
            "properties": {
                "year": {"type": "integer"},
                "month": {"type": "integer"}
            },
            "required": ["year", "month"]
        }
    },
    {
        "name": "create_collection",
        "description": "Creates a new collection to group documents together.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name of the collection"}
            },
            "required": ["name"]
        }
    },
    {
        "name": "ingest_url",
        "description": "Scrapes a URL and creates a document from its content.",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "collection_id": {"type": "string", "description": "Optional collection to add it to"}
            },
            "required": ["url"]
        }
    },
    {
        "name": "get_document_summary",
        "description": "Returns the cached summary of a document. Use when user asks to summarize a specific document.",
        "parameters": {
            "type": "object",
            "properties": {
                "doc_id": {"type": "string"}
            },
            "required": ["doc_id"]
        }
    },
    {
        "name": "query_document",
        "description": "Asks a question about a specific document using RAG. Use when user wants to know something specific from a document.",
        "parameters": {
            "type": "object",
            "properties": {
                "doc_id": {"type": "string"},
                "question": {"type": "string"}
            },
            "required": ["doc_id", "question"]
        }
    },
    {
        "name": "get_chat_summary",
        "description": "Summarizes the user's conversation history with a specific document.",
        "parameters": {
            "type": "object",
            "properties": {
                "doc_id": {"type": "string"}
            },
            "required": ["doc_id"]
        }
    },
    {
        "name": "list_documents",
        "description": "Lists all documents the user has uploaded. Use when user asks what documents they have or references a doc by name.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "list_collections",
        "description": "Lists all collections the user has created. Use when user wants to know what collections they have or needs a collection ID.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "add_document_to_collection",
        "description": "Adds an existing document to a collection.",
        "parameters": {
            "type": "object",
            "properties": {
                "doc_id": {"type": "string"},
                "collection_id": {"type": "string"}
            },
            "required": ["doc_id", "collection_id"]
        }
    }
]

OPENAI_TOOLS = [
    {
        "type": "function",
        "function": tool
    }
    for tool in QUEEN_BEE_TOOLS
]

class AgentService:
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.environ.get("NVIDIA_API_KEY")
        )
        self.model = os.environ.get("NVIDIA_MODEL", "nvidia/llama-3.3-nemotron-super-49b-v1.5")
        self.timeline_service = TimelineService()
        self.supabase = SupabaseService()
        self.scraper_service = ScraperService()
        self.generation_service = GenerationService()
        self.chat_service = ChatService()
        self.embedding_service = EmbeddingService()

    async def execute_tool(self, tool_name: str, args: dict, user_id: str) -> str:
        try:
            if tool_name == "get_timeline":
                result = await self.timeline_service.get_timeline(user_id)
                return json.dumps(result)
            
            elif tool_name == "summarize_month":
                result = await self.timeline_service.summarize_month(user_id, args["year"], args["month"])
                if isinstance(result, dict) and "summary" in result:
                    return result["summary"]
                return str(result)
            
            elif tool_name == "create_collection":
                result = await self.supabase.create_collection(args["name"], user_id)
                return f"Collection '{args['name']}' created successfully."
            
            elif tool_name == "ingest_url":
                from routes.document_routes import process_text_task
                scraped = self.scraper_service.scrape_web_url(args["url"])
                doc_id = await self.supabase.create_document(
                    name=scraped["title"],
                    file_url=args["url"],
                    collection_id=args.get("collection_id"),
                    user_id=user_id
                )
                asyncio.create_task(process_text_task(doc_id, scraped["content"]))
                return f"Document created from URL: {scraped['title']} and is processing in the background."
            
            elif tool_name == "get_document_summary":
                doc = await self.supabase.get_document(args["doc_id"], user_id)
                if not doc:
                    return "Document not found."
                if doc.get("summary"):
                    return doc["summary"]
                return "Summary not available yet for this document."
            
            elif tool_name == "query_document":
                query_embedding = await self.embedding_service.generate_query_embedding(args["question"])
                chunks = await self.supabase.match_chunks(args["doc_id"], query_embedding, match_count=5)
                if not chunks:
                    return "No relevant content found in this document."
                answer = await self.generation_service.answer_question(args["question"], chunks)
                await self.chat_service.save_message(args["doc_id"], user_id, args["question"], answer)
                return answer
            
            elif tool_name == "get_chat_summary":
                result = await self.chat_service.summarize_chat(args["doc_id"], user_id)
                return result.get("summary", "No summary available.")
            
            elif tool_name == "list_documents":
                result = await self.supabase.list_documents(user_id)
                docs = [{"id": d["id"], "name": d["name"], "status": d["status"], "created_at": d.get("created_at", "")} for d in result]
                return json.dumps(docs)

            elif tool_name == "list_collections":
                result = await self.supabase.list_collections(user_id)
                cols = [{"id": c["id"], "name": c["name"]} for c in result]
                return json.dumps(cols)

            elif tool_name == "add_document_to_collection":
                await self.supabase.assign_document_to_collection(args["doc_id"], args["collection_id"], user_id)
                return "Document added to collection successfully."
                
            return "Tool not found."
        except Exception as e:
            print(f"Error executing tool {tool_name}: {e}")
            return f"Error executing tool {tool_name}: {str(e)}"

    async def chat(self, user_message: str, conversation_history: list, user_id: str) -> str:
        system_prompt = """You are Queen Bee 🐝, the intelligent agent for MindHive — a personal knowledge base app.
        
        You help users manage their documents, collections, and knowledge.
        You have access to tools to get timelines, summarize documents, ingest URLs, query documents, and more.
        
        Always be helpful, concise, and friendly. When you complete an action, confirm it clearly.
        If the user references a document by name, use list_documents first to find its ID.
        You can chain multiple tools in one response if needed.
        
        IMPORTANT FORMATTING RULES:
        - When listing documents or showing timelines, NEVER show the raw document IDs to the user. Keep IDs hidden and only use them internally for tool calls.
        - Present lists of documents as a neat Markdown table with columns for Document Name (with a 📄 icon) and Upload Date.
        """
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # trim to last 10 messages
        history_to_use = conversation_history[-10:]
        for msg in history_to_use:
            role = "assistant" if msg["role"] == "agent" else "user"
            messages.append({"role": role, "content": msg["content"]})
            
        messages.append({"role": "user", "content": user_message})
        
        max_iterations = 5
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.3,
                    tools=OPENAI_TOOLS,
                    max_tokens=2048,
                )
            except Exception as e:
                print(f"Error communicating with NVIDIA NIM: {e}")
                return f"I encountered an error communicating with the brain: {e}"
            
            response_message = response.choices[0].message
            
            # Check for tool call
            if response_message.tool_calls:
                # Append the assistant message with tool_calls exactly as it came back
                # This ensures OpenAI API accepts it
                messages.append(response_message.model_dump(exclude_none=True))
                
                for tool_call in response_message.tool_calls:
                    tool_name = tool_call.function.name
                    try:
                        tool_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        tool_args = {}
                        
                    print(f"🐝 Queen Bee calling tool: {tool_name} with {tool_args}")
                    
                    tool_result = await self.execute_tool(tool_name, tool_args, user_id)
                    
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": str(tool_result)
                    })
                
            else:
                return response_message.content
                
        return "I hit my action limit for this request. Please try breaking it into smaller steps."
