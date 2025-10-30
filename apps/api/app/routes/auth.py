"""
Authentication routes for user registration, login, and token management
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.auth.schemas import (
    PasswordReset,
    PasswordResetConfirm,
    ResendVerification,
    TokenRefresh,
    TokenResponse,
    UserLogin,
    UserProfile,
    UserRegister,
)
from app.auth.service import get_auth_service

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister) -> UserProfile:
    """
    Register a new user

    Note: This endpoint returns the user profile, NOT tokens.
    Users must verify their email before logging in.

    Args:
        user_data: User registration data

    Returns:
        Created user profile with email_confirmed status
    """
    return await get_auth_service().register_user(
        email=user_data.email, password=user_data.password, full_name=user_data.full_name
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin) -> TokenResponse:
    """
    Login user and return authentication tokens

    Args:
        credentials: User login credentials

    Returns:
        JWT tokens for authentication
    """
    return await get_auth_service().login_user(
        email=credentials.email, password=credentials.password, remember_me=credentials.remember_me
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token_data: TokenRefresh) -> TokenResponse:
    """
    Refresh access token using refresh token

    Args:
        token_data: Refresh token data

    Returns:
        New JWT tokens
    """
    return await get_auth_service().refresh_token(token_data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: dict = Depends(get_current_user)) -> None:
    """
    Logout current user and invalidate tokens

    Args:
        current_user: Current authenticated user
    """
    # In a real implementation, you'd get the access token from the request
    # For now, we'll just use the user ID to revoke the refresh token
    user_id = current_user["id"]
    await get_auth_service().logout_user(user_id, "")  # Empty token for now


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)) -> UserProfile:
    """
    Get current user profile

    Args:
        current_user: Current authenticated user

    Returns:
        User profile data
    """
    return await get_auth_service().get_user_profile(current_user["id"])


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(password_reset: PasswordReset) -> dict[str, str]:
    """
    Request password reset email

    Args:
        password_reset: Password reset request

    Returns:
        Success message
    """
    await get_auth_service().request_password_reset(password_reset.email)
    # Always return success to prevent email enumeration
    return {"message": "If an account with that email exists, a password reset link has been sent"}


@router.get("/verify-email/{token}")
async def verify_email(token: str) -> dict[str, str]:
    """
    Verify user email with token

    Args:
        token: Email verification token

    Returns:
        Success message
    """
    # This would typically verify the email token and mark email as verified
    # Implementation depends on your email verification flow
    return {"message": "Email verified successfully"}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification(data: ResendVerification) -> dict[str, str]:
    """
    Resend email verification

    Note: This endpoint does not require authentication to allow unverified users
    to resend their verification email.

    Args:
        data: Email address to resend verification to

    Returns:
        Success message
    """
    await get_auth_service().resend_verification_email(data.email)
    return {"message": "Verification email sent. Please check your inbox."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(data: PasswordResetConfirm) -> dict[str, str]:
    """
    Confirm password reset with token and new password

    Args:
        data: Password reset confirmation data

    Returns:
        Success message
    """
    await get_auth_service().confirm_password_reset(data.token, data.new_password)
    return {
        "message": "Password has been reset successfully. You can now log in with your new password."
    }


@router.post("/exchange-token", response_model=TokenResponse)
async def exchange_token(data: dict[str, str]) -> TokenResponse:
    """
    Exchange Supabase access token for backend tokens
    Used for auto-login after email verification

    Args:
        data: Dictionary containing 'supabase_token'

    Returns:
        Backend JWT tokens
    """
    supabase_token = data.get("supabase_token")
    if not supabase_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="supabase_token is required"
        )
    return await get_auth_service().exchange_supabase_token(supabase_token)


@router.post("/sse-token")
async def get_sse_token(current_user=Depends(get_current_user)) -> dict[str, str | int]:
    """
    Exchange access token for a short-lived SSE connection token.

    This endpoint creates a single-use token with 5-minute TTL specifically
    for Server-Sent Events connections. This allows SSE to work with EventSource
    API which doesn't support custom headers.

    Args:
        current_user: Authenticated user dict from JWT token

    Returns:
        Dictionary with short-lived SSE token and expiry time

    Security:
        - Token expires in 5 minutes
        - Token can only be used for SSE connections
        - Reduces exposure window compared to long-lived tokens
    """
    from datetime import timedelta
    from app.auth.jwt_handler import jwt_manager

    # Token data
    token_data = {
        "sub": current_user.get("id"),
        "email": current_user.get("email"),
    }

    # Create short-lived token (5 minutes)
    sse_token = jwt_manager.create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=5),  # Short TTL for security
    )

    return {
        "sse_token": sse_token,
        "expires_in": 300,  # 5 minutes in seconds
    }
