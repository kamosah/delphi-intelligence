"""
Supabase client initialization for authentication and database operations
"""

from supabase import Client, create_client

from app.config import settings


def get_admin_client() -> Client:
    """
    Get Supabase admin client with service role key

    Returns:
        Supabase client with admin privileges
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )


def get_user_client() -> Client:
    """
    Get Supabase client with anon key for user operations

    Returns:
        Supabase client for user-level operations
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key
    )
