"""
Authentication dependencies and middleware for FastAPI
"""

from typing import Annotated, Any

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.jwt_handler import jwt_manager
from app.auth.redis_client import redis_manager

# Security scheme for Bearer token authentication
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    """
    Dependency to get current authenticated user from JWT token

    Args:
        credentials: HTTP Bearer credentials

    Returns:
        User data from token

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials

    # Check if token is blacklisted
    if await redis_manager.is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify and decode token
    payload = jwt_manager.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user information from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # You can add additional verification here, such as:
    # - Checking if user still exists in database
    # - Checking if user is active
    # - Loading additional user data

    return {
        "id": user_id,
        "email": payload.get("email"),
        "role": payload.get("role", "member"),
        **payload,
    }


async def get_current_user_from_query(
    token: Annotated[str, Query(description="JWT access token for authentication")],
) -> dict[str, Any]:
    """
    Dependency to get current authenticated user from JWT token passed as query parameter.

    Used for Server-Sent Events (SSE) endpoints where custom headers are not supported by EventSource API.

    Args:
        token: JWT access token passed as query parameter

    Returns:
        User data from token

    Raises:
        HTTPException: If token is invalid or user not found
    """
    # Check if token is blacklisted
    if await redis_manager.is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    # Verify and decode token
    payload = jwt_manager.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    # Extract user information from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
        )

    return {
        "id": user_id,
        "email": payload.get("email"),
        "role": payload.get("role", "member"),
        **payload,
    }
