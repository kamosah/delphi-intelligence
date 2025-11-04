import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';
import React from 'react';
import { ThreadInput } from './ThreadInput';

const meta = {
  title: 'Threads/ThreadInput',
  component: ThreadInput,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: {
      description: 'Callback function when query is submitted',
    },
    isStreaming: {
      control: 'boolean',
      description: 'Whether a query is currently being processed',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the textarea',
    },
  },
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof ThreadInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default thread input ready for user interaction.
 */
export const Default: Story = {
  args: {
    isStreaming: false,
    disabled: false,
  },
};

/**
 * Thread input in streaming state (loading).
 * Button shows loading spinner and input is disabled.
 */
export const Streaming: Story = {
  args: {
    isStreaming: true,
  },
};

/**
 * Disabled thread input.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

/**
 * Custom placeholder text.
 */
export const CustomPlaceholder: Story = {
  args: {
    placeholder: 'What would you like to know about these documents?',
  },
};

/**
 * Interactive example showing all states.
 */
export const Interactive: Story = {
  render: () => {
    const [isStreaming, setIsStreaming] = React.useState(false);

    const handleSubmit = (query: string) => {
      console.log('Submitted query:', query);
      // Simulate streaming delay
      setIsStreaming(true);
      setTimeout(() => {
        setIsStreaming(false);
      }, 3000);
    };

    return <ThreadInput onSubmit={handleSubmit} isStreaming={isStreaming} />;
  },
};

/**
 * Thread input with helpful tip about character limit.
 */
export const WithCharacterLimit: Story = {
  render: () => {
    const handleSubmit = (query: string) => {
      console.log('Submitted query:', query);
    };

    return (
      <div>
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            💡 <strong>Tip:</strong> Type more than 500 characters to see the
            character limit warning.
          </p>
        </div>
        <ThreadInput onSubmit={handleSubmit} />
      </div>
    );
  },
};

/**
 * Thread input in a chat-style layout.
 */
export const InChatLayout: Story = {
  render: () => {
    const handleSubmit = (query: string) => {
      console.log('Submitted query:', query);
    };

    return (
      <div className="flex flex-col h-screen">
        {/* Mock chat messages */}
        <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">You</p>
              <p className="text-gray-900">What are the key risks mentioned?</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 shadow-sm">
              <p className="text-sm text-purple-600 mb-1">Athena AI</p>
              <p className="text-gray-900">
                Based on the documents, the key risks include...
              </p>
            </div>
          </div>
        </div>

        {/* Thread input at bottom */}
        <ThreadInput onSubmit={handleSubmit} />
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
  },
};
