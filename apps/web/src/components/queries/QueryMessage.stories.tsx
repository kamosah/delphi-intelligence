import type { Meta, StoryObj } from '@storybook/nextjs';
import { QueryMessage } from './QueryMessage';

const meta = {
  title: 'Queries/QueryMessage',
  component: QueryMessage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    role: {
      control: 'select',
      options: ['user', 'assistant'],
      description: 'The sender of the message',
    },
    content: {
      control: 'text',
      description: 'The message content',
    },
    timestamp: {
      control: 'date',
      description: 'When the message was sent',
    },
    confidenceScore: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'AI confidence score (0-1) for assistant messages',
    },
  },
} satisfies Meta<typeof QueryMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * User message with simple text.
 */
export const UserMessage: Story = {
  args: {
    role: 'user',
    content: 'What are the key financial risks mentioned in the Q4 report?',
    timestamp: new Date('2024-01-15T10:30:00'),
  },
};

/**
 * Assistant message with formatted markdown response.
 */
export const AssistantMessage: Story = {
  args: {
    role: 'assistant',
    content: `Based on the Q4 financial report, the key risks include:

1. **Market volatility** - Uncertainty in global markets may impact revenue projections
2. **Supply chain disruptions** - Ongoing logistics challenges could affect operations
3. **Regulatory changes** - New compliance requirements in several jurisdictions

These risks are being actively monitored and mitigation strategies are in place.`,
    timestamp: new Date('2024-01-15T10:30:15'),
    confidenceScore: 0.89,
  },
};

/**
 * Assistant message with high confidence.
 */
export const HighConfidence: Story = {
  args: {
    role: 'assistant',
    content:
      'The total revenue for Q4 2024 was $125.5 million, representing a 23% increase year-over-year.',
    timestamp: new Date('2024-01-15T14:20:00'),
    confidenceScore: 0.97,
  },
};

/**
 * Assistant message with medium confidence.
 */
export const MediumConfidence: Story = {
  args: {
    role: 'assistant',
    content:
      'The projected growth rate for 2025 appears to be approximately 15-20% based on the available data, though this may vary depending on market conditions.',
    timestamp: new Date('2024-01-15T14:25:00'),
    confidenceScore: 0.72,
  },
};

/**
 * Assistant message with low confidence.
 */
export const LowConfidence: Story = {
  args: {
    role: 'assistant',
    content:
      'Based on limited information in the documents, the expansion timeline is unclear. Additional documentation may be needed for a more precise answer.',
    timestamp: new Date('2024-01-15T14:30:00'),
    confidenceScore: 0.48,
  },
};

/**
 * Assistant message with code block.
 */
export const WithCodeBlock: Story = {
  args: {
    role: 'assistant',
    content: `Here's how to calculate the compound annual growth rate (CAGR):

\`\`\`python
def calculate_cagr(beginning_value, ending_value, num_years):
    """
    Calculate CAGR given beginning and ending values.
    """
    return ((ending_value / beginning_value) ** (1 / num_years)) - 1

# Example from Q4 report
cagr = calculate_cagr(100_000_000, 125_500_000, 1)
print(f"Growth rate: {cagr:.1%}")  # Output: 25.5%
\`\`\`

This calculation shows the 25.5% year-over-year growth mentioned in the financial report.`,
    timestamp: new Date('2024-01-15T15:00:00'),
    confidenceScore: 0.94,
  },
};

/**
 * Assistant message with table.
 */
export const WithTable: Story = {
  args: {
    role: 'assistant',
    content: `Here's a summary of the quarterly performance:

| Quarter | Revenue | Growth | Margin |
|---------|---------|--------|--------|
| Q1 2024 | $98M    | 18%    | 32%    |
| Q2 2024 | $105M   | 20%    | 34%    |
| Q3 2024 | $115M   | 22%    | 35%    |
| Q4 2024 | $125M   | 23%    | 36%    |

The trend shows consistent growth throughout the year with improving margins.`,
    timestamp: new Date('2024-01-15T16:00:00'),
    confidenceScore: 0.91,
  },
};

/**
 * User message with multi-line text.
 */
export const MultiLineUser: Story = {
  args: {
    role: 'user',
    content: `Can you help me understand:
1. The revenue breakdown by segment
2. Which segments grew the fastest
3. Any concerning trends in the data`,
    timestamp: new Date('2024-01-15T10:00:00'),
  },
};

/**
 * Conversation thread showing multiple messages.
 */
export const Conversation: Story = {
  args: {
    role: 'user',
    content: 'What were the total sales in Q4?',
    timestamp: new Date('2024-01-15T10:00:00'),
  },
  render: () => (
    <div className="flex flex-col">
      <QueryMessage
        role="user"
        content="What were the total sales in Q4?"
        timestamp={new Date('2024-01-15T10:00:00')}
      />
      <QueryMessage
        role="assistant"
        content="Total sales in Q4 2024 were **$125.5 million**, representing a 23% increase compared to Q4 2023."
        timestamp={new Date('2024-01-15T10:00:15')}
        confidenceScore={0.96}
      />
      <QueryMessage
        role="user"
        content="What drove that growth?"
        timestamp={new Date('2024-01-15T10:01:00')}
      />
      <QueryMessage
        role="assistant"
        content={`The growth was driven by three main factors:

1. **Enterprise segment expansion** (40% of growth)
2. **New product launches** (35% of growth)
3. **International markets** (25% of growth)

The enterprise segment showed particularly strong performance with 45% year-over-year growth.`}
        timestamp={new Date('2024-01-15T10:01:20')}
        confidenceScore={0.88}
      />
    </div>
  ),
};

/**
 * Message without timestamp.
 */
export const NoTimestamp: Story = {
  args: {
    role: 'assistant',
    content: 'This message does not have a timestamp.',
  },
};
