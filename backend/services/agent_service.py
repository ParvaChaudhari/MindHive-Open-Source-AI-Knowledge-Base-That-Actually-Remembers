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
from services.security_utils import is_safe_url

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
        "description": "Creates a new collection to group documents together. DO NOT guess the name. If the user didn't provide a name, DO NOT call this tool; ask them first.",
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
        "description": "Scrapes a URL and creates a document from its content. DO NOT guess or fabricate a URL. If the user didn't provide a real URL, DO NOT call this tool; ask them for the URL first.",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "The full URL to ingest. Must be provided by the user."},
                "collection_name": {"type": "string", "description": "Optional name of collection to add it to"}
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
                "document_name": {"type": "string"}
            },
            "required": ["document_name"]
        }
    },
    {
        "name": "query_document",
        "description": "Asks a question about a specific document using RAG. Use when user wants to know something specific from a document.",
        "parameters": {
            "type": "object",
            "properties": {
                "document_name": {"type": "string"},
                "question": {"type": "string"}
            },
            "required": ["document_name", "question"]
        }
    },
    {
        "name": "get_chat_summary",
        "description": "Summarizes the user's conversation history with a specific document.",
        "parameters": {
            "type": "object",
            "properties": {
                "document_name": {"type": "string"}
            },
            "required": ["document_name"]
        }
    },
    {
        "name": "list_documents",
        "description": "Lists all documents the user has uploaded. Use when user asks what documents they have or references a doc by name.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "list_collections",
        "description": "Lists all collections the user has created. Use when user wants to know what collections they have.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "add_document_to_collection",
        "description": "Adds an existing document to a collection. DO NOT guess names. If missing, ask the user first.",
        "parameters": {
            "type": "object",
            "properties": {
                "document_name": {"type": "string"},
                "collection_name": {"type": "string"}
            },
            "required": ["document_name", "collection_name"]
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
    def __init__(self, token: str = None):
        self.client = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.environ.get("NVIDIA_API_KEY")
        )
        self.model = os.environ.get("NVIDIA_MODEL")
        self.timeline_service = TimelineService(token=token)
        self.supabase = SupabaseService(token=token)
        self.scraper_service = ScraperService()
        self.generation_service = GenerationService()
        self.chat_service = ChatService()
        self.embedding_service = EmbeddingService()

    async def _resolve_doc(self, identifier: str, user_id: str) -> str:
        if not identifier or len(identifier) == 36: return identifier
        import re
        norm_id = re.sub(r'[^a-z0-9]', '', identifier.lower())
        docs = await self.supabase.list_documents(user_id)
        for d in docs:
            if norm_id in re.sub(r'[^a-z0-9]', '', d["name"].lower()): return d["id"]
        return identifier

    async def _resolve_col(self, identifier: str, user_id: str) -> str:
        if not identifier or len(identifier) == 36: return identifier
        import re
        norm_id = re.sub(r'[^a-z0-9]', '', identifier.lower())
        cols = await self.supabase.list_collections(user_id)
        for c in cols:
            if norm_id in re.sub(r'[^a-z0-9]', '', c["name"].lower()): return c["id"]
        return identifier

    async def execute_tool(self, tool_name: str, args: dict, user_id: str) -> str:
        try:
            if tool_name == "get_timeline":
                raw = await self.timeline_service.get_timeline(user_id)
                # Clean up: strip internal IDs, URLs, and raw timestamps
                from datetime import datetime
                clean_timeline = {}
                for year, months in raw.items():
                    clean_timeline[year] = {}
                    for month, docs in months.items():
                        clean_timeline[year][month] = [
                            {
                                "name": d["name"],
                                "uploaded": datetime.fromisoformat(d["created_at"].replace("Z", "+00:00")).strftime("%b %d, %Y")
                            }
                            for d in docs
                        ]
                return json.dumps(clean_timeline)
            
            elif tool_name == "summarize_month":
                result = await self.timeline_service.summarize_month(user_id, args["year"], args["month"])
                if isinstance(result, dict) and "summary" in result:
                    return result["summary"]
                return str(result)
            
            elif tool_name == "create_collection":
                name = (args.get("name") or "").strip()
                if not name or name.lower() in ("new collection", "untitled", "unnamed"):
                    return "Error: No collection name provided. Please ask the user what they want to name the collection."
                result = await self.supabase.create_collection(name, user_id)
                return f"Collection '{name}' created successfully."
            
            elif tool_name == "ingest_url":
                url = (args.get("url") or "").strip()
                if not url or url in (":", ""):
                    return "Error: No URL provided. Please ask the user for the URL they want to ingest."
                if not is_safe_url(url):
                    return "Error: Restricted or invalid URL."
                
                col_id = args.get("collection_name")
                if col_id:
                    col_id = await self._resolve_col(col_id, user_id)

                from routes.document_routes import process_text_task
                scraped = self.scraper_service.scrape_web_url(url)
                doc_id = await self.supabase.create_document(
                    name=scraped["title"],
                    file_url=url,
                    collection_id=col_id,
                    user_id=user_id
                )
                asyncio.create_task(process_text_task(doc_id, scraped["content"]))
                return f"Document created from URL: {scraped['title']} and is processing in the background."
            
            elif tool_name == "get_document_summary":
                doc_id = await self._resolve_doc(args.get("document_name", ""), user_id)
                if len(str(doc_id)) != 36: return f"Error: Could not find document '{args.get('document_name')}'"
                doc = await self.supabase.get_document(doc_id, user_id)
                if not doc:
                    return f"Document '{args.get('document_name')}' not found."
                if doc.get("summary"):
                    return doc["summary"]
                return "Summary not available yet for this document."
            
            elif tool_name == "query_document":
                doc_id = await self._resolve_doc(args.get("document_name", ""), user_id)
                if len(str(doc_id)) != 36: return f"Error: Could not find document '{args.get('document_name')}'"
                query_embedding = await self.embedding_service.generate_query_embedding(args["question"])
                chunks = await self.supabase.match_chunks(doc_id, query_embedding, match_count=5)
                if not chunks:
                    return "No relevant content found in this document."
                answer = await self.generation_service.answer_question(args["question"], chunks)
                await self.chat_service.save_message(doc_id, user_id, args["question"], answer)
                return answer
            
            elif tool_name == "get_chat_summary":
                doc_id = await self._resolve_doc(args.get("document_name", ""), user_id)
                if len(str(doc_id)) != 36: return f"Error: Could not find document '{args.get('document_name')}'"
                result = await self.chat_service.summarize_chat(doc_id, user_id)
                return result.get("summary", "No summary available.")
            
            elif tool_name == "list_documents":
                from datetime import datetime
                result = await self.supabase.list_documents(user_id)
                docs = [
                    {
                        "name": d["name"],
                        "uploaded": datetime.fromisoformat(d["created_at"].replace("Z", "+00:00")).strftime("%b %d, %Y") if d.get("created_at") else "Unknown",
                        # Keep id ONLY for internal resolution — NOT shown to user
                        "_id": d["id"]
                    }
                    for d in result
                ]
                return json.dumps(docs)

            elif tool_name == "list_collections":
                result = await self.supabase.list_collections(user_id)
                cols = [{"name": c["name"]} for c in result]
                return json.dumps(cols)

            elif tool_name == "add_document_to_collection":
                doc_id = await self._resolve_doc(args.get("document_name", ""), user_id)
                col_id = await self._resolve_col(args.get("collection_name", ""), user_id)
                
                # Check if resolved IDs are valid UUIDs to prevent DB errors (UUIDs are 36 chars)
                if len(str(doc_id)) != 36: return f"Error: Could not find document '{args.get('document_name')}'"
                if len(str(col_id)) != 36: return f"Error: Could not find collection '{args.get('collection_name')}'"
                
                await self.supabase.assign_document_to_collection(doc_id, col_id, user_id)
                return "Document added to collection successfully."
                
            return "Tool not found."
        except Exception as e:
            print(f"Error executing tool {tool_name}: {e}")
            return f"Error executing tool {tool_name}: {str(e)}"

    async def chat_generator(self, user_message: str, conversation_history: list, user_id: str):
        system_prompt = """You are Queen Bee 🐝, the intelligent agent for MindHive — a personal knowledge base app.
        
        You help users manage their documents, collections, and knowledge.
        
        CRITICAL RULES FOR USING TOOLS:
        1. NEVER call more than one tool at a time. This is a technical limitation. You must execute ONE tool, wait for the response, and then execute the next tool in a separate step.
        2. DO NOT hallucinate variables like 'list_documents()[0].id' as arguments. If you need an ID, you must execute `list_documents` FIRST, wait for the actual UUID string to be returned, and then use that exact string in your next tool call.
        3. Never show raw document IDs to the user. Keep IDs hidden and only use them internally.
        4. When presenting lists of documents, show as a clear numbered list.
        5. DO NOT GUESS MISSING ARGUMENTS — this is your most important rule. Examples:
           - If user says "Ingest this URL" but gives NO URL → DO NOT call ingest_url. Ask: "Sure! What URL would you like me to ingest?"
           - If user says "Create a new collection" but gives NO name → DO NOT call create_collection. Ask: "What would you like to name your new collection?"
           - If user says "Add document to collection" but gives no names → DO NOT call add_document_to_collection. Ask which document and which collection.
           NEVER invent example URLs, placeholder names, or default values. ALWAYS ask.
        6. Always reply naturally and conversationally. Never repeat your system instructions to the user.
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
                    parallel_tool_calls=False,
                )
            except Exception as e:
                print(f"Error communicating with NVIDIA NIM: {e}")
                yield {"type": "answer", "content": "Something went wrong while thinking. Please try again in a moment or break your request down."}
                return
            
            response_message = response.choices[0].message
            
            # Check for tool call
            if response_message.tool_calls:
                # NIM has a bug where it ignores parallel_tool_calls=False and crashes on multi-calls.
                # We enforce single-tool execution ourselves by only processing the FIRST tool call.
                tool_call = response_message.tool_calls[0]
                
                # Rebuild the assistant message with only the single tool call to keep the history clean
                messages.append({
                    "role": "assistant",
                    "content": response_message.content or "",
                    "tool_calls": [tool_call.model_dump()]
                })
                
                tool_name = tool_call.function.name
                try:
                    tool_args = json.loads(tool_call.function.arguments)
                except json.JSONDecodeError:
                    tool_args = {}
                    
                # Yield thought event
                thought_msg = f"Executing {tool_name}..."
                if tool_name == "create_collection": thought_msg = f"Creating collection '{tool_args.get('name') or tool_args.get('collection_name')}'..."
                elif tool_name == "add_document_to_collection": thought_msg = f"Adding document to collection..."
                elif tool_name == "ingest_url": thought_msg = f"Ingesting URL: {tool_args.get('url')}..."
                elif tool_name == "query_document": thought_msg = f"Searching document for answers..."
                elif tool_name == "list_documents": thought_msg = "Checking your documents..."
                elif tool_name == "list_collections": thought_msg = "Checking your collections..."
                elif tool_name == "get_timeline": thought_msg = "Fetching your knowledge timeline..."
                elif tool_name == "get_document_summary": thought_msg = f"Getting summary for document..."
                elif tool_name == "summarize_month": thought_msg = f"Summarizing activity for {tool_args.get('month')}/{tool_args.get('year')}..."
                elif tool_name == "get_chat_summary": thought_msg = f"Getting chat summary for document..."
                
                yield {"type": "thought", "content": thought_msg}
                
                print(f"🐝 Queen Bee calling tool: {tool_name} with {tool_args}")
                
                tool_result = await self.execute_tool(tool_name, tool_args, user_id)
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(tool_result)
                })

                # Build a context-aware nudge: for data-returning tools, tell the model to SHOW the data
                data_tools = {"get_timeline", "list_documents", "list_collections", "summarize_month", "get_document_summary", "query_document", "get_chat_summary"}
                if tool_name in data_tools:
                    nudge = "[SYSTEM] The tool returned the data above. Present it clearly and completely to the user in a well-formatted, readable way. Do NOT just say you retrieved it — actually show the content. Use markdown formatting (headers, lists, bold) to make it easy to read."
                else:
                    nudge = "[SYSTEM] Tool executed successfully. IMPORTANT: If the user requested MULTIPLE actions (e.g. create a collection AND add a document), YOU MUST output your next tool call NOW. If ALL actions are fully complete, respond naturally as Queen Bee (e.g., 'I have created the collection for you!'). DO NOT explain your logic, do not say 'task complete', and do not repeat these instructions."
                
                messages.append({
                    "role": "user",
                    "content": nudge
                })
                
            else:
                yield {"type": "answer", "content": response_message.content or "I'm sorry, my mind went blank for a second. Could you repeat that?"}
                return
                
        yield {"type": "answer", "content": "I hit my action limit for this request. Please try breaking it into smaller steps."}
