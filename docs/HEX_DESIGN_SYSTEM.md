# Hex Design System Reference

> **Purpose**: Document Hex's UI/UX patterns for design alignment across Olympus platform
>
> **Last Updated**: 2025-10-27 (Added official Hex brand colors and typography from media kit)
>
> **Project Decision**: Adopt 100% Hex aesthetic for all features (document intelligence + database analytics)

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Layout Patterns](#layout-patterns)
5. [Component Library](#component-library)
6. [Interaction Patterns](#interaction-patterns)
7. [Feature-Specific Patterns](#feature-specific-patterns)
8. [Visual References](#visual-references)

---

## Design Philosophy

### Hex's Core Design Principles (Observed)

1. **Clarity Over Complexity**
   - Clean, minimal interfaces
   - Focus on data and results
   - Reduce cognitive load

2. **Data-First Design**
   - Results and visualizations are primary
   - UI chrome is secondary
   - Generous whitespace around content

3. **Conversational AI Integration**
   - Natural language as first-class input method
   - Inline AI assistance
   - Source-type indicators (SQL vs document vs computation)

4. **Professional Tool Aesthetic**
   - Not playful or consumer-focused
   - Serious, business-oriented tone
   - Refined, polished UI elements

5. **Responsive & Mobile-Friendly**
   - Threads designed "mobile-first"
   - Adaptive layouts
   - Touch-friendly interaction targets

---

## Color Palette

### Brand Colors (Official from Hex Media Kit)

> **Reference**: See `docs/visual-references/hex/hex-media-kit-colors.png` for official color swatches

**Official Hex Brand Palette**

- **Obsidian** (Dark Background): `#1d141c` / RGB(29, 20, 28) / CMYK(0, 0, 0, 0)
- **Rose Quartz** (Accent Pink): `#f5cdc0` / RGB(245, 205, 192) / CMYK(0, 0, 0, 0)
- **Jade** (Teal/Green): `#5cb196` / RGB(92, 177, 152) / CMYK(33, 0, 10, 13)
- **Amethyst** (Purple): `#a477b2` / RGB(164, 119, 178) / CMYK(5, 23, 9, 30)
- **Citrine** (Yellow/Gold): `#cda849` / RGB(205, 168, 73) / CMYK(0, 15, 52, 20)
- **Opal** (Light/White): `#fbf0f9` / RGB(251, 240, 249) / CMYK(0, 1, 1, 2)
- **Sugilite** (Dark Purple): `#6f3f90` / RGB(111, 63, 144) / CMYK(24, 30, 0, 38)
- **Cement** (Neutral Gray): `#717a94` / RGB(113, 122, 149) / CMYK(14, 10, 0, 42)

**Usage Guidelines:**

- Use **Jade** and **Amethyst** for primary brand accents
- **Obsidian** for dark mode backgrounds
- **Opal** for light mode elevated surfaces
- **Cement** for neutral UI elements and borders
- **Rose Quartz**, **Citrine**, and **Sugilite** for data visualization and accent highlights

---

### UI Colors (Verified from Fall 2025 Agents Screenshots)

**Action & Interactive**

- Primary Blue: `#3B82F6` (focus rings, links, string literals in code)
- Accent Purple: `#8B5CF6` (SQL keywords, functions, AI features, highlights)

**Backgrounds**

- Page Background: `#FAFBFC` (off-white canvas - main page)
- Card Background: `#FFFFFF` (white - cards, AI responses, code cells)
- Notebook Background: `#F5F6F7` (subtle gray - Notebook agent)
- User Input Bubble: `#F3F4F6` (light gray - user messages)
- Working Status Background: `#F9FAFB` (elevated surfaces)

**Neutrals (Verified from Screenshots)**

- Text Primary (Headings): `#111827` (darkest - headings, emphasis)
- Text Secondary (Body): `#1F2937` (dark gray - body text, code)
- Text Tertiary: `#4B5563` (medium - de-emphasized text)
- Text Quaternary: `#6B7280` (lighter - user messages, metadata)
- Text Placeholder: `#9CA3AF` (lightest text - placeholders)
- Border Default: `#E5E7EB` (default borders, dividers)
- Border Strong: `#D1D5DB` (input borders, emphasized borders)
- Loading Dots: `#D1D5DB` (thinking animation dots)

**Semantic Colors**

- Success Green: `#10B981` (successful operations, ready status)
- Error Red: `#EF4444` (errors, destructive actions)
- Warning Orange: `#F97316` (warnings, caution states)
- Info Blue: `#3B82F6` (informational messages, links)

**Code Syntax (Verified from Notebook Agent Screenshots)**

- Code Background: `#FFFFFF` (white)
- Code Border: `#E5E7EB` (light gray)
- SQL Keyword: `#8B5CF6` (purple - SELECT, FROM, WHERE)
- SQL Function: `#8B5CF6` (purple - COUNT, EXTRACT)
- String Literal: `#3B82F6` (blue - 'active')
- Comment: `#6B7280` (medium gray)
- Number: `#1F2937` (dark gray)
- Operator: `#4B5563` (medium gray)

### Source-Type Indicators (Gradients)

**For Hybrid Queries (SQL + Documents):**

- SQL Result Badge: `linear-gradient(to right, #4B7FFF, #3366FF)` - Blue gradient
- Document Citation Badge: `linear-gradient(to right, #10B981, #0D9488)` - Green to teal gradient
- Computation Badge: `linear-gradient(to right, #8B5CF6, #7C3AED)` - Purple gradient
- Combined Result Badge: Multi-color gradient (context-dependent)

**Complete Color Reference**: See [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) for full primitive and semantic color palettes.

---

## Typography

### Font Families (Hex-Inspired with Google Font Alternatives)

> **Hex's Official Fonts**: PP Formula (interface) and GT Cinetype (body/code)
>
> **Our Implementation**: DM Sans and IBM Plex Mono (free Google Font alternatives)

**Primary Interface Font**

```css
font-family:
  'DM Sans',
  'Inter',
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  'Helvetica Neue',
  Arial,
  sans-serif;
```

**Body & Code Font**

```css
font-family:
  'IBM Plex Mono', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas,
  monospace;
```

**Font Stack Rationale:**

- **DM Sans**: Google Font alternative to PP Formula - geometric sans-serif for headings, navigation, buttons, and UI labels
- **IBM Plex Mono**: Google Font alternative to GT Cinetype - geometric monospace for body text, data tables, code blocks, and SQL queries
- System fonts as fallbacks ensure graceful degradation
- Both fonts maintain Hex's geometric, mechanical aesthetic while being free and open-source

### Type Scale (Verified from Screenshots)

| Element    | Size    | Weight | Line Height | Usage                                    |
| ---------- | ------- | ------ | ----------- | ---------------------------------------- |
| H1         | 32px    | 700    | 1.25        | Page titles                              |
| H2         | 24-28px | 600    | 1.3         | Section headers ("Top Sales Performers") |
| H3         | 18px    | 600    | 1.4         | Subsection headers                       |
| Body       | 14px    | 400    | 1.5         | Main content (PRIMARY)                   |
| Emphasized | 15px    | 400    | 1.5         | Emphasized body text, large inputs       |
| Small      | 12px    | 400    | 1.4         | Meta, timestamps ("16 hrs ago")          |
| Code       | 13px    | 400    | 1.6         | Code blocks, SQL (PRIMARY for code)      |

### Text Styles

**Emphasis**

- Bold: `font-weight: 600`
- Italic: Used sparingly for emphasis
- Monospace: All code, table names, column names

---

## Layout Patterns

### 1. Threads Chat Interface (Fall 2025 Agents)

**Layout Structure** (Verified from screenshots: `threads-01.png` - `threads-27.png`):

```
┌─────────────────────────────────────────────┐
│ Page Background: #FAFBFC (off-white)        │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ User Question                         │  │
│  │ Background: #F3F4F6 (light gray)      │  │
│  │ Text: #6B7280                         │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ "Thinking..." (optional loading)      │  │
│  │ • • • • • • (animated dots)           │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ AI Response                           │  │
│  │ Background: #FFFFFF (white card)      │  │
│  │                                       │  │
│  │ **Top Sales Performers**              │  │
│  │                                       │  │
│  │ 1. **Natalie Benjamin** - $1.2M      │  │
│  │ 2. **Person Name** - Amount          │  │
│  │                                       │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Working... [Stop]                     │  │
│  │ Background: #F9FAFB                   │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Ask a question...                     │  │
│  │ Background: #FFFFFF                   │  │
│  │ Border: #D1D5DB (1px)                 │  │
│  │ 🗄️ [Demo] Hex Public D...            │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Key Features (Screenshot Verified)**:

- **Page background**: Off-white #FAFBFC (not pure white)
- **User messages**: Light gray bubbles #F3F4F6 with medium gray text #6B7280
- **AI responses**: White cards #FFFFFF with very subtle shadow (0 1px 3px rgba(0,0,0,0.05))
- **Loading state**: "Thinking..." text with 3 rows of animated dots (#D1D5DB)
- **Working status**: Separate bar with #F9FAFB background, border, spinner, and Stop button
- **Input field**: Large multi-line input with database indicator at bottom right
- **Generous spacing**: 40-48px vertical padding, centered content (max-width ~800-900px)
- **Typography**: 14px body, 24-28px headings, bold names in lists

### 2. Notebook Agent (Fall 2025 Agents)

**Layout Structure** (Verified from screenshots: `notebook-agent-01.png` - `notebook-agent-14.png`):

```
┌──────────────┬──────────────────────────────┐
│              │ Page Background: #F5F6F7     │
│  Sidebar     │                              │
│  Background: │  ┌────────────────────────┐  │
│  #2D3748     │  │ Code Cell              │  │
│  (Dark)      │  │ Background: #FFFFFF    │  │
│              │  │ Border: #E5E7EB (1px)  │  │
│  File Tree:  │  │                        │  │
│  • file1.sql │  │ SELECT                 │  │
│  • file2.sql │  │   order_month,         │  │
│  • file3.sql │  │   COUNT(*)             │  │
│              │  │ FROM orders            │  │
│              │  │ WHERE status='active'  │  │
│              │  │                        │  │
│              │  │ Syntax:                │  │
│              │  │ • Keywords: #8B5CF6    │  │
│              │  │ • Strings: #3B82F6     │  │
│              │  │ • Functions: #8B5CF6   │  │
│              │  │                        │  │
│              │  │ Font: SF Mono, 13px    │  │
│              │  │ Line height: 1.6       │  │
│              │  └────────────────────────┘  │
│              │                              │
│              │  [Results displayed below]   │
└──────────────┴──────────────────────────────┘
```

**Key Features (Screenshot Verified)**:

- **Sidebar**: Dark gray background (#2D3748), white/light text (#F9FAFB), ~240-280px width
- **Main canvas**: Light background (#F5F6F7 or #FAFBFC)
- **Code cells**:
  - White background (#FFFFFF)
  - 1px border (#E5E7EB)
  - 6px border radius
  - 16-20px padding
  - SF Mono font at 13px
  - Line height 1.6
- **SQL syntax highlighting**:
  - Keywords (SELECT, FROM, WHERE): Purple #8B5CF6
  - Strings ('active'): Blue #3B82F6
  - Functions (COUNT, EXTRACT): Purple #8B5CF6
  - Comments: Gray #6B7280
  - Numbers: Dark gray #1F2937
- **Clean, minimal design** focused on code readability

### 3. Database Connection UI

**Layout Structure** (Reference: `hex-data-connections-full.png`):

```
┌─────────────────────────────────────────────┐
│ Data Connections                [+ New]     │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 🔗 Snowflake Production              │    │
│ │ snowflake://prod.us-east...          │    │
│ │ ✓ Connected   [Test] [Edit] [•••]   │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 🔗 BigQuery Analytics                │    │
│ │ bigquery://project-123...            │    │
│ │ ✓ Connected   [Test] [Edit] [•••]   │    │
│ └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**Key Features**:

- Card-based connection list
- Status indicators
- Quick actions (Test, Edit)
- Connection string preview

### 4. Modeling Agent (Fall 2025 Agents)

**Layout Structure** (Verified from screenshots: `modeling-agent-01.png` - `modeling-agent-16.png`):

```
┌──────────────┬──────────────────────────────┐
│  Sidebar     │ Main Work Area               │
│  Background: │ (Empty State Shown)          │
│  #FAFBFC     │                              │
│  Border:     │     ┌─────────────┐          │
│  #E5E7EB     │     │ YML  📊     │          │
│              │     │ Badge Chart │          │
│  File List:  │     └─────────────┘          │
│              │                              │
│  accounts    │  What do you want to         │
│  .yml        │  work on?                    │
│              │                              │
│  campaign_   │  Ask questions, write code,  │
│  members     │  and build models.           │
│  .yml        │  Learn more                  │
│              │                              │
│  customers   │  ┌────────────────────────┐  │
│  .yml        │  │ @ Ask, edit, create... │  │
│              │  │                        │  │
│  opportuni   │  │ Background: #FFFFFF    │  │
│  ties.yml    │  │ Border: #E5E7EB (2px)  │  │
│              │  └────────────────────────┘  │
│              │                              │
│  20-25%      │  Database: 🗄️ [Demo]        │
│  width       │  Hex Public D...             │
└──────────────┴──────────────────────────────┘
```

**Key Features (Screenshot Verified)**:

- **Split layout**: Left sidebar (~20-25% width), right work area (~75-80% width)
- **Sidebar**:
  - Background: #FAFBFC
  - Border right: 1px solid #E5E7EB
  - Padding: 16px
  - File list with .yml extensions in light gray (#9CA3AF)
  - 14px font size, 8px spacing between items
- **Empty state** (centered in work area):
  - Icon stack (YML badge + analytics chart)
  - Large heading: "What do you want to work on?"
  - Supporting text in medium gray
  - "Learn more" link in blue (#3B82F6)
  - Input field below
- **Input field** (empty state):
  - White background (#FFFFFF)
  - 2px border (#E5E7EB) - stronger than typical 1px
  - 8px border radius
  - 16-20px padding
  - @ symbol icon inside (left)
  - Placeholder: "Ask, edit, create..."
  - Clean, inviting design
- **Clean separation** with subtle divider between sidebar and work area

---

## Component Library

### Button Styles

**Primary Button**

```css
background: [Primary Blue Gradient];
color: white;
border-radius: 6px;
padding: 8px 16px;
font-weight: 500;
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
```

**Secondary Button**

```css
background: white;
color: [Text Primary];
border: 1px solid [Border Gray];
border-radius: 6px;
padding: 8px 16px;
```

**Icon Button**

```css
background: transparent;
border: none;
padding: 6px;
border-radius: 4px;
&:hover {
  background: [Panel Gray];
}
```

### Input Fields

**Text Input**

```css
border: 1px solid [Border Gray];
border-radius: 6px;
padding: 8px 12px;
font-size: 14px;
&:focus {
  border-color: [Primary Blue];
  outline: none;
  box-shadow: 0 0 0 3px rgba([Primary Blue], 0.1);
}
```

**Chat Input (Threads)**

```css
border: 2px solid [Border Gray];
border-radius: 12px;
padding: 12px 16px;
min-height: 48px;
resize: none;
```

### Cards

**Connection Card**

```css
background: white;
border: 1px solid [Border Gray];
border-radius: 8px;
padding: 16px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
&:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
```

### Badges & Pills

**Source-Type Badge**

```css
display: inline-flex;
align-items: center;
padding: 4px 8px;
border-radius: 12px;
font-size: 11px;
font-weight: 600;
background: [Badge Background Gradient];
color: white;
```

**Status Pill**

```css
padding: 2px 8px;
border-radius: 10px;
font-size: 11px;
font-weight: 500;
/* Colors vary by status */
```

### Code Blocks

**SQL Cell**

```css
background: [Code Background];
border: 1px solid [Border Gray];
border-radius: 6px;
padding: 12px;
font-family: [Monospace];
font-size: 13px;
line-height: 1.5;
/* Syntax highlighting applied */
```

---

## Interaction Patterns

### 1. @Mentions (Threads)

**Behavior**:

- Type `@` to trigger autocomplete
- Shows available semantic models and tables
- Fuzzy search as you type
- Select with keyboard or click
- Mention rendered as pill in message

**UI**:

```
User typing: "Show me revenue from @cus[▼]"
                                      ↓
┌──────────────────────┐
│ @customers           │  ← Selected
│ @customer_segments   │
│ @customer_events     │
└──────────────────────┘
```

### 2. Cell Execution

**States**:

1. **Idle**: Gray "Run" button
2. **Running**: Blue spinner, "Running..." text
3. **Complete**: Green checkmark, results appear
4. **Error**: Red error icon, error message

**Animation**:

- Smooth height transition as results appear
- Skeleton loading for table results
- Progressive rendering for large datasets

### 3. Hover States

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

**Table Row Hover**:

```css
background: transparent;
transition: background-color 150ms ease-in-out;

/* On Hover */
background: #f9fafb; /* gray-50 */
```

### 4. Loading States

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

### 5. Error States

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

**SQL Error (Inline)**:

```
┌─────────────────────────────────────┐
│ ⚠️ SQL Error                         │
│ Line 3: Unknown column 'revenu'     │
│ Did you mean 'revenue'?             │
│ [View Details]                      │
└─────────────────────────────────────┘
```

### 6. Empty States

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

**No Data / Empty Query Results**:

```tsx
<div className="flex flex-col items-center justify-center py-8 text-center">
  <DatabaseIcon className="w-12 h-12 text-gray-300 mb-3" />
  <h3 className="text-lg font-semibold text-gray-900 mb-1">No results found</h3>
  <p className="text-sm text-gray-500">Try adjusting your query or filters</p>
</div>
```

### 7. Disabled States

**Disabled Button**:

```css
background: #e5e7eb; /* gray-200 */
color: #9ca3af; /* gray-400 */
cursor: not-allowed;
opacity: 0.6;
pointer-events: none;
```

**Disabled Input**:

```css
background: #f9fafb; /* gray-50 */
border-color: #e5e7eb; /* gray-200 */
color: #9ca3af; /* gray-400 */
cursor: not-allowed;
pointer-events: none;
```

### 8. Focus States

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

**Accessible Focus** (visible on tab, hidden on click):

```css
/* Reset browser default */
*:focus {
  outline: none;
}

/* Show focus ring only for keyboard navigation */
*:focus-visible {
  outline: 2px solid #4b7fff;
  outline-offset: 2px;
}
```

---

## Feature-Specific Patterns

### Threads Conversational UI

**Message Bubbles**:

- User messages: Right-aligned, blue background
- AI responses: Left-aligned, white background with border
- Source badges: Inline, below AI response
- Timestamps: Subtle, gray, right-aligned

**Context Panel** (Collapsible):

- Data sources connected
- Active semantic models
- Recently used tables
- Workspace settings

### Notebook Cells

**Cell Types**:

1. **SQL Cell**: Blue icon, SQL syntax highlighting
2. **Python Cell**: Green icon, Python syntax highlighting
3. **Markdown Cell**: Gray icon, rendered markdown
4. **Chart Cell**: Purple icon, visualization config
5. **Input Cell**: Orange icon, parameter input

**Cell Toolbar**:

- Always visible: Cell type, Run button
- Hover visible: Move, Duplicate, Delete, More
- Focus visible: Format, Debug (for code cells)

### Database Connection Management

**Connection Wizard**:

1. Select warehouse type (Snowflake, BigQuery, etc.)
2. Enter credentials
3. Test connection
4. Name and save

**Connection Card Actions**:

- **Test**: Verify connection is active
- **Edit**: Update credentials
- **Delete**: Remove connection (with confirmation)
- **View Schema**: Browse tables/columns

### Semantic Model Builder

**Model Definition**:

- Drag-and-drop tables to add
- Visual relationship lines
- Metric formula editor
- Version history sidebar

**Modeling Agent Integration**:

- "Build with agent" button
- @mention existing projects for context
- Diff view for agent-proposed changes
- Accept/reject individual changes

---

## Visual References

### Screenshots Captured

All screenshots available in `docs/visual-references/hex/screenshots/`:

1. **hex-homepage-full.png** (8.9MB)
   - Overall product positioning
   - Hero layout
   - Feature highlights

2. **hex-threads-announcement-full.png** (3.1MB)
   - Threads conversational UI
   - Source badges
   - Mobile-first design

3. **hex-docs-overview-full.png** (848K)
   - Documentation layout
   - Navigation patterns
   - Content structure

4. **hex-ai-overview-full.png** (396K)
   - AI feature integration
   - Notebook Agent UI
   - Agent personas

5. **hex-sql-cells-full.png**
   - SQL cell interface
   - Query editor
   - Results table

6. **hex-chart-cells-full.png**
   - Chart configuration
   - Visualization previews
   - Cell toolbar

7. **hex-data-connections-full.png**
   - Connection cards
   - Status indicators
   - Management actions

8. **hex-semantic-layer-full.png**
   - Modeling workbench
   - Entity relationships
   - Metric definitions

---

## Implementation Guidance

### For Component Development

1. **Use screenshots as reference** when building components
2. **Extract exact color values** from screenshots using design tools
3. **Match spacing and sizing** precisely
4. **Replicate interaction patterns** (hover, focus, active states)
5. **Test against captured screenshots** for visual accuracy

### For Shadcn-ui Mapping

Map Hex patterns to Shadcn-ui components:

| Hex Pattern        | Shadcn-ui Component | Customization                        |
| ------------------ | ------------------- | ------------------------------------ |
| Threads chat input | `<Textarea>`        | Rounded corners, border style        |
| Source badge       | `<Badge>`           | Gradient backgrounds, custom colors  |
| Connection card    | `<Card>`            | Shadow on hover, action buttons      |
| Cell toolbar       | `<Toolbar>`         | Icon buttons, dropdowns              |
| SQL editor         | `<CodeEditor>`      | Syntax highlighting, line numbers    |
| Table results      | `<Table>`           | Infinite scroll, row hover           |
| Button styles      | `<Button>`          | Gradient primary, outlined secondary |

### Color Extraction TODO

**Action Required**: Use design tools to extract exact hex values from screenshots:

```bash
# Use ImageMagick or similar to sample colors:
# 1. Open hex-threads-announcement-full.png
# 2. Sample primary button color
# 3. Sample badge gradient colors
# 4. Update this document with exact values
```

---

## Next Steps

1. ✅ Screenshots captured (8/10 pages)
2. ⏳ Extract exact color palette from screenshots
3. ⏳ Download demo videos from YouTube
4. ⏳ Extract video frames for additional UI references
5. ⏳ Create component mapping document
6. ⏳ Update Shadcn-ui theme configuration
7. ⏳ Build first Hex-inspired component (Threads chat input)

---

## Related Documentation

- [hex/README.md](visual-references/hex/README.md) - Visual asset inventory
- [hex-component-mapping.md](guides/hex-component-mapping.md) - Component implementation plan
- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) - Hybrid platform PRD
- [DESIGN_SYSTEM.md](../apps/web/DESIGN_SYSTEM.md) - Frontend design system

---

**Last Updated**: 2025-10-25
**Maintainer**: Development Team
**Status**: Living document - update as more patterns are discovered
