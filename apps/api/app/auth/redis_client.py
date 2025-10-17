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

    async def close(self) -> None:
        """Close Redis connection if it was created"""
        if self._redis is not None:
            await self._redis.close()


# Global Redis manager instance
redis_manager = RedisManager()
