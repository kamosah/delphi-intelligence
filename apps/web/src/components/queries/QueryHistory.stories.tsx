import type { Meta, StoryObj } from '@storybook/nextjs';
import { http, HttpResponse, delay } from 'msw';
import { QueryHistory } from './QueryHistory';
import type { QueryResult } from '@/hooks/useQueryResults';

const meta = {
  title: 'Queries/QueryHistory',
  component: QueryHistory,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof QueryHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockQueries: QueryResult[] = [
  {
    id: '1',
    queryText: 'What are the key financial risks mentioned in the Q4 report?',
    result:
      'The key risks include market volatility, supply chain disruptions, and regulatory changes.',
    confidenceScore: 0.89,
    spaceId: 'space-123',
    createdBy: 'user-456',
    sources: null,
    agentSteps: null,
    createdAt: new Date('2024-01-15T10:30:00').toISOString(),
    updatedAt: new Date('2024-01-15T10:30:15').toISOString(),
  },
  {
    id: '2',
    queryText: 'What was the total revenue in Q4 2024?',
    result: 'Total revenue in Q4 2024 was $125.5 million.',
    confidenceScore: 0.96,
    spaceId: 'space-123',
    createdBy: 'user-456',
    sources: null,
    agentSteps: null,
    createdAt: new Date('2024-01-15T09:15:00').toISOString(),
    updatedAt: new Date('2024-01-15T09:15:10').toISOString(),
  },
  {
    id: '3',
    queryText: 'Which business segments showed the strongest growth?',
    result: 'The enterprise segment showed 45% growth, while SMB grew 12%.',
    confidenceScore: 0.92,
    spaceId: 'space-123',
    createdBy: 'user-456',
    sources: null,
    agentSteps: null,
    createdAt: new Date('2024-01-15T08:00:00').toISOString(),
    updatedAt: new Date('2024-01-15T08:00:12').toISOString(),
  },
  {
    id: '4',
    queryText: 'What are the projected growth rates for 2025?',
    result:
      'Projected growth for 2025 is approximately 15-20% based on current trends.',
    confidenceScore: 0.72,
    spaceId: 'space-123',
    createdBy: 'user-456',
    sources: null,
    agentSteps: null,
    createdAt: new Date('2024-01-14T16:45:00').toISOString(),
    updatedAt: new Date('2024-01-14T16:45:18').toISOString(),
  },
  {
    id: '5',
    queryText: 'What cost reduction strategies are mentioned?',
    result:
      'The document mentions automation, process optimization, and vendor consolidation.',
    confidenceScore: 0.85,
    spaceId: 'space-123',
    createdBy: 'user-456',
    sources: null,
    agentSteps: null,
    createdAt: new Date('2024-01-14T14:20:00').toISOString(),
    updatedAt: new Date('2024-01-14T14:20:15').toISOString(),
  },
];

const longQueryList: QueryResult[] = [
  ...mockQueries,
  {
    id: '6',
    queryText:
      'This is a very long query that will be truncated to show how the component handles text that exceeds the available space in the sidebar',
    result: 'Response text',
    confidenceScore: 0.78,
    spaceId: 'space-123',
    createdBy: 'user-456',
    sources: null,
    agentSteps: null,
    createdAt: new Date('2024-01-13T11:00:00').toISOString(),
    updatedAt: new Date('2024-01-13T11:00:15').toISOString(),
  },
  {
    id: '7',
    queryText: 'What are the hiring plans for Q1 2025?',
    result: 'Plans to hire 50 new employees in engineering and sales.',
    confidenceScore: 0.68,
    spaceId: 'space-123',
    createdBy: 'user-456',
    sources: null,
    agentSteps: null,
    createdAt: new Date('2024-01-12T09:30:00').toISOString(),
    updatedAt: new Date('2024-01-12T09:30:12').toISOString(),
  },
  {
    id: '8',
    queryText: 'What customer satisfaction metrics are reported?',
    result: 'NPS score of 72, up 8 points from previous quarter.',
    confidenceScore: 0.91,
    spaceId: 'space-123',
    createdBy: 'user-456',
    sources: null,
    agentSteps: null,
    createdAt: new Date('2024-01-11T15:00:00').toISOString(),
    updatedAt: new Date('2024-01-11T15:00:14').toISOString(),
  },
];

/**
 * Loading state while fetching query history.
 */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/api/queries', async () => {
          await delay('infinite');
        }),
      ],
    },
  },
  args: {
    spaceId: 'space-123',
  },
};

