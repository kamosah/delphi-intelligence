'use client';

import { useDebounce } from '@/hooks/useDebounce';
import {
  useSearchDocuments,
  type SearchDocumentsInput,
} from '@/hooks/useVectorSearch';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Progress,
  ScrollArea,
  Separator,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@olympus/ui';
import {
  AlertCircle,
  Clock,
  FileText,
  Info,
  Search,
  Sparkles,
} from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

/**
 * VectorSearchDebugger - Development tool for testing semantic search quality
 *
 * Features:
 * - Debounced search for better performance
 * - Real-time search with parameter tuning
 * - Similarity score visualization
 * - Document chunk previews
 * - Source metadata display
 * - Optimized re-renders with memoization
 *
 * Design: Hex aesthetic with gradients, rounded corners, and professional data-first layout
 */
export function VectorSearchDebugger() {
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.0);
  const [spaceId, setSpaceId] = useState('');
  const [documentIds, setDocumentIds] = useState('');

  // Debounce search query to avoid excessive API calls (500ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Memoize search input to prevent unnecessary re-renders
  const searchInput: SearchDocumentsInput = useMemo(
    () => ({
      query: debouncedSearchQuery,
      limit,
      similarityThreshold,
      ...(spaceId && { spaceId }),
      ...(documentIds && {
        documentIds: documentIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      }),
    }),
    [debouncedSearchQuery, limit, similarityThreshold, spaceId, documentIds]
  );

  const { results, isLoading, error } = useSearchDocuments(searchInput);

  // Track if user is typing (debounce in progress)
  const isTyping = searchQuery !== debouncedSearchQuery;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Vector Search Debugger
          </h1>
          <p className="text-sm text-gray-500">
            Test semantic search quality and tune parameters
          </p>
        </div>
        <Badge variant="outline" className="ml-auto">
          Dev Only
        </Badge>
      </div>

      {/* Quick Start Guide */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-900">To test vector search:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Upload a document to a space (use the main app)</li>
              <li>Wait for processing to complete (status: PROCESSED)</li>
              <li>
                Enter a search query below (e.g., "frontend engineer", "React
                experience")
              </li>
              <li>Results update automatically after 500ms of typing</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              💡 Tip: Leave filters empty to search all documents
            </Badge>
            <Badge variant="outline" className="text-xs">
              📊 Similarity 0.7+ = high quality
            </Badge>
            <Badge variant="outline" className="text-xs">
              ⚡ Performance target: {'<'}500ms
            </Badge>
          </div>

          {/* Example Queries */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">
              Example queries to try:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'revenue growth and financial performance metrics',
                'revenue growth',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setSearchQuery(example)}
                  className="text-xs px-2 py-1 rounded bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search Parameters</CardTitle>
          <CardDescription>
            Enter a query to find semantically similar document chunks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Query Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="query">Search Query</Label>
              {isTyping && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  Typing...
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="query"
                placeholder="What is artificial intelligence?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500">
              Search updates automatically after you stop typing (500ms delay)
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Limit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="limit">Result Limit</Label>
                <span className="text-sm text-gray-500">{limit}</span>
              </div>
              <input
                id="limit"
                type="range"
                min="1"
                max="50"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Similarity Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Label htmlFor="threshold">Similarity Threshold</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Minimum similarity score (0.0-1.0). Higher values =
                          more selective. 0.7+ is typically high quality.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm text-gray-500">
                  {similarityThreshold.toFixed(2)}
                </span>
              </div>
              <input
                id="threshold"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={similarityThreshold}
                onChange={(e) =>
                  setSimilarityThreshold(parseFloat(e.target.value))
                }
                className="w-full accent-purple-500"
              />
            </div>
          </div>

          <Separator />

          {/* Optional Filters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="spaceId">Space ID (optional)</Label>
              <Input
                id="spaceId"
                placeholder="Filter by space"
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentIds">
                Document IDs (optional, comma-separated)
              </Label>
              <Input
                id="documentIds"
                placeholder="doc-1, doc-2"
                value={documentIds}
                onChange={(e) => setDocumentIds(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                {results.length > 0
                  ? `Found ${results.length} semantically similar chunks`
                  : 'Enter a query to see results'}
              </CardDescription>
            </div>
            {isLoading && (
              <Badge className="bg-blue-100 text-blue-700">Searching...</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span>Error: {error.message}</span>
            </div>
          )}

          {!error &&
            results.length === 0 &&
            debouncedSearchQuery &&
            !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-sm text-gray-500">
                  No results found. Try lowering the similarity threshold or
                  changing your query.
                </p>
              </div>
            )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <SearchResultSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <SearchResultCard
                    key={result.chunk.id}
                    result={result}
                    rank={index + 1}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Loading skeleton for search results
 */
function SearchResultSkeleton() {
  return (
    <Card className="border-l-4 border-l-gray-300">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual search result card with similarity score and metadata
 * Memoized to prevent unnecessary re-renders
 */
const SearchResultCard = memo(function SearchResultCard({
  result,
  rank,
}: {
  result: any;
  rank: number;
}) {
  const { chunk, document, similarityScore, distance } = result;

  // Memoize color and label functions
  const getScoreColor = useCallback((score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-700';
    if (score >= 0.6) return 'bg-blue-100 text-blue-700';
    if (score >= 0.4) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  }, []);

  const getScoreLabel = useCallback((score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Low';
  }, []);

  const scoreColor = useMemo(
    () => getScoreColor(similarityScore),
    [similarityScore, getScoreColor]
  );
  const scoreLabel = useMemo(
    () => getScoreLabel(similarityScore),
    [similarityScore, getScoreLabel]
  );

  return (
    <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                Rank #{rank}
              </Badge>
              <Badge className={scoreColor}>
                {scoreLabel}: {(similarityScore * 100).toFixed(1)}%
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span className="font-medium">{document.name}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-xs">Chunk {chunk.chunkIndex + 1}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Similarity Score Visualization */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Similarity Score</span>
            <span className="font-mono text-gray-900">
              {similarityScore.toFixed(4)} (distance: {distance.toFixed(4)})
            </span>
          </div>
          <Progress value={similarityScore * 100} className="h-2" />
        </div>

        {/* Chunk Text Preview */}
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-800 leading-relaxed">
            {chunk.chunkText}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="font-medium">Tokens:</span>
            <span>{chunk.tokenCount}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <span className="font-medium">Position:</span>
            <span className="font-mono">
              {chunk.startChar}-{chunk.endChar}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <span className="font-medium">File Type:</span>
            <span>{document.fileType}</span>
          </div>
          {chunk.chunkMetadata?.page_num && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1">
                <span className="font-medium">Page:</span>
                <span>{chunk.chunkMetadata.page_num}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
