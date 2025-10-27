# LOG-161 Completion Guide

> **Status**: Partially complete - Color extraction and design tokens done
> **Remaining Work**: Videos, frames, UI patterns, Storybook documentation
> **Estimated Time**: 8-10 hours

---

## Completed ✅

1. **Design Token Documentation** (`docs/DESIGN_TOKENS.md`)
   - Complete primitive color palette extracted from screenshots
   - Semantic color tokens (interactive, background, border, text, icon)
   - Typography system (fonts, sizes, weights, line heights)
   - Spacing & sizing scale (8px base)
   - Shadows, border radius, animation tokens
   - Breakpoints and dark mode specifications

2. **HEX_DESIGN_SYSTEM.md Updates**
   - All `#[TO_EXTRACT]` placeholders replaced with actual values
   - Primary Blue: #4B7FFF
   - Accent Purple: #8B5CF6
   - Complete neutral, success, error, warning colors
   - Source badge gradients with exact values

3. **DESIGN_SYSTEM.md Updates**
   - Complete color palette with all Hex colors
   - Badge gradients
   - Reference to DESIGN_TOKENS.md

---

## Remaining Tasks

### 1. Identify Hex Demo Videos (1 hour)

**YouTube Channel**: https://www.youtube.com/@_hex_tech/videos

**Videos to Identify (4-6 total)**:

- Threads conversational interface demo
- Notebook Agent in action
- SQL cells and polyglot notebooks
- Database connection management
- Semantic modeling/business logic layer
- General product tour

**Action**: Browse channel, document video URLs and titles in `scripts/download-hex-videos.sh`

### 2. Download Videos (1-2 hours)

**Script**: `scripts/download-hex-videos.sh`

**Example Format**:

```bash
#!/bin/bash

# Hex Demo Videos
VIDEOS=(
  "https://www.youtube.com/watch?v=VIDEO_ID_1"
  "https://www.youtube.com/watch?v=VIDEO_ID_2"
  # ... more URLs
)

for video in "${VIDEOS[@]}"; do
  yt-dlp -f "best[height<=1080]" -o "docs/visual-references/hex/videos/%(title)s.%(ext)s" "$video"
done
```

**Run**: `./scripts/download-hex-videos.sh`

### 3. Extract Video Frames (30 minutes)

**Script**: `scripts/extract-hex-video-frames.sh`

**Already configured for**: 0.5 FPS extraction (2 frames per second for UI-focused videos)

**Run**: `./scripts/extract-hex-video-frames.sh`

**Output**: `docs/visual-references/hex/frames/`

### 4. Document Additional UI Patterns (2-3 hours)

**File**: `docs/HEX_DESIGN_SYSTEM.md`

**Add Section After "Component Library"**:

````markdown
## Interaction Patterns & States

### Hover States

**Card Hover**:

```css
.card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 200ms ease-in-out;
}

.card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```
````

**Button Hover**:

```css
/* Primary Button */
background: linear-gradient(to right, #4b7fff, #3366ff);
transition: background-color 200ms ease-in-out;

/* On Hover */
background: linear-gradient(to right, #3366ff, #2952cc);
```

**Link Hover**:

```css
color: #4b7fff; /* blue-500 */
text-decoration: none;
transition: color 150ms ease-in-out;

/* On Hover */
color: #3366ff; /* blue-600 */
```

### Loading States

**Skeleton Loaders**:

