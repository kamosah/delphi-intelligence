# Design Tokens - Olympus Design System

> **Complete design token reference for the Olympus platform, based on 100% Hex aesthetic**
>
> **Last Updated**: 2025-10-26 (Updated with Fall 2025 Agents screenshot analysis)
> **Status**: Production-ready tokens extracted and verified from Hex visual references

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Token Architecture](#token-architecture)
3. [Color Palette](#color-palette)
4. [Typography](#typography)
5. [Spacing & Sizing](#spacing--sizing)
6. [Shadows & Elevation](#shadows--elevation)
7. [Border Radius](#border-radius)
8. [Animation & Timing](#animation--timing)
9. [Breakpoints](#breakpoints)
10. [Dark Mode](#dark-mode)
11. [Usage Guidelines](#usage-guidelines)

---

## Philosophy

### Design Principles

**Olympus follows Hex's data-first design philosophy:**

1. **Clarity Over Complexity** - Clean interfaces that reduce cognitive load
2. **Data-First Design** - Results and insights are primary, UI chrome is secondary
3. **Professional Tool Aesthetic** - Serious, business-oriented tone for analysts
4. **Conversational AI Integration** - Natural language as first-class input
5. **Source Transparency** - Clear visual indicators for SQL vs document results
6. **Mobile-First Responsive** - Adaptive layouts with touch-friendly targets

### Token Strategy

We use a **two-tier token architecture**:

1. **Primitive Tokens** - Raw values (colors, sizes) that rarely change
2. **Semantic Tokens** - Purpose-driven tokens that reference primitives

This allows us to:

- Maintain consistent spacing/sizing ratios
- Support theme switching (light/dark mode)
- Ensure accessible color contrast
- Enable systematic design updates

---

## Token Architecture

```
Primitive Tokens (Raw Values)
    ↓
Semantic Tokens (Purpose-Based)
    ↓
Component Tokens (Component-Specific)
```

**Example Flow:**

```
blue-500 (#4B7FFF) → color-primary → button-background-primary
```

---

## Color Palette

### Primitive Color Tokens

#### Primary Blues (Interactive Elements)

Hex's primary blue is used for interactive elements, links, and primary actions.

```typescript
const blue = {
  50: '#EBF2FF', // Lightest blue - hover backgrounds
  100: '#D6E4FF', // Very light blue - selected states
  200: '#ADC9FF', // Light blue - disabled states
  300: '#85AEFF', // Medium-light blue
  400: '#5C93FF', // Medium blue
  500: '#4B7FFF', // PRIMARY BLUE - main brand color
  600: '#3366FF', // Dark blue - hover states
  700: '#2952CC', // Darker blue - pressed states
  800: '#1F3D99', // Very dark blue
  900: '#142966', // Darkest blue - text on light backgrounds
};
```

**Usage:**

- `blue-500` - Primary buttons, links, focus rings
- `blue-600` - Button hover states
- `blue-700` - Button active/pressed states
- `blue-100` - Selected row backgrounds, hover states
- `blue-50` - Very subtle backgrounds

#### Accent Purple (Highlights & Special Features)

```typescript
const purple = {
  50: '#F5F3FF',
  100: '#EDE9FE',
  200: '#DDD6FE',
  300: '#C4B5FD',
  400: '#A78BFA',
  500: '#8B5CF6', // PRIMARY PURPLE - SQL keywords, AI features, magic
  600: '#7C3AED', // Syntax highlighting (functions)
  700: '#6D28D9',
  800: '#5B21B6',
  900: '#4C1D95',
};
```

**Usage (Updated from Screenshot Analysis):**

- `purple-500` - SQL keywords (SELECT, FROM, WHERE), AI features, special highlights
- `purple-600` - SQL functions (COUNT, EXTRACT)
- `purple-100` - Subtle purple backgrounds for AI sections

#### Neutrals (Backgrounds, Text, Borders)

```typescript
const gray = {
  // Light mode (verified from screenshots)
  50: '#F9FAFB', // Working status backgrounds, elevated surfaces
  100: '#F3F4F6', // User input bubbles, badges, YML tags
  200: '#E5E7EB', // Default borders, dividers, sidebar borders
  300: '#D1D5DB', // Input field borders, loading dots
  400: '#9CA3AF', // Placeholder text, file extensions
  500: '#6B7280', // User input bubble text, de-emphasized content
  600: '#4B5563', // Working status text, tertiary content
  700: '#374151', // List secondary text
  800: '#1F2937', // Body text, code text, thinking indicator
  900: '#111827', // Headings, primary emphasis, bold names

  // Special
  white: '#FFFFFF', // Card backgrounds, code cell backgrounds
  offWhite: '#FAFBFC', // Page background (off-white canvas)
  black: '#000000',
};
```

**Usage (Updated from Screenshot Analysis):**

- `offWhite (#FAFBFC)` - Main page background, canvas
- `white (#FFFFFF)` - Card backgrounds, AI response areas, code cells
- `gray-50` - Working status background, subtle elevated states
- `gray-100` - User input message bubbles, badges, hover backgrounds
- `gray-200` - Default borders (cards, sidebar dividers)
- `gray-300` - Input field borders, loading dot animation
- `gray-400` - Placeholder text in inputs
- `gray-500` - User message text, secondary content
- `gray-600` - Working status "Working..." text
- `gray-800` - Primary body text, code content
- `gray-900` - Headings, bold list items, high-emphasis text

#### Success Green

```typescript
const green = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981', // PRIMARY GREEN - success states
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
};
```

**Usage:**

- `green-500` - Success messages, checkmarks, "ready" status
- `green-100` - Success notification backgrounds
- `green-600` - Document source badges (gradient with teal)

#### Error Red

```typescript
const red = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444', // PRIMARY RED - error states
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
};
```

**Usage:**

- `red-500` - Error messages, destructive actions
- `red-100` - Error notification backgrounds
- `red-600` - Error button backgrounds

#### Warning Orange/Yellow

```typescript
const orange = {
  50: '#FFF7ED',
  100: '#FFEDD5',
  200: '#FED7AA',
  300: '#FDBA74',
  400: '#FB923C',
  500: '#F97316', // PRIMARY ORANGE - warning states
  600: '#EA580C',
  700: '#C2410C',
  800: '#9A3412',
  900: '#7C2D12',
};

const yellow = {
  50: '#FEFCE8',
  100: '#FEF9C3',
  200: '#FEF08A',
  300: '#FDE047',
  400: '#FACC15',
  500: '#EAB308', // PRIMARY YELLOW - caution
  600: '#CA8A04',
  700: '#A16207',
  800: '#854D0E',
  900: '#713F12',
};
```

**Usage:**

- `orange-500` - Warning messages, caution states
- `yellow-100` - Warning notification backgrounds

#### Teal/Cyan (Data Visualization)

```typescript
const teal = {
  50: '#F0FDFA',
  100: '#CCFBF1',
  200: '#99F6E4',
  300: '#5EEAD4',
  400: '#2DD4BF',
  500: '#14B8A6', // PRIMARY TEAL - data viz, charts
  600: '#0D9488',
  700: '#0F766E',
  800: '#115E59',
  900: '#134E4A',
};
```

**Usage:**

- `teal-500` - Data visualization, chart colors
- `teal-600` - Document source badges (part of gradient)

### Semantic Color Tokens

#### Interactive Colors

```typescript
const interactive = {
  // Primary actions
  primary: blue[500], // Main CTA buttons, links
  primaryHover: blue[600], // Hover state
  primaryActive: blue[700], // Active/pressed state
  primaryDisabled: blue[200], // Disabled state

  // Secondary actions
  secondary: gray[700], // Secondary buttons
  secondaryHover: gray[800],
  secondaryActive: gray[900],

  // Destructive actions
  destructive: red[500],
  destructiveHover: red[600],
  destructiveActive: red[700],

  // Links
  link: blue[500],
  linkHover: blue[600],
  linkVisited: purple[600],
};
```

#### Background Colors

```typescript
const background = {
  // Canvas (verified from screenshots)
  canvas: gray.offWhite, // Main page background (#FAFBFC)
  canvasSubtle: '#F5F6F7', // Notebook agent background

  // Surfaces
  surface: gray.white, // Card backgrounds, AI responses, code cells (#FFFFFF)
  surfaceHover: gray[50], // Card hover state
  surfaceSelected: blue[50], // Selected cards
  surfaceDisabled: gray[100], // Disabled surfaces
  surfaceElevated: gray[50], // Working status bar background (#F9FAFB)

  // User interaction
  userInput: gray[100], // User message bubbles (#F3F4F6)
  aiResponse: gray.white, // AI message background (#FFFFFF)

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal backdrop
  scrim: 'rgba(0, 0, 0, 0.3)', // Subtle overlay
};
```

#### Border Colors

```typescript
const border = {
  // Standard borders (verified from screenshots)
  default: gray[200], // Card borders, dividers (#E5E7EB)
  strong: gray[300], // Input field borders (#D1D5DB)
  subtle: gray[100], // Very light dividers (#F3F4F6)

  // Interactive states
  focus: blue[500], // Focus rings (#3B82F6)
  error: red[500], // Error borders
  success: green[500], // Success borders
};
```

#### Text Colors

```typescript
const text = {
  // Primary text hierarchy (verified from screenshots)
  primary: gray[900], // Headings, emphasis (#111827)
  secondary: gray[800], // Body text, main content (#1F2937)
  tertiary: gray[600], // De-emphasized text (#4B5563)
  quaternary: gray[500], // Subtle text, metadata (#6B7280)
  placeholder: gray[400], // Placeholder text (#9CA3AF)
  disabled: gray[300], // Disabled text (#D1D5DB)

  // Special contexts
  inverse: gray.white, // Text on dark backgrounds
  userMessage: gray[500], // User input bubble text (#6B7280)
  loadingDots: gray[300], // Loading animation dots (#D1D5DB)

  // Semantic colors
  error: red[600], // Error messages
  success: green[600], // Success messages
  warning: orange[600], // Warning messages
  link: blue[500], // Links (#3B82F6)
};
```

#### Icon Colors

```typescript
const icon = {
  default: gray[500], // Standard icons
  subtle: gray[400], // De-emphasized icons
  strong: gray[700], // Emphasized icons
  inverse: gray.white, // Icons on dark backgrounds
  primary: blue[500], // Primary action icons
  success: green[500],
  error: red[500],
  warning: orange[500],
};
```

#### Source Badge Colors (Gradients)

```typescript
const sourceBadge = {
  sql: {
    from: blue[500], // SQL results badge gradient start
    to: blue[600], // SQL results badge gradient end
  },
  document: {
    from: green[500], // Document citation badge start
    to: teal[600], // Document citation badge end
  },
  computation: {
    from: purple[500], // Computation badge start
    to: purple[600], // Computation badge end
  },
};
```

#### Code Syntax Highlighting

```typescript
const syntax = {
  // SQL/Code highlighting (verified from screenshots)
  keyword: purple[500], // SELECT, FROM, WHERE, etc. (#8B5CF6)
  function: purple[500], // COUNT, EXTRACT, etc. (#8B5CF6)
  string: blue[500], // String literals ('active') (#3B82F6)
  comment: gray[500], // Comments (#6B7280)
  number: gray[800], // Numbers (#1F2937)
  variable: '#EC4899', // Variables (pink - inferred)
  operator: gray[600], // Operators (=, AND, OR)
  background: gray.white, // Code cell background (#FFFFFF)
  border: gray[200], // Code cell border (#E5E7EB)
};
```

**Usage:**

- Notebook Agent code cells use these colors for SQL/Python syntax
- Maintains consistency across all code-heavy interfaces

---

## Typography

### Font Families

#### Sans-Serif (Primary Interface Font)

```typescript
const fontFamily = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ].join(', '),

  mono: [
    'SF Mono',
    'Monaco',
    'Cascadia Code',
    'Roboto Mono',
    'Consolas',
    'monospace',
  ].join(', '),
};
```

**Usage:**

- `sans` - All UI text (buttons, labels, body copy)
- `mono` - Code blocks, SQL queries, table names, technical data

### Font Sizes

```typescript
const fontSize = {
  // Verified from screenshots
  xs: '12px', // 0.75rem - Small labels, metadata, timestamps
  sm: '13px', // 0.8125rem - Code text, small labels
  base: '14px', // 0.875rem - Body text (PRIMARY), inputs
  md: '15px', // 0.9375rem - Emphasized body text
  lg: '18px', // 1.125rem - Subheadings
  xl: '24px', // 1.5rem - Section headings ("Top Sales Performers")
  '2xl': '28px', // 1.75rem - Large headings
  '3xl': '32px', // 2rem - H1, page titles
  '4xl': '40px', // 2.5rem - Hero text
};
```

**Screenshot Verified:**

- Code/Mono: 13px (`fontSize.sm`)
- Body text: 14px (`fontSize.base`)
- Section headings: 24-28px (`fontSize.xl` or `fontSize.2xl`)

### Font Weights

```typescript
const fontWeight = {
  normal: 400, // Body text
  medium: 500, // Subtle emphasis, button text
  semibold: 600, // Headings, emphasized text
  bold: 700, // Strong emphasis, page titles
};
```

**Hex Convention**: Prefer `semibold` (600) over `bold` (700) for most headings

### Line Heights

```typescript
const lineHeight = {
  // Verified from screenshots
  none: 1, // Headings (tight)
  tight: 1.25, // H1, large headings
  snug: 1.3, // H2, section headings
  normal: 1.4, // H3, small text
  relaxed: 1.5, // Body text (14px) - PRIMARY
  loose: 1.6, // Code (13px), long-form content - PRIMARY for code
};
```

**Screenshot Verified:**

- Body text: 1.5 line height (relaxed)
- Code cells: 1.6 line height (loose)

### Typography Scale (Semantic)

```typescript
const typography = {
  h1: {
    fontSize: fontSize['4xl'], // 32px
    fontWeight: fontWeight.bold, // 700
    lineHeight: lineHeight.tight, // 1.25
    letterSpacing: '-0.02em', // Tight tracking
  },
  h2: {
    fontSize: fontSize['3xl'], // 24px
    fontWeight: fontWeight.semibold, // 600
    lineHeight: lineHeight.snug, // 1.3
  },
  h3: {
    fontSize: fontSize.xl, // 18px
    fontWeight: fontWeight.semibold, // 600
    lineHeight: lineHeight.normal, // 1.4
  },
  body: {
    fontSize: fontSize.base, // 14px
    fontWeight: fontWeight.normal, // 400
    lineHeight: lineHeight.relaxed, // 1.5
  },
  small: {
    fontSize: fontSize.sm, // 12px
    fontWeight: fontWeight.normal, // 400
    lineHeight: lineHeight.normal, // 1.4
  },
  code: {
    fontSize: '13px', // Slightly larger than small
    fontWeight: fontWeight.normal, // 400
    fontFamily: fontFamily.mono,
    lineHeight: lineHeight.normal, // 1.4
  },
  label: {
    fontSize: fontSize.sm, // 12px
    fontWeight: fontWeight.medium, // 500
    lineHeight: lineHeight.normal, // 1.4
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};
```

---

## Spacing & Sizing

### Spacing Scale (8px base)

Hex uses an 8px base spacing scale for consistent layouts:

```typescript
const spacing = {
  0: '0px',
  0.5: '2px', // Micro spacing
  1: '4px', // Tiny spacing
  1.5: '6px', // Very tight spacing
  2: '8px', // Tight spacing (BASE UNIT)
  3: '12px', // Default spacing
  4: '16px', // Comfortable spacing
  5: '20px', // Loose spacing
  6: '24px', // Section spacing
  8: '32px', // Large spacing
  10: '40px', // XL spacing
  12: '48px', // XXL spacing
  16: '64px', // Section breaks
  20: '80px', // Page sections
  24: '96px', // Hero spacing
};
```

**Common Patterns:**

- Component padding: `spacing[4]` (16px)
- Card padding: `spacing[4]` or `spacing[6]` (16-24px)
- Section margins: `spacing[8]` or `spacing[12]` (32-48px)
- Button padding: `spacing[2]` `spacing[4]` (8px 16px)
- Input padding: `spacing[2]` `spacing[3]` (8px 12px)

### Sizing Scale

```typescript
const sizing = {
  // Fixed sizes
  xs: '20px',
  sm: '24px',
  md: '28px',
  lg: '32px',
  xl: '36px',
  '2xl': '40px',
  '3xl': '48px',

  // Icon sizes
  iconXs: '12px',
  iconSm: '16px',
  iconMd: '20px',
  iconLg: '24px',
  iconXl: '32px',

  // Touch targets (minimum 44x44px for accessibility)
  touchTarget: '44px',

  // Layout widths
  sidebarWidth: '256px', // 16rem
  contentMaxWidth: '1280px', // 80rem
  threadMaxWidth: '800px', // 50rem
  formMaxWidth: '600px', // 37.5rem
};
```

---

## Shadows & Elevation

### Shadow Tokens

Hex uses very subtle shadows for elevation and depth:

```typescript
const shadows = {
  none: 'none',

  // Subtle elevation (verified from screenshots)
  subtle: '0 1px 2px rgba(0, 0, 0, 0.04)', // Input fields, empty states

  // Default elevation - VERY subtle in Hex
  base: '0 1px 3px rgba(0, 0, 0, 0.05)', // Cards, AI responses (PRIMARY)

  // Medium elevation (cards on hover)
  md: '0 2px 4px rgba(0, 0, 0, 0.06)', // Hover states

  // High elevation (modals, popovers)
  lg: '0 4px 6px rgba(0, 0, 0, 0.1)', // Modals, popovers

  // Maximum elevation (dropdowns above modals)
  xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

  // Focus rings
  focus: '0 0 0 3px rgba(59, 130, 246, 0.1)', // blue-500 at 10% (subtle)
  focusError: '0 0 0 3px rgba(239, 68, 68, 0.2)', // red-500 at 20%
};
```

**Screenshot Verified:**

- Hex uses MUCH more subtle shadows than typical UI kits
- Cards: 0 1px 3px rgba(0,0,0,0.05) - barely perceptible
- Input fields: 0 1px 2px rgba(0,0,0,0.04) - extremely subtle

**Usage:**

- Cards: `shadow.base` (very subtle), `shadow.md` (on hover)
- Input fields: `shadow.subtle`
- Dropdowns/Menus: `shadow.lg`
- Modals: `shadow.xl`
- Focus states: `shadow.focus`

---

## Border Radius

### Radius Tokens

Hex uses consistent border radius for a cohesive feel:

```typescript
const borderRadius = {
  // Verified from screenshots
  none: '0px',
  sm: '4px', // Small elements, badges, YML tags
  base: '6px', // Code cells, small cards
  md: '8px', // Main cards, message bubbles, inputs (PRIMARY)
  lg: '12px', // Large buttons, modals
  xl: '16px', // Hero sections
  '2xl': '24px', // Extra large containers
  full: '9999px', // Pills, circular avatars
};
```

**Screenshot Verified:**

- Message bubbles (user input): 8px
- Input fields: 8px
- Cards: 8px (most common)
- Code cells: 6px
- Small badges: 4px

**Common Patterns:**

- Buttons: `radius.md` (8px)
- Cards: `radius.md` (8px) - PRIMARY
- Message bubbles: `radius.md` (8px)
- Code cells: `radius.base` (6px)
- Input fields: `radius.md` (8px)
- Badges: `radius.sm` (4px) or `radius.full` (pill shape)
- Avatars: `radius.full` (circular)

---

## Animation & Timing

### Duration

```typescript
const duration = {
  instant: '0ms',
  fast: '150ms', // Quick interactions (hover, active)
  base: '200ms', // Default transitions
  slow: '300ms', // Emphasis, drawer open/close
  slower: '500ms', // Large animations
};
```

### Easing

```typescript
const easing = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', // PRIMARY (smooth, natural)
};
```

**Hex Convention**: Use `easeInOut` for most transitions (feels natural)

### Common Transitions

```typescript
const transition = {
  // Colors
  colors: `color ${duration.base} ${easing.easeInOut},
           background-color ${duration.base} ${easing.easeInOut},
           border-color ${duration.base} ${easing.easeInOut}`,

  // Opacity
  opacity: `opacity ${duration.base} ${easing.easeInOut}`,

  // Shadows (hover elevation)
  shadow: `box-shadow ${duration.base} ${easing.easeInOut}`,

  // Transform
  transform: `transform ${duration.base} ${easing.easeInOut}`,

  // All properties
  all: `all ${duration.base} ${easing.easeInOut}`,
};
```

---

## Breakpoints

### Responsive Breakpoints (Mobile-First)

Hex follows a mobile-first approach:

```typescript
const breakpoints = {
  xs: '0px', // Mobile (default, no media query needed)
  sm: '640px', // Large mobile / small tablet
  md: '768px', // Tablet
  lg: '1024px', // Desktop
  xl: '1280px', // Large desktop
  '2xl': '1536px', // Extra large desktop
};
```

**Usage (Tailwind):**

```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Full width on mobile, half on tablet, third on desktop */}
</div>
```

**Hex Layout Patterns:**

- **Mobile** (< 768px): Stack layouts, hide sidebar, show hamburger menu
- **Tablet** (768-1024px): Hybrid layouts, collapsible sidebar
- **Desktop** (> 1024px): Full layouts, persistent sidebar

---

## Dark Mode

### Dark Mode Color Palette

Hex supports dark mode with inverted neutrals and adjusted colors:

```typescript
const darkMode = {
  // Backgrounds
  canvas: gray[900], // #111827
  canvasSubtle: gray[800], // #1F2937
  surface: gray[800], // #1F2937
  surfaceHover: gray[700], // #374151
  surfaceSelected: blue[900], // #142966 with blue tint

  // Borders
  borderDefault: gray[700], // #374151
  borderStrong: gray[600], // #4B5563
  borderSubtle: gray[800], // #1F2937

  // Text
  textPrimary: gray[100], // #F3F4F6
  textSecondary: gray[400], // #9CA3AF
  textTertiary: gray[500], // #6B7280
  textDisabled: gray[600], // #4B5563

  // Interactive (slightly brighter in dark mode)
  primary: blue[400], // #5C93FF (lighter than blue-500)
  primaryHover: blue[300], // #85AEFF
  primaryActive: blue[500], // #4B7FFF

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)', // Darker overlay
  scrim: 'rgba(0, 0, 0, 0.5)',
};
```

**Dark Mode Implementation (Tailwind):**

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
  {/* Light mode: white bg, dark text */}
  {/* Dark mode: dark bg, light text */}
</div>
```

---

## Component-Specific Tokens

### Loading States (Verified from Screenshots)

```typescript
const loading = {
  // "Thinking..." indicator
  thinking: {
    text: gray[800], // "Thinking." text (#1F2937)
    dots: gray[300], // Dot color (#D1D5DB)
    dotSize: '4-6px', // Dot diameter
    dotSpacing: '4-6px', // Space between dots
    rows: 3, // Number of rows in animation
  },

  // "Working..." status bar
  working: {
    background: gray[50], // Status bar background (#F9FAFB)
    border: gray[200], // Border (#E5E7EB)
    text: gray[600], // "Working..." text (#4B5563)
    borderRadius: borderRadius.base, // 6px
    padding: '12px 20px',
  },
};
```

### Message Bubbles (Threads Interface)

```typescript
const messageBubble = {
  // User input messages
  user: {
    background: gray[100], // Light gray bubble (#F3F4F6)
    text: gray[500], // Medium gray text (#6B7280)
    border: gray[200], // Subtle border (#E5E7EB)
    borderRadius: borderRadius.md, // 8px
    padding: '12px 16px',
  },

  // AI response messages
  ai: {
    background: gray.white, // White background (#FFFFFF)
    text: gray[800], // Dark text (#1F2937)
    borderRadius: borderRadius.md, // 8px
    padding: '24px 32px',
    shadow: shadows.base, // Very subtle shadow
  },
};
```

### Input Fields (Verified from Screenshots)

```typescript
const input = {
  // Standard input field
  default: {
    background: gray.white, // White background (#FFFFFF)
    border: gray[300], // Input border (#D1D5DB)
    borderWidth: '1px',
    borderRadius: borderRadius.md, // 8px
    padding: '16px 20px',
    placeholder: gray[400], // Placeholder text (#9CA3AF)
    fontSize: fontSize.base, // 14px
    shadow: shadows.subtle, // Very subtle shadow
  },

  // Empty state input (larger, with 2px border)
  emptyState: {
    background: gray.white,
    border: gray[200], // Lighter border (#E5E7EB)
    borderWidth: '2px',
    borderRadius: borderRadius.md, // 8px
    padding: '16px 20px',
    fontSize: fontSize.md, // 15px
    shadow: shadows.subtle,
  },
};
```

### Code Cells (Notebook Agent)

```typescript
const codeCell = {
  background: gray.white, // White background (#FFFFFF)
  border: gray[200], // Border (#E5E7EB)
  borderRadius: borderRadius.base, // 6px
  padding: '16px 20px',
  fontFamily: fontFamily.mono, // SF Mono
  fontSize: fontSize.sm, // 13px
  lineHeight: lineHeight.loose, // 1.6
  textColor: gray[800], // Code text (#1F2937)
};
```

### File List Items (Modeling Agent)

```typescript
const fileListItem = {
  fontSize: fontSize.base, // 14px
  textColor: gray[800], // File name (#1F2937)
  extension: gray[400], // .yml extension (#9CA3AF)
  spacing: spacing[2], // 8px between items
  padding: spacing[2], // 8px padding
};
```

### Empty States

```typescript
const emptyState = {
  icon: {
    size: '48px',
    color: gray[300], // Light gray icon (#D1D5DB)
  },
  heading: {
    fontSize: fontSize.lg, // 18px or larger
    fontWeight: fontWeight.semibold, // 600
    color: gray[900], // Dark heading (#111827)
    marginBottom: spacing[1], // 4px
  },
  description: {
    fontSize: fontSize.base, // 14px
    color: gray[500], // Medium gray (#6B7280)
    marginBottom: spacing[4], // 16px
  },
  link: {
    fontSize: fontSize.sm, // 12-14px
    color: blue[500], // Blue link (#3B82F6)
  },
};
```

---

## Usage Guidelines

### CSS Variables (Tailwind Config)

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Primitives
        blue: {
          /* ... */
        },
        gray: {
          /* ... */
        },
        // etc.

        // Semantic tokens
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        // etc.
      },
      spacing: {
        /* ... */
      },
      fontSize: {
        /* ... */
      },
      fontWeight: {
        /* ... */
      },
      borderRadius: {
        /* ... */
      },
      boxShadow: {
        /* ... */
      },
    },
  },
};
```

### Component Examples

#### Button with Design Tokens

```tsx
// Primary button
<button className="
  bg-blue-500 hover:bg-blue-600 active:bg-blue-700
  text-white
  px-4 py-2
  rounded-md
  shadow-sm hover:shadow-md
  transition-all duration-200
  font-medium
">
  Primary Button
</button>

// Secondary button
<button className="
  bg-transparent hover:bg-gray-50
  text-gray-700 hover:text-gray-900
  border border-gray-200
  px-4 py-2
  rounded-md
  transition-colors duration-200
  font-medium
">
  Secondary Button
</button>
```

#### Card with Design Tokens

```tsx
<div
  className="
  bg-white
  border border-gray-200
  rounded-md
  p-4
  shadow-base hover:shadow-md
  transition-shadow duration-200
"
>
  Card Content
</div>
```

#### Input with Design Tokens

```tsx
<input
  className="
  w-full
  px-3 py-2
  border border-gray-200
  rounded-md
  text-gray-800
  placeholder:text-gray-400
  focus:outline-none
  focus:border-blue-500
  focus:ring-2
  focus:ring-blue-500/20
  transition-all duration-200
"
/>
```

### Token Selection Guide

**When choosing tokens:**

1. **Start with semantic tokens** (e.g., `text-primary`, `bg-surface`)
2. **Use primitives for custom needs** (e.g., `blue-500` for brand)
3. **Prefer established patterns** from this document
4. **Ensure WCAG AA contrast** for text (4.5:1 minimum)
5. **Test in both light and dark mode**

### Accessibility Notes

**Color Contrast Requirements:**

- Normal text (< 18px): 4.5:1 minimum
- Large text (≥ 18px or ≥ 14px bold): 3:1 minimum
- UI components: 3:1 minimum

**Touch Targets:**

- Minimum size: 44x44px (use `sizing.touchTarget`)
- Comfortable spacing between targets: 8px minimum

**Focus Indicators:**

- Always provide visible focus states
- Use `shadow.focus` for consistency
- Minimum 3px focus ring width

---

## Implementation Checklist

**Before using these tokens:**

- [ ] Import design tokens into `tailwind.config.ts`
- [ ] Set up CSS variables for theme switching
- [ ] Configure dark mode strategy (`class` or `media`)
- [ ] Test color contrast with WCAG tools
- [ ] Verify touch target sizes on mobile
- [ ] Document any custom tokens added to the system

---

**Maintained by**: Design System Team
**Questions?**: See [HEX_DESIGN_SYSTEM.md](./HEX_DESIGN_SYSTEM.md) for visual references
