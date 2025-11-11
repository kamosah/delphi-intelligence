import type { Meta, StoryObj } from '@storybook/nextjs';
import { CitationCard } from './CitationCard';
import type { Citation } from '@/lib/api/queries-client';

const meta = {
  title: 'Queries/CitationCard',
  component: CitationCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    citation: {
      description: 'The citation object containing source information',
    },
  },
} satisfies Meta<typeof CitationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const highRelevanceCitation: Citation = {
  index: 1,
  text: 'The company reported a 25% increase in revenue year-over-year, driven primarily by strong performance in the enterprise segment and successful expansion into new markets.',
  document_id: 'doc-123',
  document_title: 'Q4 2024 Financial Report',
  chunk_index: 0,
  similarity_score: 0.95,
};

const mediumRelevanceCitation: Citation = {
  index: 2,
  text: 'Risk management strategies include diversification of revenue streams, maintaining adequate cash reserves, and implementing robust cybersecurity measures.',
  document_id: 'doc-456',
  document_title: 'Risk Assessment Analysis',
  chunk_index: 2,
  similarity_score: 0.72,
};

const lowRelevanceCitation: Citation = {
  index: 3,
  text: 'The board of directors meets quarterly to review strategic initiatives and provide governance oversight for the organization.',
  document_id: 'doc-789',
  document_title: 'Corporate Governance Policy',
  chunk_index: 5,
  similarity_score: 0.48,
};

const longTextCitation: Citation = {
  index: 4,
  text: 'This is a very long citation that will be clamped to three lines. It contains detailed information about the financial performance of the company, including revenue growth, profit margins, operational efficiency metrics, customer acquisition costs, lifetime value calculations, and various other key performance indicators that investors and stakeholders use to evaluate the health and trajectory of the business.',
  document_id: 'doc-101',
  document_title: 'Comprehensive Financial Analysis 2024',
  chunk_index: 10,
  similarity_score: 0.88,
};

const noTitleCitation: Citation = {
  index: 5,
  text: 'This citation comes from a document without a title in the metadata.',
  document_id: 'doc-202',
  chunk_index: 0,
  similarity_score: 0.65,
};

/**
 * Citation with high relevance score (>= 80%).
 * Shows green relevance indicator.
 */
export const HighRelevance: Story = {
  args: {
    citation: highRelevanceCitation,
  },
};

/**
 * Citation with medium relevance score (60-79%).
 * Shows yellow relevance indicator.
 */
export const MediumRelevance: Story = {
  args: {
    citation: mediumRelevanceCitation,
  },
};

/**
 * Citation with low relevance score (< 60%).
 * Shows gray relevance indicator.
 */
export const LowRelevance: Story = {
  args: {
    citation: lowRelevanceCitation,
  },
};

/**
 * Citation with very long text.
 * Text is clamped to 3 lines with ellipsis.
 */
export const LongText: Story = {
  args: {
    citation: longTextCitation,
  },
};

/**
 * Citation without document title.
 * Title section is not rendered.
 */
export const NoDocumentTitle: Story = {
  args: {
    citation: noTitleCitation,
  },
};

/**
 * Multiple citations in a grid layout.
 */
export const MultipleInGrid: Story = {
  args: {
    citation: highRelevanceCitation,
  },
  render: () => (
    <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
      <CitationCard citation={highRelevanceCitation} />
      <CitationCard citation={mediumRelevanceCitation} />
      <CitationCard citation={lowRelevanceCitation} />
      <CitationCard citation={longTextCitation} />
    </div>
  ),
};

/**
 * Single citation at full width.
 */
export const FullWidth: Story = {
  args: {
    citation: highRelevanceCitation,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};
