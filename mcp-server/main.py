import os
import httpx
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

mcp = FastMCP("MindHive")

BACKEND_URL = os.getenv("MINDHIVE_BACKEND_URL", "http://localhost:8000")
BEARER_TOKEN = os.getenv("MINDHIVE_BEARER_TOKEN", "")

def get_headers():
    return {
        "Authorization": f"Bearer {BEARER_TOKEN}"
    }

@mcp.tool()
async def list_collections() -> dict:
    """List all collections in the MindHive knowledge base."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(
            f"{BACKEND_URL}/collections",
            headers=get_headers(),
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def list_documents() -> dict:
    """List all documents in the MindHive knowledge base."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(
            f"{BACKEND_URL}/documents/",
            headers=get_headers(),
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def query_document(doc_id: str, question: str) -> dict:
    """Ask a question about a specific document using RAG."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.post(
            f"{BACKEND_URL}/documents/{doc_id}/query",
            headers=get_headers(),
            json={"question": question}
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def query_collection(collection_id: str, question: str) -> dict:
    """Ask a question across all documents in a specific collection using RAG."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.post(
            f"{BACKEND_URL}/collections/{collection_id}/query",
            headers=get_headers(),
            json={"question": question}
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def get_document_summary(doc_id: str) -> dict:
    """Get the AI-generated summary of a specific document."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(
            f"{BACKEND_URL}/documents/{doc_id}/summary",
            headers=get_headers(),
        )
        response.raise_for_status()
        return response.json()

if __name__ == "__main__":
    mcp.run()
