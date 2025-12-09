'use client';

import { Database, FileText, Loader2, MessageSquare, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDocuments } from '@/hooks/useDocuments';
import { useIsOrgSwitching } from '@/hooks/useIsOrgSwitching';
import { useThreads } from '@/hooks/useThreads';
import { DashboardStatCard } from './DashboardStatCard';
import { RecentDocumentItem } from './RecentDocumentItem';
import { RecentThreadItem } from './RecentThreadItem';

export function DashboardClient() {
  const { currentOrganization } = useAuth();
  const isSwitching = useIsOrgSwitching();

  const { stats } = useDashboardStats({
    organizationId: currentOrganization?.id,
  });

  const { documents } = useDocuments({
    limit: 3,
  });

  const { threads } = useThreads({
    organizationId: currentOrganization?.id,
    limit: 3,
  });

  // Documents and threads are already sorted by created_at desc from the API
  const recentDocuments = documents || [];
  const recentThreads = threads || [];

  if (isSwitching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">
            Switching organization...
          </p>
          <p className="text-xs text-gray-500">Loading your workspace</p>
        </div>
      </div>
    );
  }

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
        <DashboardStatCard
          icon={FileText}
          label="Total Documents"
          value={stats?.totalDocuments ?? 0}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <DashboardStatCard
          icon={MessageSquare}
          label="Threads This Month"
          value={stats?.threadsThisMonth ?? 0}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <DashboardStatCard
          icon={Database}
          label="Active Spaces"
          value={stats?.totalSpaces ?? 0}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
        <DashboardStatCard
          icon={Zap}
          label="Total Threads"
          value={stats?.totalThreads ?? 0}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
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
            {recentDocuments.length > 0 ? (
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
            {recentThreads.length > 0 ? (
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
