import { redirect } from 'next/navigation';
import type { User } from '@/lib/api/generated';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Server-side utility to get the current authenticated user.
 *
 * This function:
 * 1. Checks Supabase session from HTTP-only cookies
 * 2. Exchanges Supabase token for Olympus JWT
 * 3. Fetches user data from GraphQL me query
 * 4. Returns User object for use in Server Components
 *
 * Usage:
 * ```tsx
 * // In Server Component
 * const user = await getServerUser();
 * return <UserProfile user={user} />;
 * ```
 *
 * @throws Redirects to /login if not authenticated
 * @returns Promise<User> - Current authenticated user
 */
export async function getServerUser(): Promise<User> {
  const supabase = await createSupabaseServerClient();

  // Check Supabase session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Exchange Supabase token for Olympus JWT
  const tokenResponse = await fetch(`${API_URL}/auth/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!tokenResponse.ok) {
    console.error('Token exchange failed:', await tokenResponse.text());
    redirect('/login');
  }

  const { olympus_token } = await tokenResponse.json();

  // Fetch user data from GraphQL me query
  const graphqlQuery = `
    query GetMe {
      me {
        id
        email
        fullName
        role
        isActive
        avatarUrl
        emailConfirmed
        bio
        createdAt
        updatedAt
      }
    }
  `;

  const graphqlResponse = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${olympus_token}`,
    },
    body: JSON.stringify({ query: graphqlQuery }),
  });

  if (!graphqlResponse.ok) {
    console.error('GraphQL request failed:', await graphqlResponse.text());
    redirect('/login');
  }

  const { data, errors } = await graphqlResponse.json();

  if (errors) {
    console.error('GraphQL errors:', errors);
    redirect('/login');
  }

  return data.me;
}
