import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)
security = HTTPBearer()


import asyncio
import time

# Cache up to 1000 tokens for 5 minutes (300 seconds)
token_cache = {}
CACHE_TTL = 300

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    now = time.time()
    
    if token in token_cache:
        user, timestamp = token_cache[token]
        if now - timestamp < CACHE_TTL:
            return user
        else:
            del token_cache[token]

    try:
        response = await asyncio.to_thread(supabase.auth.get_user, token)
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        
        # Keep cache from growing infinitely
        if len(token_cache) > 1000:
            token_cache.clear()
            
        token_cache[token] = (response.user, now)
        return response.user
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Authentication failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )
