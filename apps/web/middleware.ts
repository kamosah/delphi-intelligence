import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get the auth token from cookies or localStorage (we'll use a cookie-based approach)
  const authToken = request.cookies.get('olympus-auth-token')?.value;

  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/spaces', '/docs'];
  const isProtectedRoute = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Check if user is trying to access a protected route without a token
  if (isProtectedRoute && !authToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user has a token but is trying to access auth pages, redirect to dashboard
  const authPaths = ['/login', '/signup', '/reset-password'];
  const isAuthRoute = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthRoute && authToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/spaces/:path*',
    '/docs/:path*',
    '/login',
    '/signup',
    '/reset-password',
  ],
};
