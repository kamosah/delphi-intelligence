"""Authentication helpers for testing.

This module provides JWT token generation and authentication utilities:
- AuthTestUser: Dataclass for test user data
- create_test_token: Generate FastAPI JWT tokens for authenticated requests
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from jose import jwt

from app.config import settings


@dataclass
class AuthTestUser:
    """Test user data for authentication.

    Note: Renamed from TestUser to avoid pytest collection warnings.
    Pytest attempts to collect any class starting with "Test" as a test class.

    Attributes:
        id: User UUID as string
        email: User email address
        full_name: User's full name
    """

    id: str
    email: str
    full_name: str


def create_test_token(
    user: AuthTestUser,
    expires_delta: timedelta | None = None,
) -> str:
    """Create FastAPI JWT token for test user.

    Generates a JWT token compatible with the FastAPI authentication system
    for use in integration tests. Tokens are signed with the application's
    JWT secret key and include user ID, email, and expiration time.

    Args:
        user: AuthTestUser with id, email, and full_name
        expires_delta: Token expiration time (default: 1 hour)

    Returns:
        Encoded JWT token string

    Usage:
        user = AuthTestUser(id="user-123", email="test@example.com", full_name="Test User")
        token = create_test_token(user)
        client.cookies.set("access_token", token)
    """
    expire = datetime.now(UTC) + (expires_delta or timedelta(hours=1))
    payload = {
        "sub": user.id,
        "email": user.email,
        "exp": expire,
    }
    token: str = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token
