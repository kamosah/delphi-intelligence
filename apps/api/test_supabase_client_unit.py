"""
Unit tests for Supabase client with proper mocking
Tests the client configuration and setup logic without external dependencies
"""

import pytest
from unittest.mock import Mock, patch
import os

# Import our Supabase client modules
from supabase_client import (
    SupabaseConfig,
    get_supabase_client,
    get_admin_client,
    get_user_client
)


class TestSupabaseConfig:
    """Test SupabaseConfig class"""

    @patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_ANON_KEY': 'test_anon_key',
        'SUPABASE_SERVICE_ROLE_KEY': 'test_service_role_key'
    })
    def test_init_with_valid_env_vars(self):
        """Test SupabaseConfig initialization with valid environment variables"""
        config = SupabaseConfig()
        
        assert config.url == 'https://test.supabase.co'
        assert config.anon_key == 'test_anon_key'
        assert config.service_role_key == 'test_service_role_key'

    @patch.dict(os.environ, {}, clear=True)
    def test_init_missing_all_env_vars(self):
        """Test SupabaseConfig raises ValueError when all env vars are missing"""
        with pytest.raises(ValueError) as exc_info:
            SupabaseConfig()
        
        assert "Missing required Supabase environment variables" in str(exc_info.value)

    @patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_ANON_KEY': 'test_anon_key'
        # Missing SUPABASE_SERVICE_ROLE_KEY
    }, clear=True)
    def test_init_missing_service_role_key(self):
        """Test SupabaseConfig raises ValueError when service role key is missing"""
        with pytest.raises(ValueError) as exc_info:
            SupabaseConfig()
        
        assert "Missing required Supabase environment variables" in str(exc_info.value)

    @patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_ANON_KEY': '',  # Empty string
        'SUPABASE_SERVICE_ROLE_KEY': 'test_service_role_key'
    }, clear=True)
    def test_init_empty_anon_key(self):
        """Test SupabaseConfig raises ValueError when anon key is empty"""
        with pytest.raises(ValueError) as exc_info:
            SupabaseConfig()
        
        assert "Missing required Supabase environment variables" in str(exc_info.value)

    @patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_ANON_KEY': 'test_anon_key',
        'SUPABASE_SERVICE_ROLE_KEY': 'test_service_role_key'
    })
    @patch('supabase_client.create_client')
    def test_get_client_with_anon_key(self, mock_create_client):
        """Test get_client() uses anon key when use_service_role=False"""
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        config = SupabaseConfig()
        client = config.get_client(use_service_role=False)
        
        mock_create_client.assert_called_once_with('https://test.supabase.co', 'test_anon_key')
        assert client == mock_client

    @patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_ANON_KEY': 'test_anon_key',
        'SUPABASE_SERVICE_ROLE_KEY': 'test_service_role_key'
    })
    @patch('supabase_client.create_client')
    def test_get_client_with_service_role(self, mock_create_client):
        """Test get_client() uses service role key when use_service_role=True"""
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        config = SupabaseConfig()
        client = config.get_client(use_service_role=True)
        
        mock_create_client.assert_called_once_with('https://test.supabase.co', 'test_service_role_key')
        assert client == mock_client

    @patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_ANON_KEY': 'test_anon_key',
        'SUPABASE_SERVICE_ROLE_KEY': 'test_service_role_key'
    })
    @patch('supabase_client.create_client')
    def test_get_admin_client(self, mock_create_client):
        """Test get_admin_client() uses service role key"""
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        config = SupabaseConfig()
        admin_client = config.get_admin_client()
        
        mock_create_client.assert_called_once_with('https://test.supabase.co', 'test_service_role_key')
        assert admin_client == mock_client

    @patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_ANON_KEY': 'test_anon_key',
        'SUPABASE_SERVICE_ROLE_KEY': 'test_service_role_key'
    })
    @patch('supabase_client.create_client')
    def test_get_user_client_without_token(self, mock_create_client):
        """Test get_user_client() without user token"""
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        config = SupabaseConfig()
        user_client = config.get_user_client()
        
        mock_create_client.assert_called_once_with('https://test.supabase.co', 'test_anon_key')
        assert user_client == mock_client
        # Should not call set_session when no token provided
        mock_client.auth.set_session.assert_not_called()

    @patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_ANON_KEY': 'test_anon_key',
        'SUPABASE_SERVICE_ROLE_KEY': 'test_service_role_key'
    })
    @patch('supabase_client.create_client')
    def test_get_user_client_with_token(self, mock_create_client):
        """Test get_user_client() with user token"""
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        config = SupabaseConfig()
        user_token = 'jwt_token_123'
        user_client = config.get_user_client(user_token)
        
        mock_create_client.assert_called_once_with('https://test.supabase.co', 'test_anon_key')
        assert user_client == mock_client
        # Should call set_session with the token
        mock_client.auth.set_session.assert_called_once_with(user_token, None)


class TestConvenienceFunctions:
    """Test global convenience functions"""

    @patch('supabase_client.supabase_config')
    def test_get_supabase_client(self, mock_config):
        """Test get_supabase_client() delegates to config"""
        mock_client = Mock()
        mock_config.get_client.return_value = mock_client
        
        # Test with default parameter
        client = get_supabase_client()
        mock_config.get_client.assert_called_with(use_service_role=False)
        assert client == mock_client
        
        # Test with explicit parameter
        admin_client = get_supabase_client(use_service_role=True)
        mock_config.get_client.assert_called_with(use_service_role=True)
        assert admin_client == mock_client

    @patch('supabase_client.supabase_config')
    def test_get_admin_client_function(self, mock_config):
        """Test get_admin_client() function delegates to config"""
        mock_client = Mock()
        mock_config.get_admin_client.return_value = mock_client
        
        admin_client = get_admin_client()
        mock_config.get_admin_client.assert_called_once()
        assert admin_client == mock_client

    @patch('supabase_client.supabase_config')
    def test_get_user_client_function(self, mock_config):
        """Test get_user_client() function delegates to config"""
        mock_client = Mock()
        mock_config.get_user_client.return_value = mock_client
        
        # Test without token
        user_client = get_user_client()
        mock_config.get_user_client.assert_called_with(None)
        assert user_client == mock_client
        
        # Test with token
        token = 'test_token'
        user_client_with_token = get_user_client(token)
        mock_config.get_user_client.assert_called_with(token)
        assert user_client_with_token == mock_client


class TestSupabaseConfigIntegration:
    """Integration tests for the global config instance"""

    def test_global_convenience_functions_work(self):
        """Test that global convenience functions can be called"""
        # This is more of a smoke test - just verify the functions exist and can be called
        # We don't test the actual values since the global instance uses real env vars
        try:
            # These should not raise exceptions if properly configured
            from supabase_client import get_supabase_client, get_admin_client, get_user_client
            
            # Just verify the functions exist and are callable
            assert callable(get_supabase_client)
            assert callable(get_admin_client) 
            assert callable(get_user_client)
            
        except Exception as e:
            # If env vars aren't set, we expect a ValueError
            assert "Missing required Supabase environment variables" in str(e)


if __name__ == '__main__':
    # Run tests with pytest
    pytest.main([__file__, '-v'])