"""
Authentication dependencies and middleware for FastAPI
"""

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.jwt_handler import jwt_manager
from app.auth.redis_client import redis_manager
from supabase_client import get_user_client

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


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
) -> dict[str, Any] | None:
    """
    Optional authentication dependency - returns user if authenticated, None otherwise

    Args:
        credentials: Optional HTTP Bearer credentials

    Returns:
        User data from token or None if not authenticated
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_roles(*required_roles: str):
    """
    Dependency factory to require specific user roles

    Args:
        required_roles: Required user roles

    Returns:
        Dependency function that checks user roles
    """

    async def role_checker(
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        user_role = current_user.get("role", "member")
        if user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(required_roles)}",
            )
        return current_user

    return role_checker


# Common role-based dependencies
require_admin = require_roles("admin")
require_admin_or_member = require_roles("admin", "member")


def get_supabase_user_client(current_user: dict[str, Any] = Depends(get_current_user)):
    """
    Get Supabase client configured for the current user

    Args:
        current_user: Current authenticated user

    Returns:
        Supabase client with user context
    """
    # Get the original JWT token from Supabase (if available)
    supabase_token = current_user.get("supabase_token")
    return get_user_client(supabase_token)
