"""
Authentication middleware for FastAPI
"""

from collections.abc import Awaitable, Callable
from uuid import UUID

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware

from app.auth.jwt_handler import jwt_manager
from app.auth.redis_client import redis_manager
from app.db.session import get_session_factory
from app.models.user import User


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """Middleware to handle authentication for protected routes"""

    EXCLUDED_PATHS = {
        "/",
        "/health",
        "/health/detailed",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/auth/login",
        "/auth/register",
        "/auth/refresh",
        "/auth/forgot-password",
        "/auth/verify-email",
    }

    async def dispatch(  # noqa: PLR0911
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """
        Process request and add authentication context

        Args:
            request: Incoming HTTP request
            call_next: Next middleware/route handler

        Returns:
            HTTP response
        """
        # Skip authentication for excluded paths
        if request.url.path in self.EXCLUDED_PATHS:
            response: Response = await call_next(request)
            return response

        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            response = await call_next(request)
            return response

        # Check for Authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            # Let the route handler decide if authentication is required
            # Some routes might have optional authentication
            response = await call_next(request)
            return response

        try:
            # Extract token
            token = authorization.split(" ", 1)[1]

            # Check if token is blacklisted
            if await redis_manager.is_token_blacklisted(token):
                return JSONResponse(status_code=401, content={"detail": "Token has been revoked"})

            # Verify token
            payload = jwt_manager.verify_token(token)
            if not payload:
                return JSONResponse(
                    status_code=401, content={"detail": "Invalid authentication credentials"}
                )

            # Fetch user from database
            user_id = UUID(payload.get("sub"))
            async with get_session_factory()() as db:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()

                if not user:
                    return JSONResponse(status_code=401, content={"detail": "User not found"})

                # Add user model to request state
                request.state.user = user

        except Exception:
            # Don't fail the request - let route handler decide
            # if authentication is required
            pass

        response = await call_next(request)
        return response
