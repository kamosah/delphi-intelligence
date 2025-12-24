import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js middleware for route protection and authentication with Supabase SSR.
 *
 * This middleware:
 * 1. Manages Supabase HTTP-only cookies for secure authentication
 * 2. Automatically refreshes Supabase sessions
 * 3. Protects routes requiring authentication
 * 4. Redirects authenticated users away from auth pages
 *
 * Protected routes: /dashboard, /spaces, /documents, /settings
 * Auth routes (redirect if authenticated): /login, /signup
 * Public routes: /, /forgot-password, /reset-password, /verify-email, /auth/confirm
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for HTTP-only cookie management
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session (updates HTTP-only cookies automatically)
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Log session errors for debugging production issues
  if (error) {
    console.error('[Middleware] Session error:', error.message);
  }

  const isAuthenticated = !!session && !error;

  // Define protected routes (require authentication)
  const protectedRoutes = [
    '/dashboard',
    '/spaces',
    '/documents',
    '/settings',
    '/onboarding',
  ];

  // Define auth routes (login, signup - should redirect if authenticated)
  const authRoutes = ['/login', '/signup'];

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if accessing a protected route without authentication
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
  return response;
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
