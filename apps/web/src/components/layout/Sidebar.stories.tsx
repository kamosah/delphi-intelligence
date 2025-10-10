import type { Meta, StoryObj } from '@storybook/nextjs';
import { Sidebar } from './Sidebar';

const meta = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', height: '100vh' }}>
        <Story />
        <div
          style={{ flex: 1, padding: '20px', background: 'var(--background)' }}
        >
          <h1 style={{ color: 'var(--foreground)', marginBottom: '1rem' }}>
            Main Content Area
          </h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            This simulates the main content area next to the sidebar. Try
            clicking the navigation items or hover over them when collapsed.
          </p>
        </div>
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default sidebar in expanded state.
 * Shows all navigation items with labels and icons.
 * The sidebar can be collapsed by clicking items or using the toggle button.
 */
export const Expanded: Story = {
  name: 'Sidebar Expanded',
};

/**
 * Sidebar in dark mode.
 * Note: Toggle the theme in the toolbar above to see the dark mode styling.
 */
export const DarkMode: Story = {
  name: 'Sidebar Dark Mode',
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

/**
 * Interactive sidebar demo.
 * Try clicking navigation items to see hover states and interactions.
 * The sidebar will animate smoothly between expanded and collapsed states.
 */
export const Interactive: Story = {
  name: 'Interactive Sidebar',
  parameters: {
    docs: {
      description: {
        story:
          "This story demonstrates the sidebar's interactive behavior. " +
          'Navigation items are clickable and show hover states. ' +
          'The actual collapse/expand animation is controlled by the useUIStore in the real app.',
      },
    },
  },
};