/**
 * Empty state when no queries exist.
 */
export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/api/queries', () => {
          return HttpResponse.json({
            queries: [],
            total: 0,
          });
        }),
      ],
    },
  },
  args: {
    spaceId: 'space-123',
  },
};

/**
 * Error state when query history fails to load.
 */
export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/api/queries', () => {
          return HttpResponse.json(
            { error: 'Failed to fetch queries' },
            { status: 500 }
          );
        }),
      ],
    },
  },
  args: {
    spaceId: 'space-123',
  },
};

/**
 * Few queries (3-5 items).
 */
export const FewQueries: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/api/queries', () => {
          return HttpResponse.json({
            queries: mockQueries.slice(0, 3),
            total: 3,
          });
        }),
      ],
    },
  },
  args: {
    spaceId: 'space-123',
    onSelectQuery: (query) => console.log('Selected query:', query),
  },
};

/**
 * Multiple queries showing scrollable list.
 */
export const ManyQueries: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/api/queries', () => {
          return HttpResponse.json({
            queries: longQueryList,
            total: longQueryList.length,
          });
        }),
      ],
    },
  },
  args: {
    spaceId: 'space-123',
    onSelectQuery: (query) => console.log('Selected query:', query),
  },
};

/**
 * Single query in history.
 */
export const SingleQuery: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/api/queries', () => {
          return HttpResponse.json({
            queries: [mockQueries[0]],
            total: 1,
          });
        }),
      ],
    },
  },
  args: {
    spaceId: 'space-123',
  },
};

/**
 * Query history with mixed confidence scores.
 */
export const MixedConfidence: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/api/queries', () => {
          const mixedQueries: QueryResult[] = [
            { ...mockQueries[0], confidenceScore: 0.95 },
            { ...mockQueries[1], confidenceScore: 0.68 },
            { ...mockQueries[2], confidenceScore: 0.42 },
            { ...mockQueries[3], confidenceScore: 0.88 },
          ];
          return HttpResponse.json({
            queries: mixedQueries,
            total: mixedQueries.length,
          });
        }),
      ],
    },
  },
  args: {
    spaceId: 'space-123',
  },
};

/**
 * Full height layout showing scrolling behavior.
 */
export const FullHeight: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/api/queries', () => {
          return HttpResponse.json({
            queries: longQueryList,
            total: longQueryList.length,
          });
        }),
      ],
    },
  },
  render: (args) => (
    <div style={{ height: '600px' }}>
      <QueryHistory {...args} />
    </div>
  ),
  args: {
    spaceId: 'space-123',
  },
};

/**
 * Query history in a complete layout with main content area.
 */
export const InLayout: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('http://localhost:8000/api/queries', () => {
          return HttpResponse.json({
            queries: mockQueries,
            total: mockQueries.length,
          });
        }),
      ],
    },
  },
  render: (args) => (
    <div className="flex h-[600px] border border-gray-200 rounded-lg overflow-hidden">
      <QueryHistory {...args} />
      <div className="flex-1 bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Query Interface
          </h1>
          <p className="text-gray-600">
            Select a query from the history sidebar to view its details, or
            start a new query below.
          </p>
        </div>
      </div>
    </div>
  ),
  args: {
    spaceId: 'space-123',
  },
};
