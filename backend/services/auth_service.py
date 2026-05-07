import os
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

# Initialize Supabase admin client (used to verify user tokens)
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

security = HTTPBearer()

class MockUser:
    def __init__(self, user_id):
        self.id = user_id

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validates the Supabase JWT by calling the Supabase Auth server.
    This is algorithm-agnostic and works for both HS256 and ES256 tokens.
    """
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        user = MockUser(response.user.id)
        return user, token
    except HTTPException:
        raise
    except Exception as e:
        print(f"Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")
