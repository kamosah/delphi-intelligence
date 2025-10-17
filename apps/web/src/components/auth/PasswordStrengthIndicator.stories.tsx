import type { Meta, StoryObj } from '@storybook/nextjs';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

const meta = {
  title: 'Auth/PasswordStrengthIndicator',
  component: PasswordStrengthIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PasswordStrengthIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Empty password - component renders nothing
 */
export const Empty: Story = {
  args: {
    password: '',
  },
};

/**
 * Very short password with no complexity - renders nothing (strength 0)
 */
export const TooShort: Story = {
  args: {
    password: 'abc',
  },
};

/**
 * Weak password - 8 characters, lowercase only
 * Visual: 1 out of 4 bars filled in RED (#ef4444)
 * Label: "Weak" in gray text
 */
export const Weak: Story = {
  args: {
    password: 'password',
  },
};

/**
 * Fair password - 8+ characters with mixed case
 * Visual: 2 out of 4 bars filled in ORANGE (#f97316)
 * Label: "Fair" in gray text
 */
export const Fair: Story = {
  args: {
    password: 'Password',
  },
};

/**
 * Good password - 8+ characters with mixed case and numbers
 * Visual: 3 out of 4 bars filled in YELLOW (#eab308)
 * Label: "Good" in gray text
 */
export const Good: Story = {
  args: {
    password: 'Password123',
  },
};

/**
 * Strong password - 12+ characters with mixed case, numbers, and special characters
 * Visual: 4 out of 4 bars filled in GREEN (#22c55e)
 * Label: "Strong" in gray text
 */
export const Strong: Story = {
  args: {
    password: 'MyP@ssw0rd123!',
  },
};

/**
 * Example showing progression from weak to strong
 */
export const PasswordProgression: Story = {
  args: {
    password: '',
  },
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium mb-2">Weak: &quot;password&quot;</p>
        <PasswordStrengthIndicator password="password" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Fair: &quot;Password&quot;</p>
        <PasswordStrengthIndicator password="Password" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">
          Good: &quot;Password123&quot;
        </p>
        <PasswordStrengthIndicator password="Password123" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">
          Strong: &quot;MyP@ssw0rd123!&quot;
        </p>
        <PasswordStrengthIndicator password="MyP@ssw0rd123!" />
      </div>
    </div>
  ),
};

/**
 * Interactive example with custom styling
 */
export const CustomStyling: Story = {
  args: {
    password: 'Password123',
    className: 'bg-gray-50 p-3 rounded-md',
  },
};

/**
 * Visual Guide - What each state should look like:
 *
 * The component displays 4 horizontal bars with smooth rounded edges.
 * Each bar is 8px tall (h-2) with 4px gap between them.
 * Unfilled bars are always light gray (#e5e7eb / gray-200).
 *
 * **Strength 0 (Empty/Too Short):**
 * - Component renders nothing (null)
 * - No bars, no label
 *
 * **Strength 1 (Weak):**
 * - Label: "Password strength: Weak"
 * - Bars: [RED] [gray] [gray] [gray]
 * - Color: #ef4444 (Tailwind red-500)
 *
 * **Strength 2 (Fair):**
 * - Label: "Password strength: Fair"
 * - Bars: [ORANGE] [ORANGE] [gray] [gray]
 * - Color: #f97316 (Tailwind orange-500)
 *
 * **Strength 3 (Good):**
 * - Label: "Password strength: Good"
 * - Bars: [YELLOW] [YELLOW] [YELLOW] [gray]
 * - Color: #eab308 (Tailwind yellow-500)
 *
 * **Strength 4 (Strong):**
 * - Label: "Password strength: Strong"
 * - Bars: [GREEN] [GREEN] [GREEN] [GREEN]
 * - Color: #22c55e (Tailwind green-500)
 */
export const VisualGuide: Story = {
  args: {
    password: '',
  },
  render: () => (
    <div className="space-y-8 w-full max-w-2xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          Visual Specification
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 4 horizontal bars, each 8px tall (h-2)</li>
          <li>• 4px gap between bars (gap-1)</li>
          <li>• Smooth rounded corners (rounded-full)</li>
          <li>• Smooth color transitions (transition-colors)</li>
          <li>• Unfilled bars: #e5e7eb (gray-200)</li>
          <li>• Label position: top-right, small gray text</li>
        </ul>
      </div>

      <div className="space-y-6">
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Empty / Too Short</span>
            <span className="text-xs text-gray-500">(renders nothing)</span>
          </div>
          <PasswordStrengthIndicator password="" />
        </div>

        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Weak (Strength 1)</span>
            <span className="text-xs text-red-600">1/4 bars • Red #ef4444</span>
          </div>
          <PasswordStrengthIndicator password="password" />
        </div>

        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Fair (Strength 2)</span>
            <span className="text-xs text-orange-600">
              2/4 bars • Orange #f97316
            </span>
          </div>
          <PasswordStrengthIndicator password="Password" />
        </div>

        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Good (Strength 3)</span>
            <span className="text-xs text-yellow-600">
              3/4 bars • Yellow #eab308
            </span>
          </div>
          <PasswordStrengthIndicator password="Password123" />
        </div>

        <div className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Strong (Strength 4)</span>
            <span className="text-xs text-green-600">
              4/4 bars • Green #22c55e
            </span>
          </div>
          <PasswordStrengthIndicator password="MyP@ssw0rd123!" />
        </div>
      </div>
    </div>
  ),
};
