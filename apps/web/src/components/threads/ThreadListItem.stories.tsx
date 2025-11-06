import type { Meta, StoryObj } from '@storybook/nextjs';
import { ThreadListItem } from './ThreadListItem';
import { SpaceProvider } from '@/contexts/SpaceContext';
import { List } from '@olympus/ui';
import { QueryStatusEnum } from '@/lib/api/generated';

const meta = {
  title: 'Threads/ThreadListItem',
  component: ThreadListItem,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <SpaceProvider spaceId="test-space-id">
        <div className="max-w-2xl">
          <List>
            <Story />
          </List>
        </div>
      </SpaceProvider>
    ),
  ],
} satisfies Meta<typeof ThreadListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    thread: {
      id: '1',
      queryText: 'What are the top performing products this quarter?',
      createdAt: new Date('2024-01-15').toISOString(),
      result: 'Based on the sales data...',
      spaceId: 'test-space-id',
      createdBy: 'user-1',
      title: null,
      context: null,
      confidenceScore: 0.95,
      sources: [],
      agentSteps: null,
      modelUsed: 'gpt-4',
      status: QueryStatusEnum.Completed,
      errorMessage: null,
      processingTimeMs: 1500,
      tokensUsed: 250,
      costUsd: 0.05,
      completedAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString(),
    },
  },
};

export const LongQuery: Story = {
  args: {
    thread: {
      id: '2',
      queryText:
        'Can you analyze the customer retention rates across all regions and provide insights into which marketing campaigns were most effective in driving repeat purchases during Q4 2023?',
      createdAt: new Date('2024-01-10').toISOString(),
      result: 'Analysis of customer retention...',
      spaceId: 'test-space-id',
      createdBy: 'user-1',
      title: null,
      context: null,
      confidenceScore: 0.88,
      sources: [],
      agentSteps: null,
      modelUsed: 'gpt-4',
      status: QueryStatusEnum.Completed,
      errorMessage: null,
      processingTimeMs: 2500,
      tokensUsed: 450,
      costUsd: 0.08,
      completedAt: new Date('2024-01-10').toISOString(),
      updatedAt: new Date('2024-01-10').toISOString(),
    },
  },
};

export const RecentThread: Story = {
  args: {
    thread: {
      id: '3',
      queryText: 'Show me the revenue breakdown by category',
      createdAt: new Date().toISOString(),
      result: 'Here is the revenue breakdown...',
      spaceId: 'test-space-id',
      createdBy: 'user-1',
      title: null,
      context: null,
      confidenceScore: 0.92,
      sources: [],
      agentSteps: null,
      modelUsed: 'gpt-4',
      status: QueryStatusEnum.Completed,
      errorMessage: null,
      processingTimeMs: 1200,
      tokensUsed: 180,
      costUsd: 0.03,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
};

export const MultipleItems: Story = {
  args: {
    thread: {
      id: '1',
      queryText: 'What are the top performing products?',
      createdAt: new Date('2024-01-15').toISOString(),
      result: 'Based on sales data...',
      spaceId: 'test-space-id',
      createdBy: 'user-1',
      title: null,
      context: null,
      confidenceScore: 0.95,
      sources: [],
      agentSteps: null,
      modelUsed: 'gpt-4',
      status: QueryStatusEnum.Completed,
      errorMessage: null,
      processingTimeMs: 1500,
      tokensUsed: 250,
      costUsd: 0.05,
      completedAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString(),
    },
  },
  render: () => (
    <>
      <ThreadListItem
        thread={{
          id: '1',
          queryText: 'What are the top performing products?',
          createdAt: new Date('2024-01-15').toISOString(),
          result: 'Based on sales data...',
          spaceId: 'test-space-id',
          createdBy: 'user-1',
          title: null,
          context: null,
          confidenceScore: 0.95,
          sources: [],
          agentSteps: null,
          modelUsed: 'gpt-4',
          status: QueryStatusEnum.Completed,
          errorMessage: null,
          processingTimeMs: 1500,
          tokensUsed: 250,
          costUsd: 0.05,
          completedAt: new Date('2024-01-15').toISOString(),
          updatedAt: new Date('2024-01-15').toISOString(),
        }}
      />
      <ThreadListItem
        thread={{
          id: '2',
          queryText: 'Analyze customer retention rates',
          createdAt: new Date('2024-01-12').toISOString(),
          result: 'Retention analysis shows...',
          spaceId: 'test-space-id',
          createdBy: 'user-1',
          title: null,
          context: null,
          confidenceScore: 0.88,
          sources: [],
          agentSteps: null,
          modelUsed: 'gpt-4',
          status: QueryStatusEnum.Completed,
          errorMessage: null,
          processingTimeMs: 2200,
          tokensUsed: 380,
          costUsd: 0.07,
          completedAt: new Date('2024-01-12').toISOString(),
          updatedAt: new Date('2024-01-12').toISOString(),
        }}
      />
      <ThreadListItem
        thread={{
          id: '3',
          queryText: 'Revenue breakdown by category',
          createdAt: new Date('2024-01-10').toISOString(),
          result: 'Revenue breakdown...',
          spaceId: 'test-space-id',
          createdBy: 'user-1',
          title: null,
          context: null,
          confidenceScore: 0.92,
          sources: [],
          agentSteps: null,
          modelUsed: 'gpt-4',
          status: QueryStatusEnum.Completed,
          errorMessage: null,
          processingTimeMs: 1800,
          tokensUsed: 290,
          costUsd: 0.05,
          completedAt: new Date('2024-01-10').toISOString(),
          updatedAt: new Date('2024-01-10').toISOString(),
        }}
      />
    </>
  ),
};
