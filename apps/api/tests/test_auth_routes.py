"""
Integration tests for authentication routes
"""

from unittest.mock import patch

from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture()
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture()
def mock_auth_service():
    """Mock authentication service"""
    with patch("app.routes.auth.auth_service") as mock:
        yield mock


class TestAuthRoutes:
    """Test cases for authentication routes"""

    async def test_register_success(self, client, mock_auth_service):
        """Test successful user registration"""
        # Mock the service response
        from app.auth.schemas import UserProfile
        from unittest.mock import AsyncMock

        mock_auth_service.register_user = AsyncMock(
            return_value=UserProfile(
                id="user123",
                email="test@example.com",
                full_name="Test User",
                role="member",
                is_active=True,
            )
        )

        response = client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "password123", "full_name": "Test User"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
        assert data["role"] == "member"

    def test_register_missing_email(self, client, mock_auth_service):
        """Test registration with missing email"""
        response = client.post(
            "/auth/register", json={"password": "password123", "full_name": "Test User"}
        )

        assert response.status_code == 422  # Validation error

    async def test_login_success(self, client, mock_auth_service):
        """Test successful user login"""
        # Mock the service response
        from app.auth.schemas import TokenResponse
        from unittest.mock import AsyncMock

        mock_auth_service.login_user = AsyncMock(
            return_value=TokenResponse(
                access_token="test.access.token",
                refresh_token="test.refresh.token",
                expires_in=3600,
            )
        )

        response = client.post(
            "/auth/login", json={"email": "test@example.com", "password": "password123"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "test.access.token"
        assert data["refresh_token"] == "test.refresh.token"
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 3600

    def test_login_invalid_credentials(self, client, mock_auth_service):
        """Test login with invalid credentials"""
        from fastapi import HTTPException, status

        mock_auth_service.login_user.side_effect = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

        response = client.post(
            "/auth/login", json={"email": "test@example.com", "password": "wrongpassword"}
        )

        assert response.status_code == 401

    async def test_refresh_token_success(self, client, mock_auth_service):
        """Test successful token refresh"""
        from app.auth.schemas import TokenResponse
        from unittest.mock import AsyncMock

        mock_auth_service.refresh_token = AsyncMock(
            return_value=TokenResponse(
                access_token="new.access.token", refresh_token="new.refresh.token", expires_in=3600
            )
        )

        response = client.post("/auth/refresh", json={"refresh_token": "valid.refresh.token"})

        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "new.access.token"
        assert data["refresh_token"] == "new.refresh.token"

    def test_refresh_token_invalid(self, client, mock_auth_service):
        """Test token refresh with invalid token"""
        from fastapi import HTTPException, status

        mock_auth_service.refresh_token.side_effect = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

        response = client.post("/auth/refresh", json={"refresh_token": "invalid.refresh.token"})

        assert response.status_code == 401

    @patch("app.middleware.auth.jwt_manager.verify_token")
    @patch("app.routes.auth.get_current_user")
    async def test_logout_success(
        self, mock_get_user, mock_verify_token, client, mock_auth_service
    ):
        """Test successful logout"""
        from unittest.mock import AsyncMock

        # Mock JWT verification to bypass middleware
        mock_verify_token.return_value = {"sub": "user123", "email": "test@example.com"}

        # Mock current user dependency
        mock_get_user.return_value = {"id": "user123", "email": "test@example.com"}
        mock_auth_service.logout_user = AsyncMock(return_value=True)

        response = client.post(
            "/auth/logout", headers={"Authorization": "Bearer valid.access.token"}
        )

        assert response.status_code == 204

    @patch("app.middleware.auth.jwt_manager.verify_token")
    @patch("app.routes.auth.get_current_user")
    async def test_get_current_user_profile_success(
        self, mock_get_user, mock_verify_token, client, mock_auth_service
    ):
        """Test getting current user profile"""
        from app.auth.schemas import UserProfile
        from unittest.mock import AsyncMock

        # Mock JWT verification to bypass middleware
        mock_verify_token.return_value = {"sub": "user123", "email": "test@example.com"}

        # Mock current user dependency
        mock_get_user.return_value = {"id": "user123", "email": "test@example.com"}

        mock_auth_service.get_user_profile = AsyncMock(
            return_value=UserProfile(
                id="user123",
                email="test@example.com",
                full_name="Test User",
                role="member",
                is_active=True,
            )
        )

        response = client.get("/auth/me", headers={"Authorization": "Bearer valid.access.token"})

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"

    def test_get_current_user_profile_unauthorized(self, client):
        """Test getting profile without authentication"""
        response = client.get("/auth/me")

        # Middleware returns 403 for missing/invalid token
        assert response.status_code == 403

    def test_forgot_password(self, client):
        """Test forgot password endpoint"""
        response = client.post("/auth/forgot-password", json={"email": "test@example.com"})

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    def test_verify_email(self, client):
        """Test email verification endpoint"""
        response = client.get("/auth/verify-email/test-token")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    async def test_resend_verification(self, client, mock_auth_service):
        """Test resend verification endpoint - no auth required"""
        from unittest.mock import AsyncMock

        mock_auth_service.resend_verification_email = AsyncMock(return_value=True)

        # This endpoint doesn't require authentication
        response = client.post("/auth/resend-verification", json={"email": "test@example.com"})

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
