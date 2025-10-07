"""
Supabase client configuration for FastAPI backend
"""

import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class SupabaseConfig:
    """Supabase configuration and client management"""

    def __init__(self):
        self.url: str = os.getenv("SUPABASE_URL", "")
        self.anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

        # Validate required environment variables
        if not all([self.url, self.anon_key, self.service_role_key]):
            raise ValueError(
                "Missing required Supabase environment variables. "
                "Please check SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY"
            )

    def get_client(self, use_service_role: bool = False) -> Client:
        """
        Get Supabase client

        Args:
            use_service_role: If True, use service role key (bypasses RLS)
                            If False, use anon key (respects RLS)

        Returns:
            Supabase client instance
        """
        key = self.service_role_key if use_service_role else self.anon_key
        return create_client(self.url, key)

    def get_admin_client(self) -> Client:
        """Get admin client with service role (bypasses RLS)"""
        return self.get_client(use_service_role=True)

    def get_user_client(self, user_token: Optional[str] = None) -> Client:
        """
        Get user client with anon key (respects RLS)

        Args:
            user_token: Optional JWT token for authenticated requests

        Returns:
            Supabase client configured for user operations
        """
        client = self.get_client(use_service_role=False)

        if user_token:
            # Set the auth token for this client
            client.auth.set_session(user_token, None)

        return client


# Global instance
supabase_config = SupabaseConfig()


# Convenience functions
def get_supabase_client(use_service_role: bool = False) -> Client:
    """Get Supabase client"""
    return supabase_config.get_client(use_service_role=use_service_role)


def get_admin_client() -> Client:
    """Get admin Supabase client (service role)"""
    return supabase_config.get_admin_client()


def get_user_client(user_token: Optional[str] = None) -> Client:
    """Get user Supabase client (anon key + optional auth)"""
    return supabase_config.get_user_client(user_token)
