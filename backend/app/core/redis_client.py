import redis.asyncio as aioredis
import json
from datetime import timedelta
from typing import Optional, Any, List
from functools import wraps

from .config import settings

try:
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    _REDIS_AVAILABLE = True
except Exception:
    redis_client = None
    _REDIS_AVAILABLE = False

async def get_cache(key: str):
    if not _REDIS_AVAILABLE or redis_client is None:
        return None
    try:
        value = await redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception:
        return None

async def set_cache(key: str, value, expire: int = 3600):
    if not _REDIS_AVAILABLE or redis_client is None:
        return
    try:
        await redis_client.setex(key, expire, json.dumps(value))
    except Exception:
        pass

async def delete_cache(key: str):
    if not _REDIS_AVAILABLE or redis_client is None: return
    try:
        await redis_client.delete(key)
    except Exception: pass

async def delete_cache_pattern(pattern: str):
    if not _REDIS_AVAILABLE or redis_client is None: return
    try:
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
    except Exception: pass

async def get_or_set_cache(key: str, fetch_func, expire: int = 3600):
    """Get value from cache or execute fetch_func and cache result"""
    cached = await get_cache(key)
    if cached is not None:
        return cached
    value = await fetch_func()
    await set_cache(key, value, expire)
    return value

async def cache_many(keys: List[str], values: List[Any], expire: int = 3600):
    """Cache multiple key-value pairs at once"""
    if not _REDIS_AVAILABLE or redis_client is None: return
    try:
        pipe = redis_client.pipeline()
        for key, value in zip(keys, values):
            pipe.setex(key, expire, json.dumps(value))
        await pipe.execute()
    except Exception: pass

async def get_many_cache(keys: List[str]) -> dict:
    """Get multiple cache values at once"""
    if not _REDIS_AVAILABLE or redis_client is None: return {}
    try:
        values = await redis_client.mget(keys)
        result = {}
        for key, value in zip(keys, values):
            if value:
                result[key] = json.loads(value)
        return result
    except Exception: return {}

async def increment_counter(key: str, amount: int = 1) -> int:
    """Increment a counter in Redis"""
    if not _REDIS_AVAILABLE or redis_client is None: return 0
    try:
        return await redis_client.incrby(key, amount)
    except Exception: return 0

async def get_counter(key: str) -> int:
    """Get counter value"""
    if not _REDIS_AVAILABLE or redis_client is None: return 0
    try:
        value = await redis_client.get(key)
        return int(value) if value else 0
    except Exception: return 0

async def set_counter(key: str, value: int):
    """Set counter value"""
    if not _REDIS_AVAILABLE or redis_client is None: return
    try:
        await redis_client.set(key, value)
    except Exception: pass

async def cache_exists(key: str) -> bool:
    """Check if a cache key exists"""
    if not _REDIS_AVAILABLE or redis_client is None: return False
    try:
        return await redis_client.exists(key) > 0
    except Exception: return False

async def get_cache_ttl(key: str) -> int:
    """Get time-to-live for a cache key"""
    if not _REDIS_AVAILABLE or redis_client is None: return -1
    try:
        return await redis_client.ttl(key)
    except Exception: return -1

def cache_result(expire: int = 3600, key_prefix: str = ""):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(kwargs)}"
            cached = await get_cache(cache_key)
            if cached is not None:
                return cached
            result = await func(*args, **kwargs)
            await set_cache(cache_key, result, expire)
            return result
        return wrapper
    return decorator

async def invalidate_user_cache(user_id: int):
    """Invalidate all cache entries for a specific user"""
    pattern = f"*user:{user_id}*"
    await delete_cache_pattern(pattern)

async def invalidate_dashboard_cache(user_id: int, role: str):
    """Invalidate dashboard cache for a user"""
    patterns = [
        f"dashboard:{role}:{user_id}*",
        f"stats:{role}:{user_id}*",
        f"activity:{user_id}*"
    ]
    for pattern in patterns:
        await delete_cache_pattern(pattern)