import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Design System/Colors',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

// Color swatch component
const ColorSwatch = ({
  name,
  color,
  usage,
}: {
  name: string;
  color: string;
  usage?: string;
}) => (
  <div className="flex items-center gap-3 mb-2">
    <div
      className="w-16 h-16 rounded-md border border-gray-200 shadow-sm flex-shrink-0"
      style={{ background: color }}
      title={color}
    />
    <div className="flex-1">
      <div className="flex items-baseline gap-2">
        <p className="font-semibold text-sm text-gray-900">{name}</p>
        <p className="text-xs font-mono text-gray-500">{color}</p>
      </div>
      {usage && <p className="text-xs text-gray-600 mt-1">{usage}</p>}
    </div>
  </div>
);

// Gradient swatch for badge backgrounds
const GradientSwatch = ({
  name,
  gradient,
  usage,
}: {
  name: string;
  gradient: string;
  usage: string;
}) => (
  <div className="mb-4">
    <div
      className="h-16 rounded-md flex items-center justify-center shadow-sm"
      style={{ background: gradient }}
    >
      <span className="text-white font-semibold text-sm">{name}</span>
    </div>
    <p className="text-xs text-gray-600 mt-2">{usage}</p>
    <p className="text-xs font-mono text-gray-500 mt-1">{gradient}</p>
  </div>
);

export const PrimaryBlues: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Primary Blues
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Main brand color for CTAs, links, and interactive elements
      </p>

      <ColorSwatch
        name="Blue 50"
        color="#EBF2FF"
        usage="Light backgrounds, hover states"
      />
      <ColorSwatch name="Blue 100" color="#D6E4FF" usage="Subtle backgrounds" />
      <ColorSwatch name="Blue 200" color="#ADC9FF" usage="Borders, dividers" />
      <ColorSwatch name="Blue 300" color="#85AEFF" usage="Disabled states" />
      <ColorSwatch name="Blue 400" color="#5C93FF" usage="Hover previews" />
      <ColorSwatch
        name="Blue 500 (PRIMARY)"
        color="#4B7FFF"
        usage="Main CTAs, links, active states"
      />
      <ColorSwatch
        name="Blue 600"
        color="#3366FF"
        usage="Primary hover state"
      />
      <ColorSwatch
        name="Blue 700"
        color="#2952CC"
        usage="Active/pressed state"
      />
      <ColorSwatch name="Blue 800" color="#1F3D99" usage="Dark mode primary" />
      <ColorSwatch name="Blue 900" color="#142966" usage="Darkest blue" />
    </div>
  ),
};

export const NeutralGrays: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Neutral Grays
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Foundation colors for text, backgrounds, and UI chrome
      </p>

      <ColorSwatch
        name="Gray 50"
        color="#F9FAFB"
        usage="Panel backgrounds, subtle fills"
      />
      <ColorSwatch name="Gray 100" color="#F3F4F6" usage="Hover backgrounds" />
      <ColorSwatch
        name="Gray 200"
        color="#E5E7EB"
        usage="Borders, dividers, separators"
      />
      <ColorSwatch
        name="Gray 300"
        color="#D1D5DB"
        usage="Input borders, disabled borders"
      />
      <ColorSwatch
        name="Gray 400"
        color="#9CA3AF"
        usage="Placeholder text, disabled text"
      />
      <ColorSwatch
        name="Gray 500"
        color="#6B7280"
        usage="Secondary text, icons"
      />
      <ColorSwatch name="Gray 600" color="#4B5563" usage="Body text" />
      <ColorSwatch name="Gray 700" color="#374151" usage="Headings" />
      <ColorSwatch
        name="Gray 800"
        color="#1F2937"
        usage="Primary text, emphasis"
      />
      <ColorSwatch
        name="Gray 900"
        color="#111827"
        usage="Darkest text, high contrast"
      />
    </div>
  ),
};

export const HexBrandColors: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Hex Brand Colors (Official)
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Official colors from Hex media kit. Use for branding, data
        visualization, and accent highlights. Available as `hex-*` in Tailwind.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ColorSwatch
          name="Obsidian"
          color="#1d141c"
          usage="Dark backgrounds, footer"
        />
        <ColorSwatch
          name="Rose Quartz"
          color="#f5cdc0"
          usage="Data viz, warm accents"
        />
        <ColorSwatch
          name="Jade"
          color="#5cb196"
          usage="Success, document citations"
        />
        <ColorSwatch
          name="Amethyst"
          color="#a477b2"
          usage="Primary brand accent, AI features"
        />
        <ColorSwatch
          name="Citrine"
          color="#cda849"
          usage="Warnings, highlights, data viz"
        />
        <ColorSwatch
          name="Opal"
          color="#fbf0f9"
          usage="Light mode elevated surfaces"
        />
        <ColorSwatch
          name="Sugilite"
          color="#6f3f90"
          usage="Computation badges, deep accents"
        />
        <ColorSwatch
          name="Cement"
          color="#717a94"
          usage="Neutral UI, borders, disabled states"
        />
      </div>
    </div>
  ),
};

export const AccentPurple: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Accent Purple
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        AI features, magic actions, and special functionality
      </p>

      <ColorSwatch
        name="Purple 500"
        color="#8B5CF6"
        usage="AI features, magic buttons, highlights"
      />
      <ColorSwatch
        name="Purple 600"
        color="#7C3AED"
        usage="Purple hover state"
      />
    </div>
  ),
};

