from datetime import datetime, timezone
import redis
from ..core.config import settings

# Create Redis client (Upstash requires TLS)
# Use lazy connection to avoid blocking on startup
redis_client = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    ssl_cert_reqs=None,  # Required for Upstash
    socket_connect_timeout=5,
    socket_timeout=5
)

def get_ai_usage_key(user_id: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"ai_usage:{user_id}:{today}"

def check_ai_rate_limit(user_id: str) -> tuple[bool, int, int]:
    key = get_ai_usage_key(user_id)
    limit = settings.AI_RATE_LIMIT_PER_DAY

    try:
        current = redis_client.get(key)
        current_count = int(current) if current else 0

        return (current_count < limit, current_count, limit)
    except Exception:
        # If Redis is unavailable, allow the request (fail open)
        return (True, 0, limit)

def increment_ai_usage(user_id: str) -> int:
    key = get_ai_usage_key(user_id)

    try:
        pipe = redis_client.pipeline()
        pipe.incr(key)
        # Expire at midnight UTC
        pipe.expire(key, 86400)
        results = pipe.execute()
        return results[0]
    except Exception:
        # If Redis is unavailable, just return 0
        return 0

def get_remaining_ai_uses(user_id: str) -> int:
    is_allowed, current_count, limit = check_ai_rate_limit(user_id)
    return max(0, limit - current_count)