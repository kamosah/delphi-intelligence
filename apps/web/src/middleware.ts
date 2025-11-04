import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for route protection and authentication.
 * Checks for authentication state in cookies (set by client-side auth via setAuthCookies).
 * Redirects unauthorized users to login and prevents authenticated users from accessing auth pages.
 *
 * Protected routes: /dashboard, /spaces, /documents, /settings
 * Public routes: /, /login, /signup, /forgot-password, /reset-password, /verify-email, /auth/confirm
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for authentication cookie (set by useAuth hook via setAuthCookies)
  const authToken = request.cookies.get('olympus-auth-token');
  const isAuthenticated = !!authToken?.value;

  // Define protected routes (require authentication)
  const protectedRoutes = ['/dashboard', '/spaces', '/documents', '/settings'];

  // Define auth routes (login, signup - should redirect if authenticated)
  const authRoutes = ['/login', '/signup'];

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // Add redirect parameter to return user after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth routes while authenticated
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on.
 * Excludes static files, API routes, and Next.js internal routes.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};
