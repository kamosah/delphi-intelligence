"""
JWT token handling utilities for authentication
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt as jose_jwt

from app.config import settings


class JWTManager:
    """JWT token management for authentication"""

    @staticmethod
    def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
        """
        Create a new access token

        Args:
            data: Data to encode in the token
            expires_delta: Optional custom expiration time

        Returns:
            Encoded JWT token
        """
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.now(UTC) + expires_delta
        else:
            expire = datetime.now(UTC) + timedelta(hours=settings.jwt_expiration_hours)

        to_encode.update({"exp": expire, "iat": datetime.now(UTC)})

        token: str = jose_jwt.encode(
            to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm
        )
        return token

    @staticmethod
    def create_refresh_token(data: dict[str, Any]) -> str:
        """
        Create a new refresh token (longer expiration)

        Args:
            data: Data to encode in the token

        Returns:
            Encoded JWT refresh token
        """
        to_encode = data.copy()
        expire = datetime.now(UTC) + timedelta(days=30)  # Refresh tokens last 30 days
        to_encode.update({"exp": expire, "iat": datetime.now(UTC), "type": "refresh"})

        token: str = jose_jwt.encode(
            to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm
        )
        return token

    @staticmethod
    def verify_token(token: str) -> dict[str, Any] | None:
        """
        Verify and decode a JWT token

        Args:
            token: JWT token to verify

        Returns:
            Decoded token payload or None if invalid
        """
        try:
            payload: dict[str, Any] = jose_jwt.decode(
                token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
            )
            return payload
        except JWTError:
            return None

    @staticmethod
    def decode_token(token: str) -> dict[str, Any] | None:
        """
        Decode a JWT token without verification (for inspection)

        Args:
            token: JWT token to decode

        Returns:
            Decoded token payload or None if invalid
        """
        try:
            payload: dict[str, Any] = jose_jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
                options={"verify_signature": False},
            )
            return payload
        except JWTError:
            return None

    @staticmethod
    def get_token_expiry(token: str) -> datetime | None:
        """
        Get the expiration time of a token

        Args:
            token: JWT token

        Returns:
            Expiration datetime or None if invalid
        """
        payload = JWTManager.decode_token(token)
        if payload and "exp" in payload:
            return datetime.fromtimestamp(payload["exp"], tz=UTC)
        return None


# Global JWT manager instance
jwt_manager = JWTManager()
