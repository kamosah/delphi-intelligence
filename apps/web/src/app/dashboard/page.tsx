'use client';

import { useDocuments } from '@/hooks/useDocuments';
import { useThreads } from '@/hooks/useThreads';
import { useDashboardStats } from '@/hooks/queries/useDashboardStats';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  DashboardStatCard,
  DashboardStatCardSkeleton,
} from '@/components/dashboard/DashboardStatCard';
import {
  RecentDocumentItem,
  RecentDocumentItemSkeleton,
} from '@/components/dashboard/RecentDocumentItem';
import {
  RecentThreadItem,
  RecentThreadItemSkeleton,
} from '@/components/dashboard/RecentThreadItem';
import { FileText, MessageSquare, Database, Zap } from 'lucide-react';

export default function DashboardPage() {
  const { currentOrganization } = useAuthStore();

  // Fetch dashboard stats (efficient COUNT queries)
  const { stats, isLoading: isLoadingStats } = useDashboardStats({
    organizationId: currentOrganization?.id,
  });

  // Fetch recent documents (only top 3)
  const { documents, isLoading: isLoadingDocuments } = useDocuments({
    limit: 3,
  });

  // Fetch recent threads (only top 3)
  const { threads, isLoading: isLoadingThreads } = useThreads({
    organizationId: currentOrganization?.id,
    limit: 3,
  });

  // Documents and threads are already sorted by created_at desc from the API
  const recentDocuments = documents || [];
  const recentThreads = threads || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here&apos;s what&apos;s happening with your data.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoadingStats || !stats ? (
          <>
            <DashboardStatCardSkeleton />
            <DashboardStatCardSkeleton />
            <DashboardStatCardSkeleton />
            <DashboardStatCardSkeleton />
          </>
        ) : (
          <>
            <DashboardStatCard
              icon={FileText}
              label="Total Documents"
              value={stats.totalDocuments}
              iconBgColor="bg-blue-100"
              iconColor="text-blue-600"
            />
            <DashboardStatCard
              icon={MessageSquare}
              label="Threads This Month"
              value={stats.threadsThisMonth}
              iconBgColor="bg-green-100"
              iconColor="text-green-600"
            />
            <DashboardStatCard
              icon={Database}
              label="Active Spaces"
              value={stats.totalSpaces}
              iconBgColor="bg-yellow-100"
              iconColor="text-yellow-600"
            />
            <DashboardStatCard
              icon={Zap}
              label="Total Threads"
              value={stats.totalThreads}
              iconBgColor="bg-purple-100"
              iconColor="text-purple-600"
            />
          </>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Documents
            </h2>
          </div>
          <div className="p-6">
            {isLoadingDocuments ? (
              <div className="space-y-4">
                <RecentDocumentItemSkeleton />
                <RecentDocumentItemSkeleton />
                <RecentDocumentItemSkeleton />
              </div>
            ) : recentDocuments.length > 0 ? (
              <div className="space-y-4">
                {recentDocuments.map((doc) => (
                  <RecentDocumentItem
                    key={doc.id}
                    name={doc.name}
                    createdAt={doc.createdAt}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No documents yet. Upload your first document to get started.
              </p>
            )}
          </div>
        </div>

        {/* Recent Threads */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Threads
            </h2>
          </div>
          <div className="p-6">
            {isLoadingThreads ? (
              <div className="space-y-4">
                <RecentThreadItemSkeleton />
                <RecentThreadItemSkeleton />
                <RecentThreadItemSkeleton />
              </div>
            ) : recentThreads.length > 0 ? (
              <div className="space-y-4">
                {recentThreads.map((thread) => (
                  <RecentThreadItem
                    key={thread.id}
                    queryText={thread.queryText}
                    createdAt={thread.createdAt}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No threads yet. Start a conversation to analyze your data.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
