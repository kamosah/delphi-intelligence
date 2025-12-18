"""
Pydantic schemas for authentication
"""

from pydantic import BaseModel, EmailStr


class UserLogin(BaseModel):
    """Schema for user login request"""

    email: EmailStr
    password: str


class UserRegister(BaseModel):
    """Schema for user registration request"""

    email: EmailStr
    password: str
    full_name: str | None = None


class TokenResponse(BaseModel):
    """Schema for token response"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenRefresh(BaseModel):
    """Schema for token refresh request"""

    refresh_token: str


class UserProfile(BaseModel):
    """Schema for user profile"""

    id: str
    email: str
    full_name: str | None = None
    role: str = "member"
    is_active: bool = True
    avatar_url: str | None = None
    email_confirmed: bool = False


class PasswordReset(BaseModel):
    """Schema for password reset request"""

    email: EmailStr


class PasswordChange(BaseModel):
    """Schema for password change request"""

    current_password: str
    new_password: str


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""

    token: str
    new_password: str


class ResendVerification(BaseModel):
    """Schema for resending verification email"""

    email: EmailStr


class AuthError(BaseModel):
    """Schema for authentication error responses"""

    error_code: str
    message: str
    email: str | None = None
