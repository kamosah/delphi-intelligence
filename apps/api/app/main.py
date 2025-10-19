"""
FastAPI main application module
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.config import settings
from app.graphql import schema
from app.middleware.auth import AuthenticationMiddleware
from app.routes import health
from app.routes.auth import router as auth_router
from app.routes.documents import router as documents_router
from app.routes.query_stream import router as query_stream_router


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""

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
    app.include_router(query_stream_router)
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

    return app


# Create app instance
app = create_app()
