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

    # Database Configuration
    database_url: str | None = Field(default=None, description="Database connection URL")
    local_database_url: str = Field(
        default="postgresql://olympus:olympus_dev@localhost:5432/olympus_mvp",
        description="Local PostgreSQL database URL",
    )
    use_local_db: bool = Field(default=False, description="Use local database instead of Supabase")

    # Supabase Configuration
    supabase_url: str = Field(description="Supabase project URL")
    supabase_anon_key: str = Field(description="Supabase anon key")
    supabase_service_role_key: str = Field(description="Supabase service role key")
    supabase_db_url: str | None = Field(default=None, description="Direct Supabase database URL")

    # Redis Configuration
    redis_url: str = Field(default="redis://localhost:6379", description="Redis connection URL")

    # CORS Configuration
    cors_origins: list[str] = Field(
        default=["http://localhost:3000"], description="Allowed CORS origins"
    )

    # JWT Configuration
    jwt_secret: str = Field(description="JWT secret key")
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_expiration_hours: int = Field(default=24, description="JWT expiration time in hours")

    @property
    def db_url(self) -> str:
        """Get the appropriate database URL based on configuration."""
        # Priority: explicit DATABASE_URL > local db flag > Supabase direct URL > construct from Supabase URL
        if self.database_url:
            return self.database_url

        if self.use_local_db:
            return self.local_database_url

        if self.supabase_db_url:
            return self.supabase_db_url

        # If none specified, default to local for development
        if self.env == "development":
            return self.local_database_url

        # Fallback: try to construct from Supabase URL (this requires additional setup)
        raise ValueError(
            "No database URL configured. Set DATABASE_URL, SUPABASE_DB_URL, or USE_LOCAL_DB=true"
        )

    @property
    def db_connect_args(self) -> dict:
        """Get database connection arguments."""
        # For asyncpg driver, no special connect args needed for local development
        return {}


# Global settings instance
settings = Settings()
