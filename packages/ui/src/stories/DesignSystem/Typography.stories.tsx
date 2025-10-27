import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Design System/Typography',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const FontFamilies: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Font Families
      </h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Interface Font (Sans-Serif)
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            System font stack for optimal cross-platform rendering
          </p>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p
              className="text-2xl"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
              }}
            >
              The quick brown fox jumps over the lazy dog
            </p>
            <p className="text-xs text-gray-500 font-mono mt-2">
              -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue',
              Arial, sans-serif
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Monospace Font (Code & Data)
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Fixed-width font for code blocks, SQL, and tabular data
          </p>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-lg font-mono">
              SELECT * FROM customers WHERE status = 'active'
            </p>
            <p className="text-xs text-gray-500 font-mono mt-2">
              'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas,
              monospace
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const TypeScale: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Type Scale</h2>
      <p className="text-sm text-gray-600 mb-6">
        Consistent font sizes for hierarchy and readability
      </p>

      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-md">
          <h1 className="text-[32px] font-bold leading-tight text-gray-900">
            H1 Heading - 32px / 700
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Page titles, primary headings
          </p>
        </div>

        <div className="p-4 border border-gray-200 rounded-md">
          <h2 className="text-2xl font-semibold leading-snug text-gray-900">
            H2 Heading - 24px / 600
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Section headers, major divisions
          </p>
        </div>

        <div className="p-4 border border-gray-200 rounded-md">
          <h3 className="text-lg font-semibold leading-normal text-gray-900">
            H3 Heading - 18px / 600
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Subsection headers, card titles
          </p>
        </div>

        <div className="p-4 border border-gray-200 rounded-md">
          <p className="text-sm leading-relaxed text-gray-900">
            Body Text - 14px / 400 / 1.5 line height
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Main content, paragraphs, descriptions
          </p>
        </div>

        <div className="p-4 border border-gray-200 rounded-md">
          <p className="text-xs leading-snug text-gray-900">
            Small Text - 12px / 400 / 1.4 line height
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Meta information, labels, captions
          </p>
        </div>

        <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
          <code className="text-[13px] font-mono leading-snug text-gray-900">
            Code Text - 13px / 400 / 1.4 line height (monospace)
          </code>
          <p className="text-xs text-gray-500 mt-1">
            Code blocks, SQL queries, inline code
          </p>
        </div>
      </div>
    </div>
  ),
};

export const FontWeights: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Font Weights
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Weight scale for emphasis and hierarchy
      </p>

      <div className="space-y-3">
        <div className="flex items-baseline gap-4">
          <span className="text-sm font-normal text-gray-900 w-32">
            Regular (400)
          </span>
          <p className="text-base font-normal">
            The quick brown fox jumps over the lazy dog
          </p>
        </div>

        <div className="flex items-baseline gap-4">
          <span className="text-sm font-normal text-gray-900 w-32">
            Medium (500)
          </span>
          <p className="text-base font-medium">
            The quick brown fox jumps over the lazy dog
          </p>
        </div>

        <div className="flex items-baseline gap-4">
          <span className="text-sm font-normal text-gray-900 w-32">
            Semibold (600)
          </span>
          <p className="text-base font-semibold">
            The quick brown fox jumps over the lazy dog
          </p>
        </div>

        <div className="flex items-baseline gap-4">
          <span className="text-sm font-normal text-gray-900 w-32">
            Bold (700)
          </span>
          <p className="text-base font-bold">
            The quick brown fox jumps over the lazy dog
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Use semibold (600) for headings, not bold
          (700). This aligns with Hex's refined aesthetic.
        </p>
      </div>
    </div>
  ),
};

export const TextColors: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Text Colors</h2>
      <p className="text-sm text-gray-600 mb-6">
        Semantic text color hierarchy
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-base text-gray-900 mb-1">
            Primary Text (Gray 800 - #1F2937)
          </p>
          <p className="text-xs text-gray-500">
            Main content, emphasis, important information
          </p>
        </div>

        <div>
          <p className="text-base text-gray-600 mb-1">
            Body Text (Gray 600 - #4B5563)
          </p>
          <p className="text-xs text-gray-500">
            Standard paragraphs, descriptions
          </p>
        </div>

        <div>
          <p className="text-base text-gray-500 mb-1">
            Secondary Text (Gray 500 - #6B7280)
          </p>
          <p className="text-xs text-gray-500">
            De-emphasized content, labels, meta info
          </p>
        </div>

        <div>
          <p className="text-base text-gray-400 mb-1">
            Tertiary Text (Gray 400 - #9CA3AF)
          </p>
          <p className="text-xs text-gray-500">
            Placeholder text, disabled text
          </p>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Interactive Text
          </h3>
          <div className="space-y-2">
            <p>
              <a
                href="#"
                className="text-blue-500 hover:text-blue-600 transition-colors"
              >
                Link Text (Blue 500, hover Blue 600)
              </a>
            </p>
            <p className="text-red-500">Error Text (Red 500 - #EF4444)</p>
            <p className="text-green-500">Success Text (Green 500 - #10B981)</p>
            <p className="text-orange-500">
              Warning Text (Orange 500 - #F97316)
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const UsageExamples: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Typography in Context
      </h2>

      <div className="space-y-8">
        <div className="p-6 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Card Title
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            This is a standard card with a heading and body text. Notice the
            clear hierarchy between the title (semibold, larger) and the
            description (regular, smaller).
          </p>
          <p className="text-xs text-gray-500">Last updated 2 hours ago</p>
        </div>

        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            SQL Query Example
          </h3>
          <div className="p-4 bg-white rounded-md border border-gray-200">
            <code className="text-[13px] font-mono text-gray-900 block">
              <span className="text-purple-600">SELECT</span> customer_id, name,
              email
              <br />
              <span className="text-purple-600">FROM</span> customers
              <br />
              <span className="text-purple-600">WHERE</span> status ={' '}
              <span className="text-blue-600">'active'</span>
              <br />
              <span className="text-purple-600">ORDER BY</span> created_at{' '}
              <span className="text-purple-600">DESC</span>
            </code>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Monospace font with syntax highlighting
          </p>
        </div>

        <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">
            White Text on Color
          </h3>
          <p className="text-sm text-white/90">
            Use white text on dark or colored backgrounds for contrast. Reduce
            opacity to 90% for secondary text on colored backgrounds.
          </p>
        </div>
      </div>
    </div>
  ),
};
