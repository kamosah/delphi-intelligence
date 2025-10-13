// REST API client for authentication endpoints

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  avatar_url?: string;
  email_confirmed?: boolean; // Added for registration response
}

export interface RefreshRequest {
  refresh_token: string;
}

// Helper function for making API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

// Authentication API functions
export const authApi = {
  // Login user
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    return apiRequest<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // Register user (returns user profile, NOT tokens - user must verify email first)
  register: async (userData: RegisterRequest): Promise<UserProfile> => {
    return apiRequest<UserProfile>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Refresh token
  refresh: async (refreshData: RefreshRequest): Promise<TokenResponse> => {
    return apiRequest<TokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(refreshData),
    });
  },

  // Get current user profile
  me: async (accessToken: string): Promise<UserProfile> => {
    return apiRequest<UserProfile>('/auth/me', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
  },

  // Logout user
  logout: async (accessToken: string): Promise<void> => {
    return apiRequest<void>('/auth/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
  },
};
