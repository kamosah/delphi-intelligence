import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Design System/Shadows & Elevation',
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'light',
      values: [{ name: 'light', value: '#F9FAFB' }],
    },
  },
};

export default meta;

export const ShadowScale: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Shadow Scale
      </h2>
      <p className="text-sm text-gray-600 mb-8">
        Elevation system for depth and hierarchy
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">shadow-sm</h3>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <p className="text-sm text-gray-900">
              Small shadow for subtle elevation
            </p>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              0 1px 2px rgba(0, 0, 0, 0.05)
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">shadow</h3>
          <div className="p-6 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-900">Default shadow for cards</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              0 1px 3px rgba(0, 0, 0, 0.1)
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">shadow-md</h3>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <p className="text-sm text-gray-900">
              Medium shadow for elevated cards
            </p>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              0 4px 6px rgba(0, 0, 0, 0.1)
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">shadow-lg</h3>
          <div className="p-6 bg-white rounded-lg shadow-lg">
            <p className="text-sm text-gray-900">Large shadow for modals</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              0 10px 15px rgba(0, 0, 0, 0.1)
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">shadow-xl</h3>
          <div className="p-6 bg-white rounded-lg shadow-xl">
            <p className="text-sm text-gray-900">
              Extra large shadow for popovers
            </p>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              0 20px 25px rgba(0, 0, 0, 0.1)
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">shadow-2xl</h3>
          <div className="p-6 bg-white rounded-lg shadow-2xl">
            <p className="text-sm text-gray-900">Maximum shadow for overlays</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              0 25px 50px rgba(0, 0, 0, 0.25)
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const FocusRings: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Focus Rings</h2>
      <p className="text-sm text-gray-600 mb-8">
        Accessible focus indicators for keyboard navigation
      </p>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Primary Focus Ring
          </h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Focus this input"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 font-mono">
              ring-4 ring-blue-500/20 (4px ring with 20% opacity)
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Error Focus Ring
          </h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Error state"
              className="w-full px-4 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-500"
            />
            <p className="text-xs text-gray-500 font-mono">
              ring-4 ring-red-500/20
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Button Focus Outline
          </h3>
          <div className="space-y-4">
            <button className="px-4 py-2 bg-blue-500 text-white rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              Focus this button
            </button>
            <p className="text-xs text-gray-500 font-mono">
              ring-2 ring-blue-500 ring-offset-2
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const CardElevation: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Card Elevation Patterns
      </h2>
      <p className="text-sm text-gray-600 mb-8">
        Common shadow usage for card components
      </p>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Flat Card (No Shadow)
          </h3>
          <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">
              Connection Card
            </h4>
            <p className="text-sm text-gray-600">
              Used for connection cards with border only
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Elevated Card (shadow-sm)
          </h3>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2">Default Card</h4>
            <p className="text-sm text-gray-600">
              Subtle elevation for standard cards
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Hover State (shadow → shadow-md)
          </h3>
          <div className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
            <h4 className="font-semibold text-gray-900 mb-2">
              Interactive Card
            </h4>
            <p className="text-sm text-gray-600">
              Hover to see shadow lift effect
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Modal/Dialog (shadow-xl)
          </h3>
          <div className="p-6 bg-white rounded-lg shadow-xl max-w-md">
            <h4 className="font-semibold text-gray-900 mb-2">Modal Dialog</h4>
            <p className="text-sm text-gray-600 mb-4">
              Strong elevation for overlays
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm">
                Confirm
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const BorderRadius: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Border Radius Scale
      </h2>
      <p className="text-sm text-gray-600 mb-8">
        Rounded corners for components
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            rounded-sm (2px)
          </h3>
          <div className="w-full h-20 bg-blue-500 rounded-sm shadow-sm"></div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            rounded (4px)
          </h3>
          <div className="w-full h-20 bg-blue-500 rounded shadow-sm"></div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            rounded-md (6px)
          </h3>
          <div className="w-full h-20 bg-blue-500 rounded-md shadow-sm"></div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            rounded-lg (8px)
          </h3>
          <div className="w-full h-20 bg-blue-500 rounded-lg shadow-sm"></div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            rounded-xl (12px)
          </h3>
          <div className="w-full h-20 bg-blue-500 rounded-xl shadow-sm"></div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            rounded-full (pill)
          </h3>
          <div className="w-full h-20 bg-blue-500 rounded-full shadow-sm"></div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-900">
          <strong>Common Usage:</strong> Use `rounded-md` (6px) for most cards
          and inputs, `rounded-lg` (8px) for modals, and `rounded-full` for
          badges and pills.
        </p>
      </div>
    </div>
  ),
};
