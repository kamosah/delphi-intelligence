import type { Meta, StoryObj } from '@storybook/react';
import { Typography } from './typography';

const meta = {
  title: 'Components/Typography',
  component: Typography,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const H1: Story = {
  args: {
    variant: 'h1',
    children: 'The Joke Tax Chronicles',
  },
};

export const H2: Story = {
  args: {
    variant: 'h2',
    children: 'The People of the Kingdom',
  },
};

export const H3: Story = {
  args: {
    variant: 'h3',
    children: 'The Joke Tax',
  },
};

export const H4: Story = {
  args: {
    variant: 'h4',
    children: 'People stopped telling jokes',
  },
};

export const Paragraph: Story = {
  args: {
    variant: 'p',
    children:
      'The king, seeing how much happier his subjects were, realized the error of his ways and repealed the joke tax.',
  },
};

export const Blockquote: Story = {
  args: {
    variant: 'blockquote',
    children:
      '"After all," he said, "everyone enjoys a good joke, so it\'s only fair that they should pay for the privilege."',
  },
};

export const Lead: Story = {
  args: {
    variant: 'lead',
    children:
      'A modal dialog that interrupts the user with important content and expects a response.',
  },
};

export const Large: Story = {
  args: {
    variant: 'large',
    children: 'Are you absolutely sure?',
  },
};

export const Small: Story = {
  args: {
    variant: 'small',
    children: 'Email address',
  },
};

export const Muted: Story = {
  args: {
    variant: 'muted',
    children: 'Enter your email address.',
  },
};

export const Code: Story = {
  args: {
    variant: 'code',
    children: '@radix-ui/react-alert-dialog',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <Typography variant="h1">
        Taxing Laughter: The Joke Tax Chronicles
      </Typography>
      <Typography variant="h2">The People of the Kingdom</Typography>
      <Typography variant="h3">The Joke Tax</Typography>
      <Typography variant="h4">People stopped telling jokes</Typography>
      <Typography variant="p">
        The king, seeing how much happier his subjects were, realized the error
        of his ways and repealed the joke tax.
      </Typography>
      <Typography variant="blockquote">
        "After all," he said, "everyone enjoys a good joke, so it's only fair
        that they should pay for the privilege."
      </Typography>
      <Typography variant="lead">
        A modal dialog that interrupts the user with important content and
        expects a response.
      </Typography>
      <Typography variant="large">Are you absolutely sure?</Typography>
      <Typography variant="small">Email address</Typography>
      <Typography variant="muted">Enter your email address.</Typography>
      <Typography variant="code">@radix-ui/react-alert-dialog</Typography>
    </div>
  ),
};
