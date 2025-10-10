import type { Meta, StoryObj } from '@storybook/nextjs';
import { Header } from './Header';

const meta = {
  title: 'Layout/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default header in light mode.
 * Shows the Olympus branding, theme toggle, and user menu.
 */
export const Default: Story = {};

/**
 * Header in dark mode.
 * Note: Toggle the theme in the toolbar above to see the dark mode styling.
 */
export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

/**
 * Header on mobile devices.
 * Shows the hamburger menu button for toggling the sidebar.
 */
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