```css
.skeleton {
  background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

**Spinner**:

```css
.spinner {
  border: 2px solid #e5e7eb; /* gray-200 */
  border-top-color: #4b7fff; /* blue-500 */
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

**Inline Streaming Indicator** (for AI responses):

```css
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background: #4b7fff;
  margin-left: 2px;
  animation: blink 1s steps(2) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
```

### Error States

**Input Error**:

```css
border-color: #ef4444; /* red-500 */
box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); /* red focus ring */
```

**Error Message**:

```tsx
<div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
  <div>
    <p className="text-sm font-medium text-red-900">Error Title</p>
    <p className="text-sm text-red-700">Error message details...</p>
  </div>
</div>
```

### Empty States

**No Documents**:

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <FileIcon className="w-12 h-12 text-gray-300 mb-3" />
  <h3 className="text-lg font-semibold text-gray-900 mb-1">No documents yet</h3>
  <p className="text-sm text-gray-500 mb-4">
    Upload PDFs or Word documents to get started
  </p>
  <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
    Upload Document
  </Button>
</div>
```

### Disabled States

**Disabled Button**:

```css
background: #e5e7eb; /* gray-200 */
color: #9ca3af; /* gray-400 */
cursor: not-allowed;
opacity: 0.6;
```

**Disabled Input**:

```css
background: #f9fafb; /* gray-50 */
border-color: #e5e7eb; /* gray-200 */
color: #9ca3af; /* gray-400 */
cursor: not-allowed;
```

### Focus States

**Input Focus**:

```css
border-color: #4b7fff; /* blue-500 */
outline: none;
box-shadow: 0 0 0 3px rgba(75, 127, 255, 0.2); /* blue-500 at 20% */
```

**Button Focus** (keyboard navigation):

```css
outline: 2px solid #4b7fff;
outline-offset: 2px;
```

````

---

## Storybook Documentation Tasks

### Overview

Create comprehensive Storybook documentation to serve as:
- Interactive component playground
- Design system reference for developers
- Visual QA tool
- Shareable documentation for stakeholders

### Stories to Create (6-8 hours)

#### 1. Introduction (`DesignSystem/Introduction.stories.mdx`)

```mdx
import { Meta } from '@storybook/addon-docs';

<Meta title="Design System/Introduction" />

# Olympus Design System

Welcome to the Olympus design system, inspired by 100% Hex aesthetic.

## Philosophy

Our design system follows Hex's core principles:
- **Data-first design** - Results are primary, UI chrome is secondary
- **Professional tool aesthetic** - Serious, business-oriented tone
- **Conversational AI** - Natural language as first-class input
- **Source transparency** - Clear visual indicators for SQL vs document results

## Resources

- [Complete Design Tokens](https://github.com/.../docs/DESIGN_TOKENS.md)
- [Hex Design Reference](https://github.com/.../docs/HEX_DESIGN_SYSTEM.md)
- [Component Mapping Guide](https://github.com/.../docs/guides/hex-component-mapping.md)

## Quick Start

```tsx
import { Button, Card, Badge } from '@olympus/ui';

<Card className="hover:shadow-md">
  <h3>Data Analysis</h3>
  <Badge className="bg-blue-500">SQL</Badge>
  <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
    Run Query
  </Button>
</Card>
````

````

#### 2. Colors (`DesignSystem/Colors.stories.tsx`)

```tsx
import { Meta } from '@storybook/react';

export default {
  title: 'Design System/Colors',
  parameters: {
    layout: 'padded',
  },
} as Meta;

// Color swatch component
const ColorSwatch = ({ color, name, hex }: any) => (
  <div className="flex items-center gap-3 mb-2">
    <div
      className="w-12 h-12 rounded-md border border-gray-200"
      style={{ background: hex }}
    />
    <div>
      <p className="font-medium text-sm">{name}</p>
      <p className="text-xs text-gray-500 font-mono">{hex}</p>
    </div>
  </div>
);

export const PrimaryBlues = () => (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Primary Blues</h2>
    <ColorSwatch color="blue-50" name="Blue 50" hex="#EBF2FF" />
    <ColorSwatch color="blue-100" name="Blue 100" hex="#D6E4FF" />
    <ColorSwatch color="blue-500" name="Blue 500 (PRIMARY)" hex="#4B7FFF" />
    <ColorSwatch color="blue-600" name="Blue 600 (Hover)" hex="#3366FF" />
    {/* ... more swatches */}
  </div>
);

export const Neutrals = () => (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Neutral Grays</h2>
    <ColorSwatch color="gray-50" name="Gray 50" hex="#F9FAFB" />
    {/* ... */}
  </div>
);

export const SourceBadgeGradients = () => (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Source Badge Gradients</h2>
    <div
      className="h-12 rounded-md mb-2"
      style={{ background: 'linear-gradient(to right, #4B7FFF, #3366FF)' }}
    >
      <span className="text-white font-semibold p-3">SQL Result</span>
    </div>
    <div
      className="h-12 rounded-md mb-2"
      style={{ background: 'linear-gradient(to right, #10B981, #0D9488)' }}
    >
      <span className="text-white font-semibold p-3">Document Citation</span>
    </div>
    <div
      className="h-12 rounded-md"
      style={{ background: 'linear-gradient(to right, #8B5CF6, #7C3AED)' }}
    >
      <span className="text-white font-semibold p-3">Computation</span>
    </div>
  </div>
);
````

#### 3-9. Remaining Stories

- **Typography.stories.tsx** - Font sizes, weights, line heights, type scale examples
- **Spacing.stories.tsx** - Spacing scale visualization with boxes
- **Shadows.stories.tsx** - Elevation examples with cards
- **BorderRadius.stories.tsx** - Radius scale examples
- **Animation.stories.tsx** - Transition examples, duration/easing playground
- **Icons.stories.tsx** - Icon sizes and color variants
- **Patterns.stories.mdx** - Hover, loading, error, empty, disabled states

### Storybook Config Update

**File**: `apps/web/.storybook/main.ts`

```typescript
const config = {
  stories: [
    '../src/stories/**/*.mdx',
    '../src/stories/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y', // Accessibility testing
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
};

export default config;
```

---

## Completion Checklist

**LOG-161 Tasks**:

- [x] Extract color palette from screenshots
- [x] Update HEX_DESIGN_SYSTEM.md with exact colors
- [x] Update DESIGN_SYSTEM.md with exact colors
- [x] Create DESIGN_TOKENS.md comprehensive reference
- [ ] Identify 4-6 Hex demo videos from YouTube
- [ ] Download videos using download-hex-videos.sh
- [ ] Extract frames using extract-hex-video-frames.sh
- [ ] Document additional UI patterns (hover, loading, error, empty, disabled states)

**Storybook Documentation**:

- [ ] Create Introduction.stories.mdx
- [ ] Create Colors.stories.tsx with swatches
- [ ] Create Typography.stories.tsx
- [ ] Create Spacing.stories.tsx
- [ ] Create Shadows.stories.tsx
- [ ] Create BorderRadius.stories.tsx
- [ ] Create Animation.stories.tsx
- [ ] Create Icons.stories.tsx
- [ ] Create Patterns.stories.mdx

**Final**:

- [ ] Update LOG-161 in Linear to "Done" status
- [ ] Commit all changes with message referencing LOG-161

---

## Next Steps

1. **Immediate**: Identify Hex demo videos (1 hour)
2. **Short-term**: Complete video downloads and frame extraction (2-3 hours)
3. **Medium-term**: Document UI patterns in HEX_DESIGN_SYSTEM.md (2-3 hours)
4. **Long-term**: Create Storybook stories (6-8 hours)

**Total Remaining**: ~10-14 hours

---

**Created**: 2025-10-26
**Related**: LOG-161, LOG-162 (Base Components)
