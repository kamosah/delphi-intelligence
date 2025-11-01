"""
Health check routes for API monitoring and status verification
"""

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def basic_health() -> dict[str, Any]:
    """Basic health check endpoint"""
    logger.info("Health check requested - logging is working!")
    return {
        "status": "healthy",
        "service": "olympus-api",
        "version": "0.1.0",
        "timestamp": datetime.now(UTC).isoformat(),
        "environment": settings.env,
    }


@router.get("/detailed")
async def detailed_health() -> dict[str, Any]:
    """Detailed health check with service dependencies"""

    health_status: dict[str, Any] = {
        "status": "healthy",
        "service": "olympus-api",
        "version": "0.1.0",
        "timestamp": datetime.now(UTC).isoformat(),
        "environment": settings.env,
        "dependencies": {},
    }
    dependencies: dict[str, Any] = {}

    # Check Supabase connection
    try:
        # Import here to avoid circular imports
        from supabase_client import get_supabase_client

        client = get_supabase_client()
        # Simple health check - attempt to authenticate
        _auth_health = client.auth.get_session()
        dependencies["supabase"] = {
            "status": "healthy",
            "url": settings.supabase_url,
            "timestamp": datetime.now(UTC).isoformat(),
        }
    except Exception as e:
        dependencies["supabase"] = {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(UTC).isoformat(),
        }
        health_status["status"] = "degraded"

    # Check Redis connection (if configured)
    try:
        # This would be implemented when Redis is added
        dependencies["redis"] = {
            "status": "not_configured",
            "message": "Redis health check not implemented yet",
        }
    except Exception as e:
        dependencies["redis"] = {"status": "unhealthy", "error": str(e)}

    health_status["dependencies"] = dependencies

    return health_status


@router.get("/readiness")
async def readiness_probe() -> dict[str, Any]:
    """Kubernetes readiness probe endpoint"""
    return {"status": "ready", "service": "olympus-api", "timestamp": datetime.now(UTC).isoformat()}


@router.get("/liveness")
async def liveness_probe() -> dict[str, Any]:
    """Kubernetes liveness probe endpoint"""
    return {"status": "alive", "service": "olympus-api", "timestamp": datetime.now(UTC).isoformat()}


@router.get("/protected")
async def protected_health(current_user: dict = Depends(lambda: None)) -> dict[str, Any]:
    """Protected health endpoint that requires authentication"""
    # Import here to avoid circular imports during startup

    # This demonstrates how to use authentication in a route
    # In practice, you'd add `current_user: dict = Depends(get_current_user)`
    # to the function signature
    return {
        "status": "healthy",
        "message": "This is a protected endpoint",
        "user_authenticated": current_user is not None,
        "timestamp": datetime.now(UTC).isoformat(),
    }
