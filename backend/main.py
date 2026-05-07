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
from exceptions import MindHiveException, mindhive_exception_handler, generic_exception_handler
import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Redis and Limiter
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    r = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(r)
    print(f"INFO:     Redis connection established at {redis_url}")
    
    yield
    
    # Shutdown: Close Redis connection
    await r.close()
    print("INFO:     Redis connection closed")

app = FastAPI(
    title="MindHive API", 
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

# Register Exception Handlers
app.add_exception_handler(MindHiveException, mindhive_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS Middleware
raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
# Sanitize: strip spaces and trailing slashes
allowed_origins = [origin.strip().rstrip("/") for origin in raw_origins if origin.strip()]

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
