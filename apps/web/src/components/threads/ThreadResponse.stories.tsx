import type { Meta, StoryObj } from '@storybook/nextjs';
import React from 'react';
import { ThreadResponse } from './ThreadResponse';
import type { Citation } from '@/lib/api/queries-client';
import { fn } from '@storybook/test';

const meta = {
  title: 'Threads/ThreadResponse',
  component: ThreadResponse,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onRetry: fn(),
  },
} satisfies Meta<typeof ThreadResponse>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleCitations: Citation[] = [
  {
    index: 1,
    text: 'The company reported a 25% increase in revenue year-over-year, driven primarily by strong performance in the enterprise segment.',
    document_id: 'doc-123',
    document_title: 'Q4 2024 Financial Report',
    chunk_index: 0,
    similarity_score: 0.95,
  },
  {
    index: 2,
    text: 'Risk management strategies include diversification of revenue streams, maintaining adequate cash reserves, and implementing robust cybersecurity measures.',
    document_id: 'doc-456',
    document_title: 'Risk Assessment Analysis',
    chunk_index: 2,
    similarity_score: 0.72,
  },
];

const longResponse = `Based on my analysis of your documents, here are the key financial highlights from Q4 2024:

## Revenue Performance

The company achieved **$125.5 million** in total revenue, representing a 25% year-over-year increase [1]. This growth was driven by:

1. **Enterprise segment**: 45% growth, now representing 60% of total revenue
2. **SMB segment**: 12% growth, steady performance
3. **New markets**: Successful expansion into APAC region

## Profitability Metrics

- **Gross margin**: 68% (up from 65% in Q4 2023)
- **Operating margin**: 22% (improved by 3 percentage points)
- **Net income**: $27.6 million

## Risk Factors

While the financial performance is strong, the following risks require attention [2]:

- Market volatility in certain regions
- Competitive pressure from new entrants
- Regulatory changes in data privacy laws

## Recommendations

1. Continue investing in enterprise sales infrastructure
2. Diversify revenue streams to mitigate concentration risk
3. Strengthen risk management protocols

For technical implementation details on risk scoring, see the following pattern:

\`\`\`python
def calculate_risk_score(metrics: dict) -> float:
    weights = {'market': 0.3, 'competition': 0.5, 'regulatory': 0.2}
    return sum(metrics.get(key, 0) * weight for key, weight in weights.items())
\`\`\``;

/**
 * Loading state before any content arrives.
 */
export const Loading: Story = {
  args: {
    response: '',
    citations: [],
    isStreaming: true,
    error: null,
  },
};

/**
 * Streaming state with partial content.
 */
export const Streaming: Story = {
  args: {
    response:
      'Based on my analysis of your documents, here are the key financial highlights from Q4 2024:\n\n## Revenue Performance\n\nThe company achieved **$125.5 million** in total revenue...',
    citations: [],
    isStreaming: true,
    error: null,
  },
};

/**
 * Complete response with citations.
 */
export const Complete: Story = {
  args: {
    response: longResponse,
    citations: sampleCitations,
    isStreaming: false,
    error: null,
    confidenceScore: 0.89,
  },
};

/**
 * Response with high confidence score.
 */
export const HighConfidence: Story = {
  args: {
    response:
      'The total revenue for Q4 2024 was **$125.5 million**, representing a 25% increase year-over-year.',
    citations: [sampleCitations[0]],
    isStreaming: false,
    error: null,
    confidenceScore: 0.96,
  },
};

/**
 * Response with medium confidence score.
 */
export const MediumConfidence: Story = {
  args: {
    response:
      'Based on the available data, the projected growth rate for 2025 appears to be approximately **15-20%**, though this may vary depending on market conditions.',
    citations: sampleCitations,
    isStreaming: false,
    error: null,
    confidenceScore: 0.72,
  },
};

/**
 * Response with low confidence score.
 */
export const LowConfidence: Story = {
  args: {
    response:
      'The expansion timeline is not clearly specified in the available documents. Additional information may be needed for a precise answer.',
    citations: [sampleCitations[1]],
    isStreaming: false,
    error: null,
    confidenceScore: 0.48,
  },
};

/**
 * Error state with retry button.
 */
export const Error: Story = {
  args: {
    response: '',
    citations: [],
    isStreaming: false,
    error:
      'Failed to process query. The AI service is temporarily unavailable.',
  },
};

/**
 * Network error.
 */
export const NetworkError: Story = {
  args: {
    response: '',
    citations: [],
    isStreaming: false,
    error:
      'Network connection lost. Please check your internet connection and try again.',
  },
};

/**
 * Response without citations.
 */
export const NoCitations: Story = {
  args: {
    response:
      'I apologize, but I could not find relevant information in the available documents to answer this question. Please try rephrasing your query or upload additional documents.',
    citations: [],
    isStreaming: false,
    error: null,
    confidenceScore: 0.25,
  },
};

/**
 * Short response with one citation.
 */
export const ShortResponse: Story = {
  args: {
    response: 'The Q4 revenue was **$125.5 million**.',
    citations: [sampleCitations[0]],
    isStreaming: false,
    error: null,
    confidenceScore: 0.94,
  },
};

/**
 * Empty state (no response yet).
 */
export const Empty: Story = {
  args: {
    response: '',
    citations: [],
    isStreaming: false,
    error: null,
  },
};

/**
 * Simulated streaming animation.
 */
export const StreamingAnimation: Story = {
  args: {
    response: '',
    citations: [],
    isStreaming: false,
    error: null,
  },
  render: () => {
    const [response, setResponse] = React.useState('');
    const [isStreaming, setIsStreaming] = React.useState(false);
    const [citations, setCitations] = React.useState<Citation[]>([]);

    const startStreaming = () => {
      setResponse('');
      setCitations([]);
      setIsStreaming(true);

      const fullText = longResponse;
      let currentIndex = 0;

      const interval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setResponse(fullText.slice(0, currentIndex + 5));
          currentIndex += 5;
        } else {
          setIsStreaming(false);
          setCitations(sampleCitations);
          clearInterval(interval);
        }
      }, 50);
    };

    return (
      <div>
        <div className="mb-4">
          <button
            onClick={startStreaming}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={isStreaming}
          >
            {isStreaming ? 'Streaming...' : 'Start Streaming'}
          </button>
        </div>
        <ThreadResponse
          response={response}
          citations={citations}
          isStreaming={isStreaming}
          error={null}
          confidenceScore={isStreaming ? undefined : 0.89}
        />
      </div>
    );
  },
};
