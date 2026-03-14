import redis.asyncio as redis
import json
import logging
from typing import Optional, Any
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger(__name__)

# Shared asynchronous Redis client configured via application settings
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    decode_responses=True,
    socket_connect_timeout=1, # Fast fail if not running
)

# In-memory fallback for when Redis is dead
_memory_cache = {}

async def redis_healthcheck() -> None:
    """
    Perform a basic connectivity check against the Redis server.

    This function checks the health of the Redis server by pinging it
    and then closing the connection if the ping is successful.

    Raises an exception if the Redis connection is not established.
    """

    # Perform a basic connectivity check against the Redis server
    if await redis_client.ping():
        await redis_client.aclose()
        return

    raise Exception("Redis connection not established.")


async def cache_get(key: str):
    try:
        if await redis_client.exists(key):
            result = await redis_client.get(name=key)
            return json.loads(result)
    except Exception as e:
        logger.warning(f"Redis get failed ({e}), falling back to memory.")
    
    # Fallback to in-memory
    result = _memory_cache.get(key)
    if result:
        return json.loads(result)
    return None

async def cache_set(
        key: str,
        value: Any,
        expire_at: Optional[int] = None,
        expire_in: Optional[int] = None
) -> None:
    if isinstance(value, BaseModel):
        value = value.model_dump()
    
    val_json = json.dumps(value)

    # Try Redis
    try:
        await redis_client.set(key, val_json, keepttl=True)
        if expire_at is not None:
            await redis_client.expireat(name=key, when=expire_at)
        if expire_in is not None:
            await redis_client.expire(name=key, time=expire_in)
        return
    except Exception as e:
        raise Exception(f"Redis Set Failed: {e}")


async def cache_increment(key: str, expire_in: int) -> int:
    """
    Atomically increment a counter in Redis, setting expiry on first creation.

    :param key: The Redis key to increment.
    :param expire_in: TTL in seconds applied only when the key is first created.
    :return: The new counter value after increment.
    """
    try:
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, expire_in)
        return count
    except Exception as e:
        raise Exception(f"Redis Increment Failed: {e}")
