import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from './separator';

const meta = {
  title: 'Components/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'The orientation of the separator',
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[350px]">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Olympus MVP</h4>
        <p className="text-sm text-muted-foreground">
          An AI-powered document intelligence platform.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Queries</div>
        <Separator orientation="vertical" />
        <div>Spaces</div>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-20 items-center">
      <span>Item 1</span>
      <Separator orientation="vertical" className="mx-4" />
      <span>Item 2</span>
      <Separator orientation="vertical" className="mx-4" />
      <span>Item 3</span>
    </div>
  ),
};
