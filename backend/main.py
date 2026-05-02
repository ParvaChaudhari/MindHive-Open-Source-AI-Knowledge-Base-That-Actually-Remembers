import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from routes import document_routes, query_routes, collection_routes, timeline_routes, agent_routes
from services.security_utils import sanitize_log

app = FastAPI(title="MindHive API")

# CORS Middleware
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Setup
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

# Include Routes
app.include_router(document_routes.router)
app.include_router(query_routes.router)
app.include_router(collection_routes.router)
app.include_router(timeline_routes.router)
app.include_router(agent_routes.router)

@app.get("/")
async def root():
    return {"message": "MindHive API is running", "status": "online"}

@app.get("/health")
async def health_check():
    try:
        # Simple query to check connection
        supabase.table("documents").select("id").limit(1).execute()
        return {"status": "connected", "database": "reachable"}
    except Exception as e:
        print(sanitize_log(f"[health_check] Database error: {e}"))
        return {"status": "error", "message": "Database connection failed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
