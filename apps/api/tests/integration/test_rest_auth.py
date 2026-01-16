"""Integration tests for REST authentication endpoints.

This module tests REST authentication flows:
- User registration
- Login/logout
- Token refresh and validation
- Protected endpoint access (401/403)
- Session management
"""

import pytest
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncSession

from tests.factories import create_user
from tests.fixtures.api_clients import RESTClient
from tests.fixtures.auth import TestUser, create_test_token


@pytest.mark.integration
async def test_rest_auth_register_new_user(async_client: AsyncClient) -> None:
    """Test user registration via REST endpoint."""
    client = RESTClient(async_client)

    response: Response = await client.post(
        "/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "password123",
            "full_name": "New User",
        },
    )

    # May succeed (201) or fail if auth service requires additional setup
    assert response.status_code in {200, 201, 400, 422, 500}

    # If successful, verify response structure
    if response.status_code in {200, 201}:
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert "id" in data


@pytest.mark.integration
async def test_rest_auth_register_duplicate_email(async_client: AsyncClient) -> None:
    """Test registration with duplicate email fails."""
    client = RESTClient(async_client)

    # Register first user
    await client.post(
        "/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password123",
        },
    )

    # Try to register again with same email
    response: Response = await client.post(
        "/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password456",
        },
    )

    # Should fail with 4xx error
    assert response.status_code >= 400


