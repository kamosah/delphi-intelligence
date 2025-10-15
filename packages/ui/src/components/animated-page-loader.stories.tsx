import type { Meta, StoryObj } from '@storybook/react';
import { Loader2, Mail, Upload } from 'lucide-react';
import { AnimatedPageLoader } from './animated-page-loader';

const meta = {
  title: 'Components/AnimatedPageLoader',
  component: AnimatedPageLoader,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Loading title text',
    },
    description: {
      control: 'text',
      description: 'Optional description text',
    },
    icon: {
      control: false,
      description: 'Optional custom icon component',
    },
  },
} satisfies Meta<typeof AnimatedPageLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default page loader with spinning Sparkles icon and default text.
 */
export const Default: Story = {};

/**
 * Custom title only - useful for simple loading states.
 */
export const CustomTitle: Story = {
  args: {
    title: 'Processing your request...',
  },
};

/**
 * Custom title with description - provides more context to users.
 */
export const WithDescription: Story = {
  args: {
    title: 'Uploading document',
    description: 'This may take a few moments depending on file size',
  },
};

/**
 * Email verification loading state with custom icon.
 */
export const EmailVerification: Story = {
  args: {
    title: 'Verifying your email',
    description: 'Please wait while we confirm your email address...',
    icon: <Mail className="h-16 w-16 text-primary animate-pulse" />,
  },
};

/**
 * Processing state with rotating loader icon.
 */
export const ProcessingDocument: Story = {
  args: {
    title: 'Processing document',
    description: 'Extracting text and analyzing content...',
    icon: <Loader2 className="h-16 w-16 text-primary animate-spin" />,
  },
};

/**
 * Upload state with custom icon.
 */
export const Uploading: Story = {
  args: {
    title: 'Uploading files',
    description: 'Please do not close this window',
    icon: <Upload className="h-16 w-16 text-primary animate-bounce" />,
  },
};

/**
 * Long description text - demonstrates text wrapping.
 */
export const LongDescription: Story = {
  args: {
    title: 'Setting up your workspace',
    description:
      'We are configuring your workspace with the necessary permissions, creating default folders, and setting up your team collaboration environment. This should only take a moment.',
  },
};

/**
 * Minimal variant - just a title, no description.
 */
export const Minimal: Story = {
  args: {
    title: 'Loading...',
  },
};
