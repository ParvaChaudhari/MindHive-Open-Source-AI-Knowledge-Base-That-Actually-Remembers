from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from services.agent_service import AgentService
from typing import List
from services.auth_service import get_current_user
from services.security_utils import check_rate_limit

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

@router.post("/chat")
async def agent_chat(body: AgentChatRequest, auth=Depends(get_current_user), asv: AgentService = Depends(get_agent_service)):
    user, token = auth
    check_rate_limit(user.id)
    # Convert history to format agent expects
    history = [{"role": m.role, "content": m.content} for m in body.history]
    
    response = await asv.chat(body.message, history, user.id)
    
    return {
        "response": response,
        "role": "agent"
    }
