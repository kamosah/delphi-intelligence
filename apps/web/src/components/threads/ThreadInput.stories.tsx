import type { Meta, StoryObj } from '@storybook/nextjs';
import { fn } from '@storybook/test';
import React from 'react';
import { ThreadInput } from './ThreadInput';

const meta = {
  title: 'Threads/ThreadInput',
  component: ThreadInput,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Thread input component using TipTap rich text editor. Supports Enter to send, Shift+Enter for new line. Phase 2 will add @user, @database, and #space mentions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: {
      description: 'Callback function when query is submitted (Enter key)',
    },
    isStreaming: {
      control: 'boolean',
      description: 'Whether a query is currently being processed',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the editor is disabled',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the TipTap editor',
    },
  },
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof ThreadInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default thread input with TipTap editor ready for user interaction.
 * Try typing and pressing Enter to submit, or Shift+Enter for a new line.
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

/**
 * Demonstrates TipTap keyboard shortcuts with visual feedback.
 * - Enter: Submit query
 * - Shift+Enter: Add new line
 * - Cmd/Ctrl+Enter: Force submit
 */
export const KeyboardShortcuts: Story = {
  render: () => {
    const [submissions, setSubmissions] = React.useState<string[]>([]);

    const handleSubmit = (query: string) => {
      console.log('Submitted query:', query);
      setSubmissions([...submissions, query]);
    };

    return (
      <div className="p-8 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            ⌨️ Keyboard Shortcuts
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300">
                Enter
              </kbd>{' '}
              - Submit query
            </li>
            <li>
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300">
                Shift
              </kbd>{' '}
              +{' '}
              <kbd className="px-2 py-1 bg-white rounded border border-blue-300">
                Enter
              </kbd>{' '}
              - Add new line
            </li>
          </ul>
        </div>

        <ThreadInput onSubmit={handleSubmit} />

        {submissions.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Submitted Queries:
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              {submissions.map((query, index) => (
                <li
                  key={index}
                  className="bg-white p-2 rounded border border-gray-200"
                >
                  <span className="text-gray-500">#{index + 1}:</span> {query}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
};
