import { VectorSearchDebugger } from '@/components/debug/VectorSearchDebugger';

/**
 * Vector Search Debugger Page
 *
 * Development-only tool for testing semantic search quality.
 * This page should only be accessible in development environments.
 *
 * @route /debug/vector-search
 */
export default function VectorSearchDebuggerPage() {
  // In production, this route should not be accessible
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            404 - Page Not Found
          </h1>
          <p className="text-gray-600">
            This page is only available in development environments.
          </p>
        </div>
      </div>
    );
  }

  return <VectorSearchDebugger />;
}

/**
 * Metadata for the debug page
 */
export const metadata = {
  title: 'Vector Search Debugger | Olympus',
  description: 'Development tool for testing semantic search quality',
};
