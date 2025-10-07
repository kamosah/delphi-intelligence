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

    # Supabase Configuration
    supabase_url: str = Field(description="Supabase project URL")
    supabase_anon_key: str = Field(description="Supabase anon key")
    supabase_service_role_key: str = Field(description="Supabase service role key")

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


# Global settings instance
settings = Settings()
