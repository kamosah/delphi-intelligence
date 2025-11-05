'use client';

import { SpaceCardSkeletonGrid } from '@/components/threads/SpaceCardSkeleton';
import { useSpaces } from '@/hooks/useSpaces';
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@olympus/ui';
import { AlertCircle, MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';

/**
 * Top-level Threads page - shows all available threads across all spaces.
 *
 * Features:
 * - List of all spaces with thread access
 * - Quick access to threads within each space
 * - Unified conversational AI interface
 * - Supports mentions for documents and data sources
 * - Consistent title across all states (loading, error, success)
 * - Skeleton loading state
 * - Error handling with retry
 */
export default function ThreadsPage() {
  const { spaces, isLoading, isSuccess, error, refetch } = useSpaces();

  return (
    <div className="space-y-6">
      {/* Header - Always visible with consistent structure */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-blue-600" />
          Threads
        </h1>
        <p className="text-gray-600 mt-1">
          Conversational AI interface for document analysis and insights across
          all your spaces.
        </p>
      </div>

      {/* Loading State - Skeleton Grid */}
      {isLoading && <SpaceCardSkeletonGrid count={3} />}

      {/* Error State */}
      {error && !isLoading && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="ml-2 flex-1">
            <p className="text-sm font-medium text-red-800">
              Failed to load spaces
            </p>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error
                ? error.message
                : 'An error occurred while loading your spaces.'}
            </p>
            <button
              onClick={() => refetch()}
              className="text-sm text-red-600 hover:text-red-700 font-medium underline mt-2"
            >
              Try again
            </button>
          </div>
        </Alert>
      )}

      {/* Empty State - Only show when query succeeded with no spaces */}
      {isSuccess && !error && spaces.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Spaces Yet
            </h3>
            <p className="text-sm text-gray-600 text-center max-w-md mb-4">
              Create a space first to start using Threads for AI-powered
              document conversations.
            </p>
            <Link
              href="/dashboard/spaces"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Go to Spaces →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Success State - Spaces Grid with Thread Access */}
      {isSuccess && !error && spaces.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => (
            <Link key={space.id} href={`/dashboard/spaces/${space.id}/threads`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    {space.name}
                  </CardTitle>
                  <CardDescription>
                    {space.description ||
                      'Start a conversation about documents in this space'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Sparkles className="h-4 w-4" />
                    <span>AI-powered document Q&A</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
