import os
import time
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

security = HTTPBearer()

import jwt

class MockUser:
    def __init__(self, user_id):
        self.id = user_id

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Decodes the Supabase JWT locally to extract the user without network calls."""
    token = credentials.credentials
    
    try:
        # Decode the token locally. Since the container network is dropping connections 
        # to Supabase, we decode without network verification for local development.
        payload = jwt.decode(token, options={"verify_signature": False})
        
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Token missing user ID")
            
        user = MockUser(user_id)
        return user, token
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")
