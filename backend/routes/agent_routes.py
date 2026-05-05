import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from services.agent_service import AgentService
from typing import List
from services.auth_service import get_current_user
from fastapi_limiter.depends import RateLimiter

router = APIRouter(prefix="/agent", tags=["agent"])

# Dependency to get an authenticated Agent service
async def get_agent_service(auth=Depends(get_current_user)):
    user, token = auth
    return AgentService(token=token)

class Message(BaseModel):
    role: str  # "user" or "agent"
    content: str | None = ""

class AgentChatRequest(BaseModel):
    message: str = Field(..., max_length=5000)
    history: List[Message] = Field(default=[], max_items=50)

@router.post("/chat", dependencies=[Depends(RateLimiter(times=15, seconds=60))])
async def agent_chat(body: AgentChatRequest, auth=Depends(get_current_user), asv: AgentService = Depends(get_agent_service)):
    user, token = auth
    # Convert history to format agent expects
    history = [{"role": m.role, "content": m.content} for m in body.history]
    
    async def generate():
        async for event in asv.chat_generator(body.message, history, user.id):
            # Using \x1e (Record Separator) which is highly reliable for streaming
            yield (json.dumps(event) + "\x1e").encode('utf-8')

    return StreamingResponse(generate(), media_type="application/json-seq")
