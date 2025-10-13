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

            # Return user profile
            return UserProfile(
                id=response.user.id,
                email=response.user.email or email,
                full_name=full_name,
                role="member",
                is_active=True,
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

    async def login_user(self, email: str, password: str) -> TokenResponse:
        """
        Login user and return JWT tokens

        Args:
            email: User email
            password: User password

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

            # Create our own JWT tokens
            token_data = {
                "sub": user.id,
                "email": user.email,
                "role": user.user_metadata.get("role", "member"),
                "supabase_token": session.access_token,  # Store Supabase token for API calls
            }

            access_token = jwt_manager.create_access_token(token_data)
            refresh_token = jwt_manager.create_refresh_token({"sub": user.id})

            # Store refresh token in Redis
            await redis_manager.store_refresh_token(user.id, refresh_token)

            # Store session data
            await redis_manager.set_session(
                f"session:{user.id}",
                {
                    "user_id": user.id,
                    "email": user.email,
                    "login_time": session.created_at,
                    "supabase_session": session.access_token,
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
            # Blacklist the access token
            token_expiry = jwt_manager.get_token_expiry(access_token)
            if token_expiry:
                expire_delta = token_expiry - jwt_manager.datetime.now(jwt_manager.UTC)
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
            user_id: User ID

        Returns:
            User profile

        Raises:
            HTTPException: If user not found
        """
        try:
            # Get user from Supabase
            response = (
                self.admin_client.table("users").select("*").eq("auth_user_id", user_id).execute()
            )

            if not response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            user_data = response.data[0]
            return UserProfile(
                id=user_data["id"],
                email=user_data["email"],
                full_name=user_data.get("full_name"),
                role=user_data.get("role", "member"),
                is_active=user_data.get("is_active", True),
                avatar_url=user_data.get("avatar_url"),
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user profile: {e!s}",
            )


# Global auth service instance
auth_service = AuthService()
