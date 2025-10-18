"""
Application configuration management using Pydantic Settings
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    # App Configuration
    app_name: str = Field(default="Olympus MVP", description="Application name")
    debug: bool = Field(default=True, description="Debug mode")
    env: str = Field(default="development", description="Environment")
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")

    # Database Configuration - Supabase only
    database_url: str = Field(default="", description="Supabase database connection URL")

    # Supabase Configuration
    supabase_url: str = Field(default="", description="Supabase project URL")
    supabase_anon_key: str = Field(default="", description="Supabase anon key")
    supabase_service_role_key: str = Field(default="", description="Supabase service role key")
    supabase_db_url: str | None = Field(default=None, description="Direct Supabase database URL")

    # Redis Configuration
    redis_url: str = Field(default="redis://localhost:6379", description="Redis connection URL")

    # CORS Configuration
    cors_origins: list[str] = Field(
        default=["http://localhost:3000"], description="Allowed CORS origins"
    )

    # JWT Configuration
    jwt_secret: str = Field(
        default="test-secret-key-change-in-production", description="JWT secret key"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_expiration_hours: int = Field(default=24, description="JWT expiration time in hours")

    # OpenAI Configuration
    openai_api_key: str = Field(
        default="", description="OpenAI API key for embeddings and AI features"
    )
    openai_embedding_model: str = Field(
        default="text-embedding-3-small", description="OpenAI embedding model"
    )
    openai_embedding_batch_size: int = Field(
        default=100, description="Batch size for embedding generation"
    )
    openai_max_retries: int = Field(
        default=3, description="Maximum retry attempts for OpenAI API calls"
    )

    @property
    def db_url(self) -> str:
        """Get the database URL."""
        # Use DATABASE_URL if set, otherwise fall back to SUPABASE_DB_URL
        return self.database_url or self.supabase_db_url or ""

    @property
    def db_connect_args(self) -> dict:
        """Get database connection arguments."""
        # For asyncpg driver with Supabase
        # Disable prepared statements for PgBouncer compatibility
        return {"statement_cache_size": 0}


# Global settings instance
# Pydantic loads values from .env file automatically
settings = Settings()  # type: ignore[call-arg]
