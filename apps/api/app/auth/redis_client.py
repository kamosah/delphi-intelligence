"""
Redis client configuration for session management
"""

from datetime import timedelta
import json
from typing import Any

import redis.asyncio as aioredis

from app.config import settings


class RedisManager:
    """Redis client for session and token management"""

    def __init__(self) -> None:
        """Initialize Redis manager (connection is created lazily)"""
        self._redis: aioredis.Redis | None = None
        self._redis_url = settings.redis_url

    @property
    def redis(self) -> aioredis.Redis:
        """Get Redis connection, creating it lazily on first access"""
        if self._redis is None:
            self._redis = aioredis.from_url(self._redis_url, decode_responses=True)
        return self._redis

    async def set_session(
        self, key: str, value: dict[str, Any], expire: timedelta = timedelta(hours=24)
    ) -> bool:
        """
        Store session data in Redis

        Args:
            key: Session key
            value: Session data to store
            expire: Expiration time

        Returns:
            True if successful
        """
        try:
            serialized_value = json.dumps(value)
            await self.redis.setex(key, expire, serialized_value)
            return True
        except Exception:
            return False

    async def get_session(self, key: str) -> dict[str, Any] | None:
        """
        Retrieve session data from Redis

        Args:
            key: Session key

        Returns:
            Session data or None if not found
        """
        try:
            value = await self.redis.get(key)
            if value:
                data: dict[str, Any] = json.loads(value)
                return data
            return None
        except Exception:
            return None

    async def delete_session(self, key: str) -> bool:
        """
        Delete session data from Redis

        Args:
            key: Session key

        Returns:
            True if successful
        """
        try:
            await self.redis.delete(key)
            return True
        except Exception:
            return False

    async def blacklist_token(self, token: str, expire: timedelta) -> bool:
        """
        Add token to blacklist

        Args:
            token: JWT token to blacklist
            expire: Expiration time for blacklist entry

        Returns:
            True if successful
        """
        try:
            await self.redis.setex(f"blacklist:{token}", expire, "1")
            return True
        except Exception:
            return False

    async def is_token_blacklisted(self, token: str) -> bool:
        """
        Check if token is blacklisted

        Args:
            token: JWT token to check

        Returns:
            True if blacklisted
        """
        try:
            result = await self.redis.get(f"blacklist:{token}")
            return result is not None
        except Exception:
            return False

    async def store_refresh_token(
        self, user_id: str, token: str, expire: timedelta = timedelta(days=30)
    ) -> bool:
        """
        Store refresh token for user

        Args:
            user_id: User ID
            token: Refresh token
            expire: Expiration time

        Returns:
            True if successful
        """
        try:
            await self.redis.setex(f"refresh_token:{user_id}", expire, token)
            return True
        except Exception:
            return False

    async def get_refresh_token(self, user_id: str) -> str | None:
        """
        Get stored refresh token for user

        Args:
            user_id: User ID

        Returns:
            Refresh token or None if not found
        """
        try:
            result = await self.redis.get(f"refresh_token:{user_id}")
            return str(result) if result else None
        except Exception:
            return None

    async def revoke_refresh_token(self, user_id: str) -> bool:
        """
        Revoke refresh token for user

        Args:
            user_id: User ID

        Returns:
            True if successful
        """
        try:
            await self.redis.delete(f"refresh_token:{user_id}")
            return True
        except Exception:
            return False

    async def store_sse_token(
        self, token: str, user_id: str, expire: timedelta = timedelta(minutes=5)
    ) -> bool:
        """
        Store SSE token in Redis for verification and revocation.

        Args:
            token: SSE token to store
            user_id: User ID associated with the token
            expire: Token expiration time (default: 5 minutes)

        Returns:
            True if successful
        """
        try:
            # Store token -> user_id mapping for verification
            await self.redis.setex(f"sse_token:{token}", expire, user_id)
            # Also add to user's token set for bulk revocation
            await self.redis.sadd(f"sse_tokens_by_user:{user_id}", token)
            # Set expiry on the user's token set (cleanup old entries)
            await self.redis.expire(f"sse_tokens_by_user:{user_id}", expire)
            return True
        except Exception:
            return False

    async def verify_sse_token(self, token: str) -> str | None:
        """
        Verify SSE token exists in Redis and return associated user_id.

        Args:
            token: SSE token to verify

        Returns:
            User ID if token is valid, None otherwise
        """
        try:
            result = await self.redis.get(f"sse_token:{token}")
            return str(result) if result else None
        except Exception:
            return None

    async def revoke_sse_token(self, token: str) -> bool:
        """
        Revoke a specific SSE token.

        Args:
            token: SSE token to revoke

        Returns:
            True if successful
        """
        try:
            # Get user_id before deleting
            user_id = await self.redis.get(f"sse_token:{token}")
            await self.redis.delete(f"sse_token:{token}")
            # Remove from user's token set
            if user_id:
                await self.redis.srem(f"sse_tokens_by_user:{user_id}", token)
            return True
        except Exception:
            return False

    async def revoke_all_sse_tokens(self, user_id: str) -> bool:
        """
        Revoke all SSE tokens for a user (called on logout/password change).

        Args:
            user_id: User ID

        Returns:
            True if successful
        """
        try:
            # Get all tokens for this user
            tokens = await self.redis.smembers(f"sse_tokens_by_user:{user_id}")
            if tokens:
                # Delete all token keys
                keys_to_delete = [f"sse_token:{token}" for token in tokens]
                await self.redis.delete(*keys_to_delete)
            # Delete the user's token set
            await self.redis.delete(f"sse_tokens_by_user:{user_id}")
            return True
        except Exception:
            return False

    async def close(self) -> None:
        """Close Redis connection if it was created"""
        if self._redis is not None:
            await self._redis.close()


# Global Redis manager instance
redis_manager = RedisManager()
