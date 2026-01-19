import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { AcceptInviteContent } from '@/components/invitations/AcceptInviteContent';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchMyPendingInvitations } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

interface AcceptInvitePageProps {
  searchParams: { invitation_id?: string };
}

/**
 * Accept invitation page (Server Component).
 *
 * Prefetches user's pending invitations on the server for fast initial render.
 * Displays invitation details and allows user to accept/decline.
 *
 * Query params:
 * - invitation_id: Optional invitation ID to pre-select
 */
export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();
  const invitationIdParam = searchParams.invitation_id || null;

  // Prefetch pending invitations on server
  try {
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
