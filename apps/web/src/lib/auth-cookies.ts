// Utility functions for managing authentication tokens in cookies

export const AUTH_COOKIE_NAME = 'olympus-auth-token';
export const REFRESH_COOKIE_NAME = 'olympus-refresh-token';

// Set auth tokens in cookies
export function setAuthCookies(accessToken: string, refreshToken: string) {
  // Set access token (shorter expiry)
  document.cookie = `${AUTH_COOKIE_NAME}=${accessToken}; path=/; max-age=${24 * 60 * 60}; secure; samesite=strict`;

  // Set refresh token (longer expiry)
  document.cookie = `${REFRESH_COOKIE_NAME}=${refreshToken}; path=/; max-age=${30 * 24 * 60 * 60}; secure; samesite=strict`;
}

// Clear auth cookies
export function clearAuthCookies() {
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${REFRESH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// Get auth token from cookies (server-side compatible)
export function getAuthToken(cookieString?: string): string | null {
  if (typeof window === 'undefined') {
    // Server-side: use provided cookie string
    if (!cookieString) return null;
    const match = cookieString.match(
      new RegExp(`(^| )${AUTH_COOKIE_NAME}=([^;]+)`)
    );
    return match ? match[2] : null;
  } else {
    // Client-side: use document.cookie
    const match = document.cookie.match(
      new RegExp(`(^| )${AUTH_COOKIE_NAME}=([^;]+)`)
    );
    return match ? match[2] : null;
  }
}

// Get refresh token from cookies
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(^| )${REFRESH_COOKIE_NAME}=([^;]+)`)
  );
  return match ? match[2] : null;
}
