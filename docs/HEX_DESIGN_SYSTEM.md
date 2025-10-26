# Hex Design System Reference

> **Purpose**: Document Hex's UI/UX patterns for design alignment across Olympus platform
>
> **Last Updated**: 2025-10-26
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

### Primary Colors (Extracted from Visual References)

**Action & Interactive**

- Primary Blue: `#4B7FFF` (CTA buttons, links, active states)
- Primary Blue Hover: `#3366FF` (hover states, pressed buttons)
- Accent Purple: `#8B5CF6` (AI features, highlights, special features)

**Neutrals**

- Background White: `#FFFFFF` (white canvas)
- Panel Gray: `#F9FAFB` (secondary backgrounds, subtle fills)
- Border Gray: `#E5E7EB` (dividers, borders, separators)
- Text Primary: `#1F2937` (main content, headings)
- Text Secondary: `#6B7280` (labels, meta, de-emphasized content)
- Text Tertiary: `#9CA3AF` (placeholder text)

**Semantic Colors**

- Success Green: `#10B981` (successful operations, ready status)
- Error Red: `#EF4444` (errors, destructive actions)
- Warning Orange: `#F97316` (warnings, caution states)
- Info Blue: `#4B7FFF` (informational messages, same as primary)

**Code & Data**

- Code Background: `#F6F8FA`
- SQL Keyword: `#D73A49` (observed in SQL cells)
- Function Call: `#6F42C1`
- String: `#032F62`
- Number: `#005CC5`

### Source-Type Indicators (Gradients)

**For Hybrid Queries (SQL + Documents):**

- SQL Result Badge: `linear-gradient(to right, #4B7FFF, #3366FF)` - Blue gradient
- Document Citation Badge: `linear-gradient(to right, #10B981, #0D9488)` - Green to teal gradient
- Computation Badge: `linear-gradient(to right, #8B5CF6, #7C3AED)` - Purple gradient
- Combined Result Badge: Multi-color gradient (context-dependent)

**Complete Color Reference**: See [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) for full primitive and semantic color palettes.

---

## Typography

### Font Families (Observed)

**Primary Interface Font**

```css
font-family:
  -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial,
  sans-serif;
```

**Monospace (Code & Data)**

```css
font-family:
  'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
```

### Type Scale

| Element | Size | Weight | Line Height | Usage              |
| ------- | ---- | ------ | ----------- | ------------------ |
| H1      | 32px | 700    | 1.25        | Page titles        |
| H2      | 24px | 600    | 1.3         | Section headers    |
| H3      | 18px | 600    | 1.4         | Subsection headers |
| Body    | 14px | 400    | 1.5         | Main content       |
| Small   | 12px | 400    | 1.4         | Meta, labels       |
| Code    | 13px | 400    | 1.4         | Code blocks, SQL   |

### Text Styles

**Emphasis**

- Bold: `font-weight: 600`
- Italic: Used sparingly for emphasis
- Monospace: All code, table names, column names

---

## Layout Patterns

### 1. Threads Chat Interface

**Layout Structure** (Reference: `hex-threads-announcement-full.png`):

```
┌─────────────────────────────────────────────┐
│ Header: Workspace Name, Settings           │
├─────────────────────────────────────────────┤
│                                             │
│  Conversation History                       │
│  ┌──────────────────────────────────────┐  │
│  │ User Message                          │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ AI Response                           │  │
│  │ [Source Badge: SQL] [Source Badge: Doc]│  │
│  └──────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│ Input Field with @mentions                  │
│ [Attach] [Web Search] [Send]               │
└─────────────────────────────────────────────┘
```

**Key Features**:

- Full-width conversation area
- Sticky input at bottom
- Source badges inline with responses
- @mention autocomplete for data sources

### 2. Notebook Cell Layout

**Layout Structure** (Reference: `hex-sql-cells-full.png`):

```
┌─────────────────────────────────────────────┐
│ [Cell Type: SQL ▼] [▶ Run] [•••]           │
├─────────────────────────────────────────────┤
│ SELECT *                                    │
│ FROM customers                              │
│ WHERE status = 'active'                     │
├─────────────────────────────────────────────┤
│ ✓ Results (1,234 rows) [Export ▼]          │
│                                             │
│ ┌────┬────────┬────────┬─────────┐        │
│ │ ID │ Name   │ Email  │ Status  │        │
│ ├────┼────────┼────────┼─────────┤        │
│ │ 1  │ Alice  │ a@...  │ active  │        │
│ └────┴────────┴────────┴─────────┘        │
└─────────────────────────────────────────────┘
```

**Key Features**:

- Clear cell boundary
- Type selector (SQL, Python, Markdown, Chart)
- Run button prominent
- Results fold out below code
- Table results with infinite scroll

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

### 4. Semantic Model Builder

**Layout Structure** (Reference: `hex-semantic-layer-full.png`):

```
┌──────────────┬──────────────────────────────┐
│              │ Model: Customer Analytics    │
│ Models List  ├──────────────────────────────┤
│              │                              │
│ > Customers  │ Tables                       │
│   Orders     │ ├─ customers                 │
│   Products   │ ├─ orders                    │
│              │ └─ subscriptions             │
│              │                              │
│              │ Metrics                      │
│              │ ├─ Total Revenue             │
│              │ ├─ Active Users              │
│              │ └─ Churn Rate                │
└──────────────┴──────────────────────────────┘
```

**Key Features**:

- Sidebar navigation (model list)
- Main panel (model definition)
- Tree structure for tables/metrics
- Visual relationship indicators

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

**Interactive Elements**:

- Cards: Lift shadow on hover
- Buttons: Slight color shift
- Table rows: Highlight background
- Code: Show edit/copy icons

### 4. Loading States

**Inline Loaders**:

- Threads: Animated "..." bubble
- SQL results: Skeleton table rows
- Charts: Shimmer effect

### 5. Error Handling

**Inline Errors**:

```
┌─────────────────────────────────────┐
│ ⚠️ SQL Error                         │
│ Line 3: Unknown column 'revenu'     │
│ Did you mean 'revenue'?             │
│ [View Details]                      │
└─────────────────────────────────────┘
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
