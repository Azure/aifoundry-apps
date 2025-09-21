"""
Rate limiting service for Azure OpenAI API calls
"""
import time
import redis
from typing import Optional
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        """
        Initialize rate limiter with Redis backend (fallback to memory)
        
        Args:
            redis_url: Redis connection URL
        """
        self.redis_client = None
        self._memory_store = {}
        
        # Only try Redis if we're not on localhost (production)
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            logger.info("Rate limiter initialized with Redis")
        except Exception as e:
            logger.info(f"Using in-memory rate limiting for local development: {e}")
            self.redis_client = None
    
    def _get_key(self, identifier: str, endpoint: str) -> str:
        """Generate Redis key for rate limiting"""
        return f"rate_limit:{identifier}:{endpoint}"
    
    def _memory_check(self, key: str, limit: int, window: int) -> bool:
        """In-memory rate limiting fallback"""
        current_time = time.time()
        
        if key not in self._memory_store:
            self._memory_store[key] = []
        
        # Clean old entries
        self._memory_store[key] = [
            timestamp for timestamp in self._memory_store[key]
            if current_time - timestamp < window
        ]
        
        # Check if under limit
        if len(self._memory_store[key]) >= limit:
            return False
        
        # Add current request
        self._memory_store[key].append(current_time)
        return True
    
    def is_allowed(self, identifier: str, endpoint: str, limit: int = 10, window: int = 3600) -> bool:
        """
        Check if request is allowed under rate limit
        
        Args:
            identifier: Unique identifier (IP, user ID, etc.)
            endpoint: API endpoint being called
            limit: Maximum requests allowed in window
            window: Time window in seconds (default: 1 hour)
            
        Returns:
            True if request is allowed, False otherwise
        """
        key = self._get_key(identifier, endpoint)
        
        if self.redis_client:
            try:
                # Use Redis for distributed rate limiting
                current_time = int(time.time())
                window_start = current_time - window
                
                # Use Redis sorted set for sliding window
                pipe = self.redis_client.pipeline()
                
                # Remove old entries
                pipe.zremrangebyscore(key, 0, window_start)
                
                # Count current requests
                pipe.zcard(key)
                
                # Add current request
                pipe.zadd(key, {str(current_time): current_time})
                
                # Set expiration
                pipe.expire(key, window)
                
                results = pipe.execute()
                current_count = results[1]
                
                return current_count < limit
                
            except Exception as e:
                logger.error(f"Redis error, falling back to memory: {e}")
                return self._memory_check(key, limit, window)
        else:
            return self._memory_check(key, limit, window)
    
    def get_remaining_requests(self, identifier: str, endpoint: str, limit: int = 10, window: int = 3600) -> int:
        """Get remaining requests for identifier"""
        key = self._get_key(identifier, endpoint)
        
        if self.redis_client:
            try:
                current_time = int(time.time())
                window_start = current_time - window
                
                # Clean old entries and count
                self.redis_client.zremrangebyscore(key, 0, window_start)
                current_count = self.redis_client.zcard(key)
                
                return max(0, limit - current_count)
            except Exception as e:
                logger.error(f"Redis error getting remaining requests: {e}")
                return limit  # Assume full limit if Redis fails
        else:
            # Memory fallback
            current_time = time.time()
            if key in self._memory_store:
                self._memory_store[key] = [
                    timestamp for timestamp in self._memory_store[key]
                    if current_time - timestamp < window
                ]
                current_count = len(self._memory_store[key])
                return max(0, limit - current_count)
            return limit

# Global rate limiter instance
rate_limiter = RateLimiter()

def check_azure_openai_rate_limit(request, endpoint: str = "azure_openai") -> None:
    """
    Check rate limit for Azure OpenAI API calls
    Only applies rate limiting on aifoundry.app, not on localhost
    
    Args:
        request: FastAPI request object
        endpoint: Specific endpoint being called
        
    Raises:
        HTTPException: If rate limit exceeded
    """
    # Get the host from the request
    host = request.headers.get("host", "").lower()
    
    # Only apply rate limiting on aifoundry.app, not on localhost
    if "aifoundry.app" not in host:
        return  # Skip rate limiting for local development
    
    # Get client identifier (IP address)
    client_ip = request.client.host if request.client else "unknown"
    
    # Rate limit: 10 requests per hour for Azure OpenAI calls
    if not rate_limiter.is_allowed(client_ip, endpoint, limit=10, window=3600):
        remaining = rate_limiter.get_remaining_requests(client_ip, endpoint, limit=10, window=3600)
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "message": "Too many Azure OpenAI API requests. Please try again later.",
                "retry_after": 3600,
                "remaining_requests": remaining,
                "limit": 10,
                "window": "1 hour"
            }
        )
