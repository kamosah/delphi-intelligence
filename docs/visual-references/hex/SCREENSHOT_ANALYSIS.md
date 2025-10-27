# Hex UI Screenshot Analysis

## Fall 2025 Agents Demo - Design Pattern Extraction

**Analysis Date**: 2025-10-26
**Source**: Fall 2025 Launch - Agents video
**Sections Analyzed**: Threads, Notebook Agent, Modeling Agent

---

## 1. Threads Interface (frames 01-27)

### Overview

Conversational AI interface for natural language interactions with data.

### Layout Patterns

**Main Canvas**:

- Full-width white/off-white background (#FFFFFF or #FAFBFC)
- Generous vertical padding (40-48px)
- Centered content column (max-width ~800-900px)

**Message Structure**:

- User questions in light gray bubbles (#F3F4F6)
- AI responses as plain text on white background
- Clear visual separation between message blocks
- Numbered lists with bold names (e.g., "**Natalie Benjamin**")

### Component Patterns

**AI Response Card**:

```css
background: #FFFFFF
padding: 24px 32px
border-radius: 8px
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) /* very subtle */
```

**User Input Bubble**:

```css
background: #F3F4F6
color: #6B7280 /* medium gray text */
padding: 12px 16px
border-radius: 8px
border: 1px solid #E5E7EB
```

**Loading State ("Thinking...")** (threads-10.png):

- Text: "Thinking." in dark gray (#1F2937)
- Dotted animation: 3 rows of gray dots (#D1D5DB)
- Spacing: dots are ~4-6px apart
- Animation: subtle fade/pulse effect

**Working Indicator** (threads-10.png):

```css
background: #F9FAFB
border: 1px solid #E5E7EB
border-radius: 6px
padding: 12px 20px
color: #4B5563 /* "Working..." text */
```

- Small circular spinner icon on left
- "Stop" button on right (text-only, gray)

**Input Field** (threads-10.png):

```css
background: #FFFFFF
border: 1px solid #D1D5DB
border-radius: 8px
padding: 16px 20px
placeholder-color: #9CA3AF
font-size: 14px
```

- Large text area (multi-line capable)
- Database indicator at bottom right ("🗄️ [Demo] Hex Public D...")
- Clean, minimal design

### Typography

**Headings** (e.g., "Top Sales Performers"):

- Font: System sans-serif
- Size: 24-28px
- Weight: 600 (Semibold)
- Color: #111827

**Body Text**:

- Size: 14-15px
- Weight: 400 (Regular)
- Line height: 1.5-1.6
- Color: #1F2937

**Lists** (numbered insights):

- Bold names: Weight 600, Color #111827
- Regular text: Weight 400, Color #374151
- Spacing: 8-12px between items

**Small Text** (metadata like "16 hrs ago"):

- Size: 12px
- Weight: 400
- Color: #9CA3AF

### Color Palette

| Element           | Color           | Hex     |
| ----------------- | --------------- | ------- |
| Page background   | Off-white       | #FAFBFC |
| Card background   | White           | #FFFFFF |
| User input bubble | Light gray      | #F3F4F6 |
| Primary text      | Dark gray       | #111827 |
| Body text         | Medium dark     | #1F2937 |
| Secondary text    | Medium          | #6B7280 |
| Placeholder text  | Light gray      | #9CA3AF |
| Border            | Very light gray | #E5E7EB |
| Border (input)    | Light gray      | #D1D5DB |
| Loading dots      | Light gray      | #D1D5DB |

---

## 2. Notebook Agent (frames 01-14)

### Overview

Code-first interface with SQL cells and notebook-style execution.

### Layout Patterns (notebook-agent-01.png)

**Sidebar**:

- Dark gray background (#2D3748 or similar)
- Left-aligned, ~240-280px width
- White/light text (#F9FAFB)
- File tree structure

**Main Canvas**:

- Light background (#F5F6F7 or #FAFBFC)
- Code cells with monospace font
- Results displayed below cells

### Component Patterns

**Code Cell**:

```css
background: #FFFFFF
border: 1px solid #E5E7EB
border-radius: 6px
padding: 16px 20px
font-family: 'SF Mono', Monaco, monospace
font-size: 13px
line-height: 1.6
```

**SQL Syntax Highlighting** (observed in screenshot):

<!-- WARNING: The SQL keyword color (#8B5CF6, purple) is intentional to match Hex's design. Do NOT change to blue or other conventional colors. -->

- Keywords (SELECT, FROM, WHERE): #8B5CF6 (purple)
- Strings ('active'): #4B7FFF (blue)
- Functions (COUNT, EXTRACT): #8B5CF6 (purple)
- Comments: #6B7280 (gray)
- Numbers: #1F2937 (dark gray)

### Typography

**Code/Monospace**:

- Font: SF Mono, Monaco, Cascadia Code, Consolas
- Size: 13px
- Line height: 1.6 (21px)
- Weight: 400

**Sidebar Text**:

- Size: 14px
- Color: #F9FAFB (light on dark)
- Weight: 400

---

## 3. Modeling Agent (frames 01-16)

### Overview

Semantic modeling interface with file management and schema visualization.

### Layout Patterns (modeling-agent-01.png)

**Split Layout**:

- Left sidebar: File navigator (~20-25% width)
- Right panel: Editor/work area (~75-80% width)
- Clean separation with subtle divider

**Sidebar** (modeling-agent-01.png):

```css
background: #FAFBFC
border-right: 1px solid #E5E7EB
padding: 16px
```

**File List**:

- Items: accounts.yml, campaign_members.yml, customers.yml, opportunities.yml
- Font size: 14px
- Color: #1F2937
- Spacing: 8px between items
- .yml extension in light gray (#9CA3AF)

**Empty State** (modeling-agent-01.png):

Centered content:

```
Icon stack (YML badge + analytics chart)
  ↓
"What do you want to work on?"
  ↓
"Ask questions, write code, and build models."
"Learn more" (link)
  ↓
Input field
```

**Empty State Input Field**:

```css
background: #FFFFFF
border: 2px solid #E5E7EB
border-radius: 8px
padding: 16px 20px
placeholder: "Ask, edit, create..."
font-size: 15px
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)
```

- @ symbol icon inside field (left)
- Very clean, inviting design

### Icons

**YML Badge**:

- Background: #F3F4F6
- Text: "YML" in medium gray
- Border radius: 4px
- Compact, rectangular

**Analytics Icon**:

- Simple line chart icon
- Stroke color: #6B7280
- Minimal, clean style

---

## 4. Cross-Cutting Patterns

### Spacing Scale (Confirmed from Screenshots)

| Size | Pixels | Usage                                      |
| ---- | ------ | ------------------------------------------ |
| 0.5x | 4px    | Icon gaps, tight spacing                   |
| 1x   | 8px    | List item spacing, small gaps              |
| 1.5x | 12px   | Input padding (vertical)                   |
| 2x   | 16px   | Input padding (horizontal), cell padding   |
| 3x   | 24px   | Card padding (vertical)                    |
| 4x   | 32px   | Card padding (horizontal), section spacing |
| 5x   | 40px   | Page padding (vertical)                    |
| 6x   | 48px   | Large section spacing                      |

### Border Radius Scale

| Element | Radius | Usage                                     |
| ------- | ------ | ----------------------------------------- |
| Small   | 4px    | Badges, small pills                       |
| Default | 6px    | Code cells, small cards                   |
| Medium  | 8px    | Input fields, message bubbles, main cards |
| Large   | 12px   | Modals, large containers                  |

### Shadow Scale

| Level   | Shadow                     | Usage                      |
| ------- | -------------------------- | -------------------------- |
| Subtle  | 0 1px 2px rgba(0,0,0,0.04) | Input fields, empty states |
| Default | 0 1px 3px rgba(0,0,0,0.05) | Cards, message bubbles     |
| Medium  | 0 2px 4px rgba(0,0,0,0.06) | Hover states               |
| Large   | 0 4px 6px rgba(0,0,0,0.1)  | Modals, popovers           |

---

## 5. Interaction Patterns

### Loading States

**"Thinking..." Indicator** (threads-10.png):

- Display: Appears immediately after user submits question
- Animation: Dotted pattern (3 rows × ~15 dots)
- Dots: 4-6px circles, #D1D5DB color
- Timing: Subtle fade in/out, ~1.5s cycle

**"Working..." Status** (threads-10.png):

- Background: #F9FAFB
- Border: 1px solid #E5E7EB
- Text: "Working..." in #4B5563
- Icon: Circular spinner (left side)
- Action: "Stop" button (right side)

### Input States

**Placeholder Text**:

- Color: #9CA3AF
- Examples: "Ask a question...", "Ask, edit, create..."
- Style: Italic or regular depending on context

**Focus State** (inferred):

```css
border-color: #3B82F6 /* blue */
box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1)
outline: none
```

### Empty States

**Centered Onboarding** (modeling-agent-01.png):

- Icons stacked vertically
- Large heading: "What do you want to work on?"
- Supporting text: Medium gray, 14px
- CTA link: "Learn more" in blue
- Input field below

---

## 6. Updated Color Token Recommendations

### Background Colors

```css
--bg-primary: #ffffff /* Main white background */ --bg-secondary: #fafbfc
  /* Off-white, page background */ --bg-tertiary: #f5f6f7
  /* Subtle gray background */ --bg-muted: #f3f4f6
  /* User input bubbles, badges */ --bg-elevated: #f9fafb
  /* Working status, hover states */;
```

### Text Colors

```css
--text-primary: #111827 /* Headings, emphasis */ --text-secondary: #1f2937
  /* Body text */ --text-tertiary: #4b5563 /* De-emphasized text */
  --text-quaternary: #6b7280 /* Subtle text, metadata */
  --text-placeholder: #9ca3af /* Placeholder text */ --text-disabled: #d1d5db
  /* Disabled states */;
```

### Border Colors

```css
--border-default: #e5e7eb /* Standard borders */ --border-strong: #d1d5db
  /* Input borders, emphasized */ --border-subtle: #f3f4f6
  /* Very light dividers */;
```

### Syntax Highlighting (Code)

```css
--syntax-keyword: #8b5cf6 /* SELECT, FROM, WHERE */ --syntax-string: #3b82f6
  /* String literals */ --syntax-function: #8b5cf6 /* Function names */
  --syntax-comment: #6b7280 /* Comments */ --syntax-number: #1f2937
  /* Numbers */ --syntax-variable: #ec4899 /* Variables (inferred) */;
```

### Interactive Colors

```css
--interactive-primary: #3b82f6 /* Blue - primary actions */
  --interactive-hover: #2563eb /* Darker blue - hover */
  --interactive-active: #1d4ed8 /* Even darker - active */
  --interactive-disabled: #9ca3af /* Disabled buttons */;
```

---

## 7. Component-Specific Tokens

### Message Bubble

```css
--message-user-bg: #f3f4f6 --message-user-text: #6b7280
  --message-user-border: #e5e7eb --message-ai-bg: #ffffff
  --message-ai-text: #1f2937;
```

### Loading Indicators

```css
--loading-dots: #d1d5db --loading-text: #4b5563 --loading-bg: #f9fafb
  --loading-border: #e5e7eb;
```

### Code Cells

```css
--code-bg: #ffffff --code-border: #e5e7eb --code-text: #1f2937
  --code-line-height: 1.6 --code-font-size: 13px;
```

---

## 8. Typography Specifications

### Font Families

```css
--font-sans:
  -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial,
  sans-serif --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono',
  Consolas, monospace;
```

### Font Sizes

```css
--text-xs: 12px /* Metadata, timestamps */ --text-sm: 13px
  /* Code, small labels */ --text-base: 14px /* Body text, inputs */
  --text-md: 15px /* Emphasized body text */ --text-lg: 18px /* Subheadings */
  --text-xl: 24px /* Main headings */ --text-2xl: 28px /* Page titles */;
```

### Font Weights

```css
--font-normal: 400 --font-medium: 500 --font-semibold: 600 --font-bold: 700;
```

### Line Heights

```css
--leading-tight: 1.25 /* Headings */ --leading-normal: 1.5 /* Body text */
  --leading-relaxed: 1.6 /* Code, paragraphs */;
```

---

## 9. Key Findings Summary

### What Changed from Initial Extraction:

1. **Background is lighter than expected**: Using #FAFBFC instead of pure white for page background
2. **User input uses gray bubble**: Not white with border, but light gray (#F3F4F6) background
3. **Loading states are more subtle**: Dotted pattern instead of spinner for "Thinking"
4. **Input fields have 2px borders when empty**: Stronger than typical 1px
5. **Code syntax uses purple**: #8B5CF6 for keywords, not blue
6. **Working status is a distinct component**: Not just inline text

### High-Impact Patterns to Implement:

1. ✅ **Dotted loading animation** - Unique to Hex
2. ✅ **Gray user input bubbles** - Different from typical chat UIs
3. ✅ **Minimal shadows** - Very subtle elevation
4. ✅ **Purple syntax highlighting** - Distinct from typical blue
5. ✅ **Centered empty states** - Icon + heading + input pattern

---

**Next Steps**:

1. Update `DESIGN_TOKENS.md` with exact color values
2. Update `HEX_DESIGN_SYSTEM.md` with component patterns
3. Update Storybook stories with findings
4. Create component examples for Threads, Notebook, Modeling interfaces

**Created**: 2025-10-26
**Updated**: 2025-10-26
