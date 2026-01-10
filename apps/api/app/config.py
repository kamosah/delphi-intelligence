"""
Application configuration management using Pydantic Settings

Environment Loading:
- Development/Production: Loads .env file
- Testing: pytest-dotenv loads .env.test into os.environ (takes precedence over .env)
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App Configuration
    app_name: str = Field(default="Olympus API", description="Application name")
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

    # SpiceDB Configuration
    spicedb_endpoint: str = Field(default="localhost:50051", description="SpiceDB gRPC endpoint")
    spicedb_token: str | None = Field(
        default=None, description="SpiceDB pre-shared key for authentication"
    )
    spicedb_datastore_conn_uri: str | None = Field(
        default=None, description="SpiceDB PostgreSQL datastore connection URI"
    )

    # CORS Configuration
    # WARNING: At least one of cors_origins or cors_origin_regex must be configured
    # in production, otherwise all CORS requests will be rejected.
    # Development: Uses cors_origin_regex for localhost:3000-3005
    # Production: Set cors_origins to your frontend URLs and cors_origin_regex to None
    cors_origins: list[str] = Field(
        default=[], description="Allowed CORS origins (exact matches for production)"
    )
    cors_origin_regex: str | None = Field(
        default=r"^https?://localhost:300[0-5]$",  # Matches ports 3000-3005 for development
        description="CORS origin regex pattern (env specific)",
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

    # LangChain LLM Configuration
    openai_chat_model: str = Field(
        default="gpt-4-turbo-preview", description="OpenAI chat model for AI agent"
    )
    openai_temperature: float = Field(
        default=0.0, description="Temperature for LLM responses (0.0 = deterministic)"
    )
    openai_max_tokens: int = Field(default=2000, description="Maximum tokens in LLM response")

    # LangSmith Configuration (Optional Observability)
    langchain_tracing_v2: bool = Field(default=False, description="Enable LangSmith tracing")
    langchain_api_key: str = Field(default="", description="LangSmith API key for observability")
    langchain_project: str = Field(default="olympus", description="LangSmith project name")

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
settings = Settings()
