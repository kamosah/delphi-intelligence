import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Design System/Spacing',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const SpacingScale: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Spacing Scale
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        8px base unit for consistent spacing throughout the app
      </p>

      <div className="space-y-4">
        {[
          { name: '0.5x', value: '4px', class: 'w-1' },
          { name: '1x (BASE)', value: '8px', class: 'w-2' },
          { name: '1.5x', value: '12px', class: 'w-3' },
          { name: '2x', value: '16px', class: 'w-4' },
          { name: '2.5x', value: '20px', class: 'w-5' },
          { name: '3x', value: '24px', class: 'w-6' },
          { name: '4x', value: '32px', class: 'w-8' },
          { name: '5x', value: '40px', class: 'w-10' },
          { name: '6x', value: '48px', class: 'w-12' },
          { name: '8x', value: '64px', class: 'w-16' },
          { name: '10x', value: '80px', class: 'w-20' },
          { name: '12x', value: '96px', class: 'w-24' },
        ].map((space) => (
          <div key={space.value} className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium text-gray-900">
              {space.name}
            </div>
            <div className="w-16 text-xs font-mono text-gray-500">
              {space.value}
            </div>
            <div className={`${space.class} h-8 bg-blue-500 rounded`} />
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-900">
          <strong>8px Base Unit:</strong> All spacing should be multiples of 8px
          for visual consistency and alignment.
        </p>
      </div>
    </div>
  ),
};

export const PaddingExamples: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Padding Examples
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Common padding patterns for components
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Small Padding (p-2 = 8px)
          </h3>
          <div className="inline-block p-2 bg-gray-100 border border-gray-300 rounded">
            <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
              Badge / Pill
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Medium Padding (p-4 = 16px)
          </h3>
          <div className="p-4 bg-gray-100 border border-gray-300 rounded">
            <div className="bg-white p-4 rounded shadow-sm">
              <p className="text-sm text-gray-900">Card Content</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Large Padding (p-6 = 24px)
          </h3>
          <div className="p-4 bg-gray-100 border border-gray-300 rounded">
            <div className="bg-white p-6 rounded shadow-sm">
              <p className="text-sm text-gray-900">Section Container</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Extra Large Padding (p-8 = 32px)
          </h3>
          <div className="p-4 bg-gray-100 border border-gray-300 rounded">
            <div className="bg-white p-8 rounded shadow-sm">
              <p className="text-sm text-gray-900">Page Container</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const GapExamples: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Gap Examples
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Spacing between flex/grid items
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Gap 2 (8px)
          </h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-16 h-16 bg-blue-500 rounded flex items-center justify-center text-white text-sm"
              >
                {i}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Gap 4 (16px)
          </h3>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-16 h-16 bg-green-500 rounded flex items-center justify-center text-white text-sm"
              >
                {i}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Gap 6 (24px)
          </h3>
          <div className="flex gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-16 h-16 bg-purple-500 rounded flex items-center justify-center text-white text-sm"
              >
                {i}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Gap 8 (32px)
          </h3>
          <div className="flex gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-16 h-16 bg-orange-500 rounded flex items-center justify-center text-white text-sm"
              >
                {i}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
};

export const MarginExamples: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Margin Examples
      </h2>
      <p className="text-sm text-gray-600 mb-6">Spacing around elements</p>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Bottom Margins (mb-*)
          </h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
            <p className="text-sm text-gray-900 mb-2">Margin Bottom 2 (8px)</p>
            <p className="text-sm text-gray-900 mb-4">Margin Bottom 4 (16px)</p>
            <p className="text-sm text-gray-900 mb-6">Margin Bottom 6 (24px)</p>
            <p className="text-sm text-gray-900 mb-8">Margin Bottom 8 (32px)</p>
            <p className="text-sm text-gray-900">Last element (no margin)</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Top Margins (mt-*)
          </h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
            <p className="text-sm text-gray-900">First element (no margin)</p>
            <p className="text-sm text-gray-900 mt-2">Margin Top 2 (8px)</p>
            <p className="text-sm text-gray-900 mt-4">Margin Top 4 (16px)</p>
            <p className="text-sm text-gray-900 mt-6">Margin Top 6 (24px)</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const LayoutSpacing: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Layout Spacing Patterns
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Common spacing combinations for layouts
      </p>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Card Layout (p-6 with gap-4)
          </h3>
          <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Card Title</h4>
              <p className="text-sm text-gray-600">
                Card description with gap-4 spacing below title
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                Tag 1
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                Tag 2
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Form Layout (gap-6 between fields)
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Field Label
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="Input field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Field Label
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="Input field"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Section Spacing (mb-8 between sections)
          </h3>
          <div>
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Section 1
              </h4>
              <p className="text-sm text-gray-600">
                Section content with mb-8 below
              </p>
            </div>
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Section 2
              </h4>
              <p className="text-sm text-gray-600">
                Section content with mb-8 below
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Section 3
              </h4>
              <p className="text-sm text-gray-600">
                Final section (no bottom margin)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
