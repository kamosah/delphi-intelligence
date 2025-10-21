import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './textarea';
import { Label } from './label';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the textarea is disabled',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    rows: {
      control: 'number',
      description: 'Number of visible text lines',
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default textarea with placeholder.
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
};

/**
 * Textarea with custom rows.
 */
export const CustomHeight: Story = {
  args: {
    placeholder: 'Enter a long message...',
    rows: 8,
  },
};

/**
 * Disabled textarea.
 */
export const Disabled: Story = {
  args: {
    placeholder: 'This textarea is disabled',
    disabled: true,
  },
};

/**
 * Textarea with existing value.
 */
export const WithValue: Story = {
  args: {
    value:
      'This is some existing text content.\nIt can span multiple lines.\nEach line is separated by a newline character.',
  },
};

/**
 * Textarea with label.
 */
export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="message">Your message</Label>
      <Textarea id="message" placeholder="Type your message here" />
    </div>
  ),
};

/**
 * Textarea with label and helper text.
 */
export const WithLabelAndHelper: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="message-2">Feedback</Label>
      <Textarea id="message-2" placeholder="Share your feedback..." />
      <p className="text-sm text-muted-foreground">
        Your feedback helps us improve our product.
      </p>
    </div>
  ),
};

/**
 * Textarea for chat-style query input.
 */
export const QueryInput: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Textarea
        placeholder="Ask a question about your documents..."
        rows={3}
        className="resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
        <p className="text-xs text-muted-foreground">0 / 1000</p>
      </div>
    </div>
  ),
};