export const SemanticColors: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Semantic Colors
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Status indicators and feedback
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Success</h3>
          <ColorSwatch
            name="Green 500"
            color="#10B981"
            usage="Success messages, ready status"
          />
          <ColorSwatch
            name="Green 600"
            color="#059669"
            usage="Document badges (gradient)"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Error</h3>
          <ColorSwatch
            name="Red 500"
            color="#EF4444"
            usage="Error states, destructive actions"
          />
          <ColorSwatch
            name="Red 600"
            color="#DC2626"
            usage="Error hover state"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Warning</h3>
          <ColorSwatch
            name="Orange 500"
            color="#F97316"
            usage="Warning messages, caution states"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Info</h3>
          <ColorSwatch
            name="Teal 600"
            color="#0D9488"
            usage="Info messages, document gradients"
          />
        </div>
      </div>
    </div>
  ),
};

export const SourceBadgeGradients: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Source Badge Gradients
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Visual indicators for hybrid query results
      </p>

      <div className="space-y-4">
        <GradientSwatch
          name="SQL Result"
          gradient="linear-gradient(to right, #4B7FFF, #3366FF)"
          usage="Database query results, SQL cells"
        />

        <GradientSwatch
          name="Document Citation"
          gradient="linear-gradient(to right, #10B981, #0D9488)"
          usage="Document-based answers, PDF citations"
        />

        <GradientSwatch
          name="Computation"
          gradient="linear-gradient(to right, #8B5CF6, #7C3AED)"
          usage="AI-computed results, analysis outputs"
        />
      </div>
    </div>
  ),
};

export const CodeSyntaxColors: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Code Syntax Highlighting
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Verified from Notebook Agent screenshots - Hex uses purple for SQL
        keywords
      </p>

      <ColorSwatch
        name="Code Background"
        color="#FFFFFF"
        usage="Code cell background (white, not gray)"
      />
      <ColorSwatch
        name="Code Border"
        color="#E5E7EB"
        usage="Code cell border (gray-200)"
      />
      <ColorSwatch
        name="SQL Keyword (PURPLE)"
        color="#8B5CF6"
        usage="SELECT, FROM, WHERE - purple-500"
      />
      <ColorSwatch
        name="SQL Function (PURPLE)"
        color="#8B5CF6"
        usage="COUNT, EXTRACT, SUM - purple-500"
      />
      <ColorSwatch
        name="String Literal (BLUE)"
        color="#3B82F6"
        usage="String values ('active') - blue-500"
      />
      <ColorSwatch
        name="Number"
        color="#1F2937"
        usage="Numeric values - gray-800"
      />
      <ColorSwatch
        name="Comment"
        color="#6B7280"
        usage="Code comments - gray-500"
      />
      <ColorSwatch
        name="Operator"
        color="#4B5563"
        usage="Operators (=, AND, OR) - gray-600"
      />
    </div>
  ),
};

export const BackgroundColors: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Background Colors
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Verified from Fall 2025 Agents screenshots - Hex uses off-white, not
        pure white
      </p>

      <ColorSwatch
        name="Page Background (OFF-WHITE)"
        color="#FAFBFC"
        usage="Main page background - NOT pure white!"
      />
      <ColorSwatch
        name="Card Background"
        color="#FFFFFF"
        usage="AI responses, code cells, cards"
      />
      <ColorSwatch
        name="Notebook Background"
        color="#F5F6F7"
        usage="Notebook Agent canvas background"
      />
      <ColorSwatch
        name="User Input Bubble"
        color="#F3F4F6"
        usage="User message bubbles (gray-100)"
      />
      <ColorSwatch
        name="Working Status Background"
        color="#F9FAFB"
        usage="'Working...' status bar (gray-50)"
      />
    </div>
  ),
};

export const ComponentColors: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Component-Specific Colors
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Exact colors extracted from Threads and Notebook Agent interfaces
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Loading States
          </h3>
          <ColorSwatch
            name="Loading Dots"
            color="#D1D5DB"
            usage="'Thinking...' animation dots (gray-300)"
          />
          <ColorSwatch
            name="Thinking Text"
            color="#1F2937"
            usage="'Thinking.' text color (gray-800)"
          />
          <ColorSwatch
            name="Working Text"
            color="#4B5563"
            usage="'Working...' text color (gray-600)"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Message Text
          </h3>
          <ColorSwatch
            name="User Message Text"
            color="#6B7280"
            usage="User input bubble text (gray-500)"
          />
          <ColorSwatch
            name="AI Response Text"
            color="#1F2937"
            usage="AI message text (gray-800)"
          />
          <ColorSwatch
            name="Heading Text"
            color="#111827"
            usage="Section headings (gray-900)"
          />
        </div>
      </div>
    </div>
  ),
};

export const AllColors: StoryObj = {
  render: () => (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Complete Color Palette
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Primary Blues
          </h3>
          <div className="space-y-1">
            <ColorSwatch name="Blue 500" color="#4B7FFF" />
            <ColorSwatch name="Blue 600" color="#3366FF" />
            <ColorSwatch name="Blue 700" color="#2952CC" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Neutrals</h3>
          <div className="space-y-1">
            <ColorSwatch name="Gray 50" color="#F9FAFB" />
            <ColorSwatch name="Gray 200" color="#E5E7EB" />
            <ColorSwatch name="Gray 500" color="#6B7280" />
            <ColorSwatch name="Gray 900" color="#111827" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Semantic</h3>
          <div className="space-y-1">
            <ColorSwatch name="Green 500" color="#10B981" />
            <ColorSwatch name="Red 500" color="#EF4444" />
            <ColorSwatch name="Orange 500" color="#F97316" />
            <ColorSwatch name="Purple 500" color="#8B5CF6" />
          </div>
        </div>
      </div>
    </div>
  ),
};
