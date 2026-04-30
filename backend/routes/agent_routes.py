from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.agent_service import AgentService
from typing import List
from services.auth_service import get_current_user

router = APIRouter(prefix="/agent", tags=["agent"])
agent_service = AgentService()

class Message(BaseModel):
    role: str  # "user" or "agent"
    content: str | None = ""

class AgentChatRequest(BaseModel):
    message: str
    history: List[Message] = []

@router.post("/chat")
async def agent_chat(body: AgentChatRequest, user=Depends(get_current_user)):
    # Convert history to format agent expects
    history = [{"role": m.role, "content": m.content} for m in body.history]
    
    response = await agent_service.chat(body.message, history, user.id)
    
    return {
        "response": response,
        "role": "agent"
    }
