"""
Authentication routes for user registration, login, and token management
"""

from fastapi import APIRouter, Depends, status

from app.auth.dependencies import get_current_user
from app.auth.schemas import (
    PasswordReset,
    TokenRefresh,
    TokenResponse,
    UserLogin,
    UserProfile,
    UserRegister,
)
from app.auth.service import auth_service

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister) -> UserProfile:
    """
    Register a new user

    Args:
        user_data: User registration data

    Returns:
        Created user profile
    """
    return await auth_service.register_user(
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
    return await auth_service.login_user(email=credentials.email, password=credentials.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token_data: TokenRefresh) -> TokenResponse:
    """
    Refresh access token using refresh token

    Args:
        token_data: Refresh token data

    Returns:
        New JWT tokens
    """
    return await auth_service.refresh_token(token_data.refresh_token)


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
    await auth_service.logout_user(user_id, "")  # Empty token for now


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)) -> UserProfile:
    """
    Get current user profile

    Args:
        current_user: Current authenticated user

    Returns:
        User profile data
    """
    return await auth_service.get_user_profile(current_user["id"])


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(password_reset: PasswordReset) -> dict[str, str]:
    """
    Request password reset email

    Args:
        password_reset: Password reset request

    Returns:
        Success message
    """
    # This would typically trigger an email with a reset link
    # For now, return a simple success message
    return {"message": "Password reset email sent if account exists"}


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


@router.post("/resend-verification")
async def resend_verification(current_user: dict = Depends(get_current_user)) -> dict[str, str]:
    """
    Resend email verification

    Args:
        current_user: Current authenticated user

    Returns:
        Success message
    """
    # This would resend the verification email
    return {"message": "Verification email sent"}
