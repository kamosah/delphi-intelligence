"""
Tests for Redis client functionality
"""

from datetime import timedelta
from unittest.mock import AsyncMock, patch

import pytest

from app.auth.redis_client import RedisManager


class TestRedisManager:
    """Test cases for Redis session management"""

    @pytest.fixture()
    async def redis_manager(self):
        """Create Redis manager for testing"""
        with patch("app.auth.redis_client.aioredis") as mock_redis:
            mock_client = AsyncMock()
            mock_redis.from_url.return_value = mock_client

            manager = RedisManager()
            manager._redis = mock_client  # Set the internal cached connection
            yield manager, mock_client

    @pytest.mark.asyncio()
    async def test_set_session_success(self, redis_manager):
        """Test successful session storage"""
        manager, mock_client = redis_manager
        mock_client.setex.return_value = True

        session_data = {"user_id": "123", "email": "test@example.com"}
        result = await manager.set_session("session:123", session_data)

        assert result is True
        mock_client.setex.assert_called_once()

    @pytest.mark.asyncio()
    async def test_set_session_failure(self, redis_manager):
        """Test session storage failure"""
        manager, mock_client = redis_manager
        mock_client.setex.side_effect = Exception("Redis error")

        session_data = {"user_id": "123"}
        result = await manager.set_session("session:123", session_data)

        assert result is False

    @pytest.mark.asyncio()
    async def test_get_session_success(self, redis_manager):
        """Test successful session retrieval"""
        manager, mock_client = redis_manager
        session_data = {"user_id": "123", "email": "test@example.com"}
        mock_client.get.return_value = '{"user_id": "123", "email": "test@example.com"}'

        result = await manager.get_session("session:123")

        assert result == session_data
        mock_client.get.assert_called_once_with("session:123")

    @pytest.mark.asyncio()
    async def test_get_session_not_found(self, redis_manager):
        """Test session retrieval when session doesn't exist"""
        manager, mock_client = redis_manager
        mock_client.get.return_value = None

        result = await manager.get_session("session:nonexistent")

        assert result is None

    @pytest.mark.asyncio()
    async def test_get_session_failure(self, redis_manager):
        """Test session retrieval failure"""
        manager, mock_client = redis_manager
        mock_client.get.side_effect = Exception("Redis error")

        result = await manager.get_session("session:123")

        assert result is None

    @pytest.mark.asyncio()
    async def test_delete_session_success(self, redis_manager):
        """Test successful session deletion"""
        manager, mock_client = redis_manager
        mock_client.delete.return_value = 1

        result = await manager.delete_session("session:123")

        assert result is True
        mock_client.delete.assert_called_once_with("session:123")

    @pytest.mark.asyncio()
    async def test_delete_session_failure(self, redis_manager):
        """Test session deletion failure"""
        manager, mock_client = redis_manager
        mock_client.delete.side_effect = Exception("Redis error")

        result = await manager.delete_session("session:123")

        assert result is False

    @pytest.mark.asyncio()
    async def test_blacklist_token_success(self, redis_manager):
        """Test successful token blacklisting"""
        manager, mock_client = redis_manager
        mock_client.setex.return_value = True

        token = "test.jwt.token"
        expire = timedelta(hours=1)
        result = await manager.blacklist_token(token, expire)

        assert result is True
        mock_client.setex.assert_called_once_with(f"blacklist:{token}", expire, "1")

    @pytest.mark.asyncio()
    async def test_is_token_blacklisted_true(self, redis_manager):
        """Test checking if token is blacklisted (true case)"""
        manager, mock_client = redis_manager
        mock_client.get.return_value = "1"

        token = "test.jwt.token"
        result = await manager.is_token_blacklisted(token)

        assert result is True
        mock_client.get.assert_called_once_with(f"blacklist:{token}")

    @pytest.mark.asyncio()
    async def test_is_token_blacklisted_false(self, redis_manager):
        """Test checking if token is blacklisted (false case)"""
        manager, mock_client = redis_manager
        mock_client.get.return_value = None

        token = "test.jwt.token"
        result = await manager.is_token_blacklisted(token)

        assert result is False

    @pytest.mark.asyncio()
    async def test_store_refresh_token_success(self, redis_manager):
        """Test successful refresh token storage"""
        manager, mock_client = redis_manager
        mock_client.setex.return_value = True

        user_id = "user123"
        token = "refresh.token.here"
        result = await manager.store_refresh_token(user_id, token)

        assert result is True
        mock_client.setex.assert_called_once_with(
            f"refresh_token:{user_id}", timedelta(days=30), token
        )

    @pytest.mark.asyncio()
    async def test_get_refresh_token_success(self, redis_manager):
        """Test successful refresh token retrieval"""
        manager, mock_client = redis_manager
        expected_token = "refresh.token.here"
        mock_client.get.return_value = expected_token

        user_id = "user123"
        result = await manager.get_refresh_token(user_id)

        assert result == expected_token
        mock_client.get.assert_called_once_with(f"refresh_token:{user_id}")

    @pytest.mark.asyncio()
    async def test_revoke_refresh_token_success(self, redis_manager):
        """Test successful refresh token revocation"""
        manager, mock_client = redis_manager
        mock_client.delete.return_value = 1

        user_id = "user123"
        result = await manager.revoke_refresh_token(user_id)

        assert result is True
        mock_client.delete.assert_called_once_with(f"refresh_token:{user_id}")

    @pytest.mark.asyncio()
    async def test_close_connection(self, redis_manager):
        """Test closing Redis connection"""
        manager, mock_client = redis_manager

        await manager.close()

        mock_client.close.assert_called_once()

    @pytest.mark.asyncio()
    async def test_store_sse_token_success(self, redis_manager):
        """Test successful SSE token storage"""
        manager, mock_client = redis_manager
        mock_client.setex.return_value = True
        mock_client.sadd.return_value = 1
        mock_client.expire.return_value = True

        token = "sse.token.here"
        user_id = "user123"
        expire = timedelta(minutes=5)
        result = await manager.store_sse_token(token, user_id, expire)

        assert result is True
        mock_client.setex.assert_called_once_with(f"sse_token:{token}", expire, user_id)
        mock_client.sadd.assert_called_once_with(f"sse_tokens_by_user:{user_id}", token)
        mock_client.expire.assert_called_once_with(f"sse_tokens_by_user:{user_id}", expire)

    @pytest.mark.asyncio()
    async def test_store_sse_token_failure(self, redis_manager):
        """Test SSE token storage failure"""
        manager, mock_client = redis_manager
        mock_client.setex.side_effect = Exception("Redis error")

        token = "sse.token.here"
        user_id = "user123"
        result = await manager.store_sse_token(token, user_id)

        assert result is False

    @pytest.mark.asyncio()
    async def test_verify_sse_token_success(self, redis_manager):
        """Test successful SSE token verification"""
        manager, mock_client = redis_manager
        user_id = "user123"
        mock_client.get.return_value = user_id

        token = "sse.token.here"
        result = await manager.verify_sse_token(token)

        assert result == user_id
        mock_client.get.assert_called_once_with(f"sse_token:{token}")

    @pytest.mark.asyncio()
    async def test_verify_sse_token_not_found(self, redis_manager):
        """Test SSE token verification when token doesn't exist"""
        manager, mock_client = redis_manager
        mock_client.get.return_value = None

        token = "nonexistent.token"
        result = await manager.verify_sse_token(token)

        assert result is None

    @pytest.mark.asyncio()
    async def test_revoke_sse_token_success(self, redis_manager):
        """Test successful SSE token revocation"""
        manager, mock_client = redis_manager
        user_id = "user123"
        mock_client.get.return_value = user_id
        mock_client.delete.return_value = 1
        mock_client.srem.return_value = 1

        token = "sse.token.here"
        result = await manager.revoke_sse_token(token)

        assert result is True
        mock_client.get.assert_called_once_with(f"sse_token:{token}")
        mock_client.delete.assert_called_once_with(f"sse_token:{token}")
        mock_client.srem.assert_called_once_with(f"sse_tokens_by_user:{user_id}", token)

    @pytest.mark.asyncio()
    async def test_revoke_all_sse_tokens_success(self, redis_manager):
        """Test successful revocation of all SSE tokens for a user"""
        manager, mock_client = redis_manager
        user_id = "user123"
        tokens = {"token1", "token2", "token3"}
        mock_client.smembers.return_value = tokens
        mock_client.delete.return_value = 3

        result = await manager.revoke_all_sse_tokens(user_id)

        assert result is True
        mock_client.smembers.assert_called_once_with(f"sse_tokens_by_user:{user_id}")
        # Verify delete was called for token keys (order doesn't matter for sets)
        assert mock_client.delete.call_count == 2
        # First call should be for the token keys
        first_call_args = set(mock_client.delete.call_args_list[0][0])
        expected_keys = {"sse_token:token1", "sse_token:token2", "sse_token:token3"}
        assert first_call_args == expected_keys

    @pytest.mark.asyncio()
    async def test_revoke_all_sse_tokens_no_tokens(self, redis_manager):
        """Test revoking SSE tokens when user has no tokens"""
        manager, mock_client = redis_manager
        user_id = "user123"
        mock_client.smembers.return_value = set()
        mock_client.delete.return_value = 1

        result = await manager.revoke_all_sse_tokens(user_id)

        assert result is True
        # Only the user's token set should be deleted
        mock_client.delete.assert_called_once_with(f"sse_tokens_by_user:{user_id}")
