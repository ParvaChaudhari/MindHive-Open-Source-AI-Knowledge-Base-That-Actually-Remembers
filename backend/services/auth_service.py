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
    """Decodes and verifies the Supabase JWT."""
    token = credentials.credentials
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
    
    try:
        if jwt_secret:
            # PRODUCTION MODE: Strictly verify the signature and expiration
            # Supabase tokens use HS256 with the JWT Secret
            payload = jwt.decode(
                token, 
                jwt_secret, 
                algorithms=["HS256"],
                options={"verify_aud": False} # Supabase uses 'authenticated' as aud
            )
        else:
            # DEVELOPMENT MODE: Decode without verification if secret is missing
            print("WARNING: JWT signature verification is DISABLED. Set SUPABASE_JWT_SECRET for production.")
            payload = jwt.decode(token, options={"verify_signature": False})
        
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Token missing user ID")
            
        # Optional: Check if token is expired (jwt.decode does this automatically if 'exp' is present)
        
        user = MockUser(user_id)
        return user, token
    except jwt.ExpiredSignatureError:
        print(f"[{time.time()}] ❌ JWT Error: Token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        print(f"[{time.time()}] ❌ JWT Error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")
    except Exception as e:
        print(f"[{time.time()}] ❌ Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")
