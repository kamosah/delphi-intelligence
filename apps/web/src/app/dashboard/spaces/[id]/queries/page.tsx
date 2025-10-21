import type { Metadata } from 'next';
import { QueryInterface } from '@/components/queries/QueryInterface';

export const metadata: Metadata = {
  title: 'Queries - Olympus MVP',
  description: 'Ask questions about your documents with AI-powered responses',
};

interface QueriesPageProps {
  params: {
    id: string;
  };
}

/**
 * Queries page for a specific space.
 *
 * Provides a chat-style interface for asking natural language questions
 * about documents in the space, powered by LangGraph AI agent with
 * real-time streaming, citations, and confidence scoring.
 */
export default function QueriesPage({ params }: QueriesPageProps) {
  const spaceId = params.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Queries</h1>
        <p className="text-gray-600">
          Ask questions and get AI-powered answers with source citations.
        </p>
      </div>

      {/* Query Interface */}
      <QueryInterface spaceId={spaceId} />
    </div>
  );
}
