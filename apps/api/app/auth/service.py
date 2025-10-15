"""
Authentication service for handling user auth operations with Supabase
"""

from fastapi import HTTPException, status

from app.auth.jwt_handler import jwt_manager
from app.auth.redis_client import redis_manager
from app.auth.schemas import TokenResponse, UserProfile
from app.supabase_client import get_admin_client, get_user_client


class AuthService:
    """Service class for authentication operations"""

    def __init__(self) -> None:
        """Initialize auth service"""
        self.admin_client = get_admin_client()

    async def register_user(
        self, email: str, password: str, full_name: str | None = None
    ) -> UserProfile:
        """
        Register a new user with Supabase Auth

        Args:
            email: User email
            password: User password
            full_name: Optional full name

        Returns:
            User profile data

        Raises:
            HTTPException: If registration fails
        """
        try:
            # Check if user already exists (even if unverified)
            try:
                users_response = self.admin_client.auth.admin.list_users()
                # Handle both list and object response types
                users_list = (
                    users_response if isinstance(users_response, list) else users_response.data
                )
                if users_list:
                    for user in users_list:
                        if user.email == email:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="User with this email already exists",
                            )
            except HTTPException:
                raise
            except Exception:
                # If we can't check, proceed with signup (Supabase will handle it)
                pass

            # Create user with Supabase Auth using sign_up
            user_client = get_user_client()
            response = user_client.auth.sign_up(
                {
                    "email": email,
                    "password": password,
                    "options": {"data": {"full_name": full_name} if full_name else {}},
                }
            )

            if not response.user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create user"
                )

            # Return user profile with email confirmation status
            # Supabase sends verification email automatically if enabled
            return UserProfile(
                id=response.user.id,
                email=response.user.email or email,
                full_name=full_name,
                role="member",
                is_active=True,
                email_confirmed=response.user.email_confirmed_at is not None,
            )

        except HTTPException:
            raise
        except Exception as e:
            error_msg = str(e).lower()
            if "already registered" in error_msg or "already exists" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists",
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Registration failed: {e!s}",
            )

    async def login_user(
        self, email: str, password: str, remember_me: bool = False
    ) -> TokenResponse:
        """
        Login user and return JWT tokens

        Args:
            email: User email
            password: User password
            remember_me: If True, extends session to 30 days; otherwise 24 hours

        Returns:
            Token response with access and refresh tokens

        Raises:
            HTTPException: If login fails
        """
        try:
            # Authenticate with Supabase
            user_client = get_user_client()
            response = user_client.auth.sign_in_with_password(
                {"email": email, "password": password}
            )

            if not response.user or not response.session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
                )

            user = response.user
            session = response.session

            # Check if email is verified (if email confirmation is required)
            # Note: This depends on Supabase Auth settings
            if not user.email_confirmed_at:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error_code": "email_not_verified",
                        "message": "Please verify your email address before logging in",
                        "email": user.email,
                    },
                )

            # Create our own JWT tokens
            token_data = {
                "sub": user.id,
                "email": user.email,
                "role": user.user_metadata.get("role", "member"),
                "supabase_token": session.access_token,  # Store Supabase token for API calls
            }

            # Set token expiration based on remember_me
            # Remember me: 30 days, otherwise: 24 hours
            token_expiry_hours = 720 if remember_me else 24  # 30 days = 720 hours

            access_token = jwt_manager.create_access_token(token_data)
            refresh_token = jwt_manager.create_refresh_token({"sub": user.id})

            # Store refresh token in Redis with appropriate TTL
            # Remember me: 30 days, otherwise: 24 hours
            import datetime

            ttl_seconds = token_expiry_hours * 3600
            ttl_timedelta = datetime.timedelta(seconds=ttl_seconds)
            await redis_manager.store_refresh_token(user.id, refresh_token, ttl_timedelta)

            # Store session data
            import datetime

            await redis_manager.set_session(
                f"session:{user.id}",
                {
                    "user_id": user.id,
                    "email": user.email,
                    "login_time": datetime.datetime.now(datetime.UTC).isoformat(),
                    "supabase_session": session.access_token,
                },
            )

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=ttl_seconds,  # 24 hours or 30 days based on remember_me
            )

        except HTTPException:
            raise
        except Exception as e:
            # Check if it's an authentication error from Supabase
            error_msg = str(e).lower()
            if (
                "invalid login credentials" in error_msg
                or "invalid" in error_msg
                or "credentials" in error_msg
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Login failed: {e!s}"
            )

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        """
        Refresh access token using refresh token

        Args:
            refresh_token: Valid refresh token

        Returns:
            New token response

        Raises:
            HTTPException: If refresh fails
        """
        try:
            # Verify refresh token
            payload = jwt_manager.verify_token(refresh_token)
            if not payload or payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
                )

            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token: missing user ID",
                )

            # Check if stored refresh token matches
            stored_token = await redis_manager.get_refresh_token(user_id)
            if stored_token != refresh_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token not found or expired",
                )

            # Get user session data
            session_data = await redis_manager.get_session(f"session:{user_id}")
            if not session_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired"
                )

            # Create new access token
            token_data = {
                "sub": user_id,
                "email": session_data["email"],
                "role": "member",  # You might want to fetch this from database
                "supabase_token": session_data.get("supabase_session"),
            }

            access_token = jwt_manager.create_access_token(token_data)
            new_refresh_token = jwt_manager.create_refresh_token({"sub": user_id})

            # Update stored refresh token
            await redis_manager.store_refresh_token(user_id, new_refresh_token)

            return TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                expires_in=3600 * 24,  # 24 hours
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Token refresh failed: {e!s}",
            )

    async def logout_user(self, user_id: str, access_token: str) -> bool:
        """
        Logout user and invalidate tokens

        Args:
            user_id: User ID
            access_token: Current access token

        Returns:
            True if successful
        """
        try:
            from datetime import UTC, datetime

            # Blacklist the access token
            token_expiry = jwt_manager.get_token_expiry(access_token)
            if token_expiry:
                expire_delta = token_expiry - datetime.now(UTC)
                await redis_manager.blacklist_token(access_token, expire_delta)

            # Revoke refresh token
            await redis_manager.revoke_refresh_token(user_id)

            # Delete session
            await redis_manager.delete_session(f"session:{user_id}")

            return True

        except Exception:
            return False

    async def get_user_profile(self, user_id: str) -> UserProfile:
        """
        Get user profile by ID

        Args:
            user_id: User ID (Supabase Auth user ID)

        Returns:
            User profile

        Raises:
            HTTPException: If user not found
        """
        try:
            # Get user from Supabase Auth to get email confirmation status
            auth_response = self.admin_client.auth.admin.get_user_by_id(user_id)

            if not auth_response.user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            auth_user = auth_response.user

            # Try to get additional profile data from users table
            profile_response = (
                self.admin_client.table("users").select("*").eq("auth_user_id", user_id).execute()
            )

            # Use profile data if available, otherwise use auth data
            if profile_response.data:
                user_data = profile_response.data[0]
                return UserProfile(
                    id=user_data["id"],
                    email=auth_user.email or user_data["email"],
                    full_name=user_data.get("full_name")
                    or auth_user.user_metadata.get("full_name"),
                    role=user_data.get("role", "member"),
                    is_active=user_data.get("is_active", True),
                    avatar_url=user_data.get("avatar_url"),
                    email_confirmed=auth_user.email_confirmed_at is not None,
                )
            # Fall back to auth user data only
            return UserProfile(
                id=auth_user.id,
                email=auth_user.email or "",
                full_name=auth_user.user_metadata.get("full_name"),
                role="member",
                is_active=True,
                email_confirmed=auth_user.email_confirmed_at is not None,
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user profile: {e!s}",
            )

    async def resend_verification_email(self, email: str) -> bool:
        """
        Resend verification email to user

        Args:
            email: User email address

        Returns:
            True if email sent successfully

        Raises:
            HTTPException: If resend fails
        """
        try:
            user_client = get_user_client()
            # Supabase resend verification
            response = user_client.auth.resend({"type": "signup", "email": email})

            if not response:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to resend verification email",
                )

            return True

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to resend verification email: {e!s}",
            )

    async def request_password_reset(self, email: str) -> bool:
        """
        Request password reset email

        Args:
            email: User email address

        Returns:
            True if email sent successfully (always returns True for security)

        Raises:
            HTTPException: If request fails
        """
        try:
            user_client = get_user_client()
            # Supabase password reset request with redirect URL
            user_client.auth.reset_password_email(
                email, {"redirect_to": "http://localhost:3000/auth/callback"}
            )

            # Always return True to prevent email enumeration
            return True

        except Exception:
            # Still return True for security
            return True

    async def exchange_supabase_token(self, supabase_access_token: str) -> TokenResponse:
        """
        Exchange Supabase access token for our backend tokens
        Used for auto-login after email verification

        Args:
            supabase_access_token: Access token from Supabase verification callback

        Returns:
            Our backend JWT tokens

        Raises:
            HTTPException: If token exchange fails
        """
        try:
            # Use Supabase token to get user info
            user_client = get_user_client()
            # Set the Supabase session
            user_client.auth.set_session(supabase_access_token, supabase_access_token)

            # Get the authenticated user
            user_response = user_client.auth.get_user()
            if not user_response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Supabase token",
                )

            user = user_response.user

            # Create our own JWT tokens
            token_data = {
                "sub": user.id,
                "email": user.email,
                "role": user.user_metadata.get("role", "member"),
                "supabase_token": supabase_access_token,
            }

            access_token = jwt_manager.create_access_token(token_data)
            refresh_token = jwt_manager.create_refresh_token({"sub": user.id})

            # Store refresh token in Redis with 24 hour TTL (default)
            import datetime

            await redis_manager.store_refresh_token(user.id, refresh_token)

            # Store session data
            await redis_manager.set_session(
                f"session:{user.id}",
                {
                    "user_id": user.id,
                    "email": user.email,
                    "login_time": datetime.datetime.now(datetime.UTC).isoformat(),
                    "supabase_session": supabase_access_token,
                },
            )

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=3600 * 24,  # 24 hours
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Token exchange failed: {e!s}",
            )

    async def confirm_password_reset(self, token: str, new_password: str) -> bool:
        """
        Confirm password reset with token

        Args:
            token: Password reset token (Supabase access token from password reset email)
            new_password: New password

        Returns:
            True if password reset successful

        Raises:
            HTTPException: If reset fails
        """
        try:
            user_client = get_user_client()

            # Set the access token from the password reset link
            # This creates an authenticated session for the password update
            user_client.auth.set_session(token, token)

            # Update password using the authenticated session
            response = user_client.auth.update_user({"password": new_password})

            if not response.user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired reset token",
                )

            return True

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to reset password: {e!s}",
            )


# Global auth service instance
auth_service = AuthService()
