import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
};

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>
        <User className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  ),
};

export const BotAvatar: Story = {
  render: () => (
    <Avatar className="border-2 border-agent-primary">
      <AvatarFallback className="bg-agent-primary/10">
        <Bot className="h-4 w-4 text-agent-primary" />
      </AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar className="h-8 w-8">
        <AvatarFallback>S</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>M</AvatarFallback>
      </Avatar>
      <Avatar className="h-16 w-16">
        <AvatarFallback>L</AvatarFallback>
      </Avatar>
      <Avatar className="h-20 w-20">
        <AvatarFallback>XL</AvatarFallback>
      </Avatar>
    </div>
  ),
};
