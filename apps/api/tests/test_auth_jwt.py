"""
Tests for JWT token handling
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from app.auth.jwt_handler import jwt_manager


class TestJWTManager:
    """Test cases for JWT token management"""

    def test_create_access_token(self):
        """Test access token creation"""
        data = {"sub": "user123", "email": "test@example.com", "role": "member"}
        token = jwt_manager.create_access_token(data)

        assert isinstance(token, str)
        assert len(token) > 0

        # Verify token can be decoded
        payload = jwt_manager.verify_token(token)
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"
        assert payload["role"] == "member"
        assert "exp" in payload
        assert "iat" in payload

    def test_create_access_token_with_custom_expiry(self):
        """Test access token creation with custom expiration time"""
        data = {"sub": "user123"}
        expires_delta = timedelta(minutes=30)
        token = jwt_manager.create_access_token(data, expires_delta)

        assert isinstance(token, str)

        # Verify custom expiration
        expiry = jwt_manager.get_token_expiry(token)
        assert expiry is not None

        # Should expire in approximately 30 minutes (allowing for execution time)
        now = datetime.now(UTC)
        time_diff = expiry - now
        assert 29 <= time_diff.total_seconds() / 60 <= 30

    def test_create_refresh_token(self):
        """Test refresh token creation"""
        data = {"sub": "user123"}
        token = jwt_manager.create_refresh_token(data)

        assert isinstance(token, str)
        assert len(token) > 0

        # Verify token can be decoded
        payload = jwt_manager.verify_token(token)
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["type"] == "refresh"
        assert "exp" in payload
        assert "iat" in payload

    def test_verify_valid_token(self):
        """Test verification of valid token"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = jwt_manager.create_access_token(data)

        payload = jwt_manager.verify_token(token)
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"

    def test_verify_invalid_token(self):
        """Test verification of invalid token"""
        invalid_token = "invalid.token.here"
        payload = jwt_manager.verify_token(invalid_token)
        assert payload is None

    def test_verify_expired_token(self):
        """Test verification of expired token"""
        data = {"sub": "user123"}

        # Create token that expires immediately
        with patch("app.auth.jwt_handler.datetime") as mock_datetime:
            past_time = datetime.now(UTC) - timedelta(hours=2)
            mock_datetime.now.return_value = past_time
            mock_datetime.UTC = UTC

            token = jwt_manager.create_access_token(data, timedelta(seconds=1))

        # Verify token is expired
        payload = jwt_manager.verify_token(token)
        assert payload is None

    def test_decode_token_without_verification(self):
        """Test decoding token without signature verification"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = jwt_manager.create_access_token(data)

        payload = jwt_manager.decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"

    def test_get_token_expiry(self):
        """Test getting token expiration time"""
        data = {"sub": "user123"}
        token = jwt_manager.create_access_token(data)

        expiry = jwt_manager.get_token_expiry(token)
        assert expiry is not None
        assert isinstance(expiry, datetime)

        # Should be in the future
        assert expiry > datetime.now(UTC)

    def test_get_token_expiry_invalid_token(self):
        """Test getting expiry from invalid token"""
        expiry = jwt_manager.get_token_expiry("invalid.token")
        assert expiry is None
