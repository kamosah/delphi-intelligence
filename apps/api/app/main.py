"""
FastAPI main application module
"""

import logging
import sys
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from strawberry.fastapi import GraphQLRouter

from app.config import settings
from app.graphql import schema
from app.middleware.auth import AuthenticationMiddleware
from app.routes import health
from app.routes.auth import router as auth_router
from app.routes.documents import router as documents_router
from app.routes.thread_stream import router as thread_stream_router


def configure_logging() -> None:
    """Configure application logging for Docker and development environments."""

    # Create formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Create console handler that outputs to stdout
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)

    # Configure specific loggers for your application
    # Ensure your GraphQL and service loggers are properly configured
    graphql_logger = logging.getLogger("app.graphql")
    graphql_logger.setLevel(logging.INFO)
    graphql_logger.propagate = True

    services_logger = logging.getLogger("app.services")
    services_logger.setLevel(logging.INFO)
    services_logger.propagate = True

    # Suppress noisy third-party loggers if needed
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

    print("Logging configured: INFO level enabled for app modules", flush=True)


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""

    # Configure logging first
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        description="FastAPI backend for Olympus MVP - AI-native document intelligence platform inspired by Athena Intelligence. Provides document processing, AI-powered querying, and workspace collaboration.",
        version="0.1.0",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add authentication middleware
    app.add_middleware(AuthenticationMiddleware)

    # Create GraphQL router
    graphql_app: GraphQLRouter = GraphQLRouter(
        schema, graphql_ide="graphiql" if settings.debug else None
    )

    # Include routers
    app.include_router(auth_router)
    app.include_router(documents_router)
    app.include_router(thread_stream_router)
    app.include_router(health.router)
    app.include_router(graphql_app, prefix="/graphql")

    @app.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        """Root endpoint"""
        return {
            "message": f"Welcome to {settings.app_name} API",
            "version": "0.1.0",
            "environment": settings.env,
            "docs": "/docs" if settings.debug else "disabled in production",
            "graphql": "/graphql" if settings.debug else "disabled in production",
        }

    def custom_openapi() -> dict[str, Any]:
        """Custom OpenAPI schema with Bearer token authentication"""
        if app.openapi_schema:
            return app.openapi_schema

        openapi_schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )

        # Add security scheme for Bearer token authentication
        openapi_schema["components"]["securitySchemes"] = {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "Enter your JWT token from /auth/login",
            }
        }

        # Add global security requirement (but routes can override)
        # This makes the "Authorize" button visible in Swagger UI
        openapi_schema["security"] = [{"BearerAuth": []}]

        app.openapi_schema = openapi_schema
        return app.openapi_schema

    # Override the default OpenAPI schema
    app.openapi = custom_openapi  # type: ignore[method-assign]

    return app


# Create app instance
app = create_app()
