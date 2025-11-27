import type { Meta, StoryObj } from '@storybook/nextjs';
import { SpaceMention } from './SpaceMention';

const meta = {
  title: 'Editor/Mentions/SpaceMention',
  component: SpaceMention,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SpaceMention>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create mock node props
const createNodeProps = (attrs: {
  id: string;
  label: string;
  iconColor?: string | null;
}) =>
  ({
    node: {
      attrs,
    },
    editor: {},
    getPos: () => 0,
    decorations: [],
    extension: {},
    selected: false,
    updateAttributes: () => {},
    deleteNode: () => {},
    // Additional required props
    view: {},
    innerDecorations: [],
    HTMLAttributes: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

/**
 * Default space mention badge with purple background.
 */
export const Default: Story = {
  args: createNodeProps({
    id: 'space-1',
    label: 'Design Team',
    iconColor: null,
  }),
};

/**
 * Space mention badge with custom blue icon color.
 */
export const BlueIcon: Story = {
  args: createNodeProps({
    id: 'space-2',
    label: 'Engineering',
    iconColor: '#3B82F6',
  }),
};

/**
 * Space mention badge with custom green icon color.
 */
export const GreenIcon: Story = {
  args: createNodeProps({
    id: 'space-3',
    label: 'Sales Team',
    iconColor: '#10B981',
  }),
};

/**
 * Space mention badge with custom red icon color.
 */
export const RedIcon: Story = {
  args: createNodeProps({
    id: 'space-4',
    label: 'Marketing',
    iconColor: '#EF4444',
  }),
};

/**
 * Space mention badge with custom orange icon color.
 */
export const OrangeIcon: Story = {
  args: createNodeProps({
    id: 'space-5',
    label: 'Product',
    iconColor: '#F59E0B',
  }),
};

/**
 * Space mention badge with long name.
 */
export const LongName: Story = {
  args: createNodeProps({
    id: 'space-6',
    label: 'Very Long Space Name That Might Wrap',
    iconColor: null,
  }),
};

/**
 * Space mention badge with short name.
 */
export const ShortName: Story = {
  args: createNodeProps({
    id: 'space-7',
    label: 'Dev',
    iconColor: '#8B5CF6',
  }),
};

/**
 * Visual test: Multiple badges in inline text context.
 */
export const InlineContext: Story = {
  args: createNodeProps({
    id: 'space-1',
    label: 'Design Team',
    iconColor: null,
  }),
  render: () => (
    <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-base text-gray-900">
        Let's discuss this in{' '}
        <SpaceMention
          {...createNodeProps({
            id: 'space-1',
            label: 'Design Team',
            iconColor: '#8B5CF6',
          })}
        />{' '}
        and{' '}
        <SpaceMention
          {...createNodeProps({
            id: 'space-2',
            label: 'Engineering',
            iconColor: '#3B82F6',
          })}
        />{' '}
        channels. We should also loop in{' '}
        <SpaceMention
          {...createNodeProps({
            id: 'space-3',
            label: 'Product',
            iconColor: '#F59E0B',
          })}
        />{' '}
        for feedback.
      </p>
    </div>
  ),
};

/**
 * Visual test: All color variations.
 */
export const ColorVariations: Story = {
  args: createNodeProps({ id: 'space-1', label: 'Design', iconColor: null }),
  render: () => (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap gap-2">
        <SpaceMention
          {...createNodeProps({
            id: 'space-1',
            label: 'Design',
            iconColor: '#8B5CF6',
          })}
        />
        <SpaceMention
          {...createNodeProps({
            id: 'space-2',
            label: 'Engineering',
            iconColor: '#3B82F6',
          })}
        />
        <SpaceMention
          {...createNodeProps({
            id: 'space-3',
            label: 'Sales',
            iconColor: '#10B981',
          })}
        />
        <SpaceMention
          {...createNodeProps({
            id: 'space-4',
            label: 'Marketing',
            iconColor: '#EF4444',
          })}
        />
        <SpaceMention
          {...createNodeProps({
            id: 'space-5',
            label: 'Product',
            iconColor: '#F59E0B',
          })}
        />
        <SpaceMention
          {...createNodeProps({
            id: 'space-6',
            label: 'Support',
            iconColor: '#6366F1',
          })}
        />
      </div>
    </div>
  ),
};

/**
 * Visual test: Badges with varying name lengths.
 */
export const NameLengths: Story = {
  args: createNodeProps({ id: 'space-1', label: 'AI', iconColor: null }),
  render: () => (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap gap-2">
        <SpaceMention
          {...createNodeProps({
            id: 'space-1',
            label: 'AI',
            iconColor: '#8B5CF6',
          })}
        />
        <SpaceMention
          {...createNodeProps({
            id: 'space-2',
            label: 'Team',
            iconColor: '#3B82F6',
          })}
        />
        <SpaceMention
          {...createNodeProps({
            id: 'space-3',
            label: 'Engineering',
            iconColor: '#10B981',
          })}
        />
        <SpaceMention
          {...createNodeProps({
            id: 'space-4',
            label: 'Product Design',
            iconColor: '#EF4444',
          })}
        />
        <SpaceMention
          {...createNodeProps({
            id: 'space-5',
            label: 'Customer Success Team',
            iconColor: '#F59E0B',
          })}
        />
      </div>
    </div>
  ),
};
