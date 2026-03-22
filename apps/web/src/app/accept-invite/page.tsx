import { redirect } from 'next/navigation';
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { AcceptInviteContent } from '@/components/invitations/AcceptInviteContent';
import { fetchMyPendingInvitations } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface AcceptInvitePageProps {
  searchParams: { invitation_id?: string };
}

/**
 * Accept invitation page (Server Component).
 *
 * Handles both authenticated and unauthenticated users:
 * - Authenticated: Shows pending invitations
 * - Unauthenticated: Redirects to login with return URL
 *
 * Query params:
 * - invitation_id: Optional invitation ID to pre-select
 */
export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const supabase = await createSupabaseServerClient();
  const invitationIdParam = searchParams.invitation_id || null;

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not authenticated, redirect to login with return URL
  if (!session) {
    const returnUrl = invitationIdParam
      ? `/accept-invite?invitation_id=${invitationIdParam}`
      : '/accept-invite';
    redirect(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  }

  // User is authenticated - prefetch invitations
  const queryClient = new QueryClient();

  try {
    // Import here to avoid issues when redirecting
    const { getServerGraphQLClient } =
      await import('@/lib/api/graphql-server-client');
    const graphqlClient = await getServerGraphQLClient();

    await queryClient.prefetchQuery({
      queryKey: queryKeys.invitations.myPending(),
      queryFn: () => fetchMyPendingInvitations(graphqlClient),
    });
  } catch (error) {
    console.error('Pending invitations SSR prefetch failed:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AcceptInviteContent invitationIdParam={invitationIdParam} />
    </HydrationBoundary>
  );
}