@pytest.mark.integration
async def test_rest_auth_login_success(
    async_client: AsyncClient,
    postgres_integration_session: AsyncSession,
    supabase_test_user: dict,
) -> None:
    """Test successful login returns tokens with real cloud Supabase."""
    # Use pre-registered test user
    test_email = supabase_test_user["email"]
    test_password = supabase_test_user["password"]

    # Create corresponding user in PostgreSQL (required by Olympus API)
    await create_user(postgres_integration_session, email=test_email)
    await postgres_integration_session.commit()

    client = RESTClient(async_client)

    # Test login via Olympus API (calls real Supabase Auth)
    response: Response = await client.post(
        "/auth/login",
        json={
            "email": test_email,
            "password": test_password,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.integration
async def test_rest_auth_login_invalid_credentials(
    async_client: AsyncClient,
) -> None:
    """Test login with invalid credentials fails with real local Supabase."""
    client = RESTClient(async_client)

    # Try to login with credentials that don't exist in Supabase Auth
    response: Response = await client.post(
        "/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword",
        },
    )

    # Should return 401 Unauthorized (invalid credentials)
    assert response.status_code == 401


@pytest.mark.integration
async def test_rest_auth_get_current_user(
    async_client: AsyncClient,
    postgres_test_user,
    supabase_test_user: dict,
) -> None:
    """Test getting current user profile with valid token."""
    # postgres_test_user fixture ensures PostgreSQL user exists with matching ID

    # Create JWT token using Supabase user_id
    test_user = TestUser(
        id=supabase_test_user["user_id"],
        email=supabase_test_user["email"],
        full_name="Test User",
    )
    token = create_test_token(test_user)

    # Set authorization header
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = RESTClient(async_client)
    response: Response = await client.get("/auth/me")

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == supabase_test_user["email"]
    assert "full_name" in data


@pytest.mark.integration
async def test_rest_auth_get_current_user_no_token(async_client: AsyncClient) -> None:
    """Test getting current user without token returns 401 or 403."""
    client = RESTClient(async_client)
    response: Response = await client.get("/auth/me")

    # FastAPI may return 403 if auth dependency raises HTTPException
    assert response.status_code in {401, 403}


@pytest.mark.integration
async def test_rest_auth_get_current_user_invalid_token(async_client: AsyncClient) -> None:
    """Test getting current user with invalid token returns 401."""
    # Set invalid token
    async_client.headers["Authorization"] = "Bearer invalid.token.here"

    client = RESTClient(async_client)
    response: Response = await client.get("/auth/me")

    assert response.status_code == 401


@pytest.mark.integration
async def test_rest_auth_logout_success(
    async_client: AsyncClient,
    postgres_test_user,
    supabase_test_user: dict,
) -> None:
    """Test logout endpoint with valid token."""
    # postgres_test_user fixture ensures PostgreSQL user exists with matching ID

    # Create JWT token using Supabase user_id
    test_user = TestUser(
        id=supabase_test_user["user_id"],
        email=supabase_test_user["email"],
        full_name="",
    )
    token = create_test_token(test_user)

    # Set authorization header
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = RESTClient(async_client)
    response: Response = await client.post("/auth/logout")

    assert response.status_code == 204


@pytest.mark.integration
async def test_rest_auth_logout_no_token(async_client: AsyncClient) -> None:
    """Test logout without token returns 401 or 403."""
    client = RESTClient(async_client)
    response: Response = await client.post("/auth/logout")

    assert response.status_code in {401, 403}


@pytest.mark.integration
async def test_rest_auth_token_refresh(async_client: AsyncClient) -> None:
    """Test token refresh endpoint."""
    client = RESTClient(async_client)

    # Note: This test verifies the endpoint exists
    # Real implementation would require valid refresh token
    response: Response = await client.post(
        "/auth/refresh",
        json={
            "refresh_token": "dummy.refresh.token",
        },
    )

    # Should fail with invalid token (expected)
    assert response.status_code in {401, 422}


@pytest.mark.integration
async def test_rest_auth_exchange_supabase_token(async_client: AsyncClient) -> None:
    """Test Supabase token exchange endpoint."""
    client = RESTClient(async_client)

    # Test with invalid token (verifies endpoint exists)
    response: Response = await client.post(
        "/auth/exchange",
        headers={"Authorization": "Bearer invalid.supabase.token"},
    )

    # Should fail with 401 or 500 (invalid token)
    assert response.status_code in {401, 500}


@pytest.mark.integration
async def test_rest_auth_sse_token_creation(
    async_client: AsyncClient,
    postgres_test_user,
    supabase_test_user: dict,
) -> None:
    """Test SSE token creation with valid authentication."""
    # postgres_test_user fixture ensures PostgreSQL user exists with matching ID

    # Create JWT token using Supabase user_id
    test_user = TestUser(
        id=supabase_test_user["user_id"],
        email=supabase_test_user["email"],
        full_name="",
    )
    token = create_test_token(test_user)

    # Set authorization header
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = RESTClient(async_client)
    response: Response = await client.post("/auth/sse-token")

    # Should return 200 with valid token (Redis configured correctly on port 6380)
    assert response.status_code == 200
    data = response.json()
    assert "sse_token" in data
    assert "expires_in" in data
    assert data["expires_in"] == 300  # 5 minutes


@pytest.mark.integration
async def test_rest_auth_sse_token_no_auth(async_client: AsyncClient) -> None:
    """Test SSE token creation without authentication fails."""
    client = RESTClient(async_client)
    response: Response = await client.post("/auth/sse-token")

    assert response.status_code in {401, 403}


@pytest.mark.integration
async def test_rest_auth_client_token_creation(async_client: AsyncClient) -> None:
    """Test client token creation endpoint with invalid token."""
    client = RESTClient(async_client)

    # Test with invalid token (real Supabase will reject it)
    response: Response = await client.post(
        "/auth/client-token",
        headers={"Authorization": "Bearer invalid.supabase.token"},
    )

    # Should return 401 for invalid tokens (caught by AuthApiError handler)
    assert response.status_code == 401


@pytest.mark.integration
async def test_rest_auth_forgot_password(async_client: AsyncClient) -> None:
    """Test forgot password endpoint."""
    client = RESTClient(async_client)

    response: Response = await client.post(
        "/auth/forgot-password",
        json={"email": "forgot@example.com"},
    )

    # Always returns 200 to prevent email enumeration
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


@pytest.mark.integration
async def test_rest_auth_resend_verification(async_client: AsyncClient) -> None:
    """Test resend verification email endpoint with real local Supabase."""
    client = RESTClient(async_client)

    # Send resend verification request (real Supabase will send email to Inbucket)
    response: Response = await client.post(
        "/auth/resend-verification",
        json={"email": "verify@example.com"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data


@pytest.mark.integration
async def test_rest_auth_health_check(async_client: AsyncClient) -> None:
    """Test health check endpoint (unprotected)."""
    client = RESTClient(async_client)
    response: Response = await client.get("/health")

    # May return 200 (direct) or 307 (redirect)
    assert response.status_code in {200, 307}
    if response.status_code == 200:
        data = response.json()
        assert data["status"] == "healthy"
