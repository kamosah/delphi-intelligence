import type { Meta, StoryObj } from '@storybook/nextjs';
import { CitationList } from './CitationList';
import type { Citation } from '@/lib/api/queries-client';

const meta = {
  title: 'Queries/CitationList',
  component: CitationList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CitationList>;

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
  {
    index: 3,
    text: 'The board of directors meets quarterly to review strategic initiatives and provide governance oversight for the organization.',
    document_id: 'doc-789',
    document_title: 'Corporate Governance Policy',
    chunk_index: 5,
    similarity_score: 0.48,
  },
];

const manyCitations: Citation[] = [
  ...sampleCitations,
  {
    index: 4,
    text: 'Customer satisfaction scores have improved by 15 percentage points following the implementation of new support protocols.',
    document_id: 'doc-111',
    document_title: 'Customer Success Metrics Q4',
    chunk_index: 1,
    similarity_score: 0.88,
  },
  {
    index: 5,
    text: 'The product roadmap for 2025 includes significant investments in AI capabilities and platform scalability.',
    document_id: 'doc-222',
    document_title: 'Product Strategy 2025',
    chunk_index: 3,
    similarity_score: 0.82,
  },
  {
    index: 6,
    text: 'Compliance with industry regulations requires ongoing monitoring and periodic audits of data handling practices.',
    document_id: 'doc-333',
    document_title: 'Compliance Framework',
    chunk_index: 7,
    similarity_score: 0.67,
  },
];

/**
 * Empty state when no citations are provided.
 */
export const Empty: Story = {
  args: {
    citations: [],
  },
};

/**
 * Single citation.
 */
export const SingleCitation: Story = {
  args: {
    citations: [sampleCitations[0]],
  },
};

/**
 * Two citations in grid layout.
 */
export const TwoCitations: Story = {
  args: {
    citations: sampleCitations.slice(0, 2),
  },
};

/**
 * Three citations showing full grid.
 */
export const ThreeCitations: Story = {
  args: {
    citations: sampleCitations,
  },
};

/**
 * Many citations (6+) showing scrollable grid.
 */
export const ManyCitations: Story = {
  args: {
    citations: manyCitations,
  },
};

/**
 * Full-width container for citations.
 */
export const FullWidth: Story = {
  args: {
    citations: sampleCitations,
  },
  decorators: [
    (Story) => (
      <div className="max-w-4xl mx-auto">
        <Story />
      </div>
    ),
  ],
};

/**
 * Citations with mixed relevance scores.
 */
export const MixedRelevance: Story = {
  args: {
    citations: [
      {
        index: 1,
        text: 'High relevance citation with score above 80%.',
        document_id: 'doc-h1',
        document_title: 'High Relevance Document',
        chunk_index: 0,
        similarity_score: 0.92,
      },
      {
        index: 2,
        text: 'Medium relevance citation with score between 60-80%.',
        document_id: 'doc-m1',
        document_title: 'Medium Relevance Document',
        chunk_index: 0,
        similarity_score: 0.68,
      },
      {
        index: 3,
        text: 'Low relevance citation with score below 60%.',
        document_id: 'doc-l1',
        document_title: 'Low Relevance Document',
        chunk_index: 0,
        similarity_score: 0.42,
      },
      {
        index: 4,
        text: 'Another high relevance citation to demonstrate variety.',
        document_id: 'doc-h2',
        document_title: 'Another High Relevance Document',
        chunk_index: 0,
        similarity_score: 0.87,
      },
    ],
  },
};
