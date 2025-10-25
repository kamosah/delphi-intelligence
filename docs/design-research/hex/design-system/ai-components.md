# Hex Design System - AI-Specific Components

> **Source:** Extracted from Hex AI features (Threads, Notebook Agent, Modeling Agent)
> **Focus:** UI patterns for AI interactions, transparency, and control

## Overview

Hex's AI components prioritize **transparency**, **user control**, and **trust**. Unlike black-box AI interfaces, Hex shows the reasoning process, allows granular approval of changes, and provides context control through @ mentions.

---

## Core AI UI Patterns

### 1. @ Mention System

**Purpose:** Context control - users specify exactly what data/cells the AI should consider

**Visual Design:**

```
Input: "Analyze @customer_transactions table for churn patterns"
         ^^^^^^^^^^^^^^^^^^^^^^
         Chip with special styling
```

**Component Anatomy:**

| Element            | Style                                              |
| ------------------ | -------------------------------------------------- |
| **Background**     | Amethyst (#A477B2) at 20% opacity                  |
| **Text**           | White (#FFFFFF), IBM Plex Mono 13px, medium weight |
| **Border**         | Amethyst with higher opacity (40%)                 |
| **Padding**        | 2px 8px                                            |
| **Border Radius**  | 4px                                                |
| **Letter Spacing** | 0.02em                                             |

**Interaction States:**

```css
/* Default */
.mention-chip {
  background: rgba(164, 119, 178, 0.2);
  color: #ffffff;
  border: 1px solid rgba(164, 119, 178, 0.4);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 150ms ease;
}

/* Hover */
.mention-chip:hover {
  background: rgba(164, 119, 178, 0.3);
  border-color: rgba(164, 119, 178, 0.6);
}

/* Active/Selected */
.mention-chip:active {
  background: rgba(164, 119, 178, 0.4);
  transform: scale(0.98);
}
```

**Autocomplete Dropdown:**

- Triggered by typing `@` in input fields
- Shows tables, dataframes, cells, semantic models
- Fuzzy search filtering
- Keyboard navigation (arrow keys, Enter to select)

**Usage Examples:**

- `@customer_table` - Reference a specific table
- `@cell_3` - Reference output from previous cell
- `@df_sales` - Reference a dataframe variable
- `@semantic_model_name` - Prioritize a semantic model (Threads)

---

### 2. Diff View Component

**Purpose:** Review AI-suggested changes before accepting

**Visual Design:**

```
┌─────────────────────────────────────────────┐
│ Pending Changes (3)                    [×]  │
├─────────────────────────────────────────────┤
│                                             │
│ Cell 1: SQL Query                           │
│ ┌──────────────────────────────────────┐    │
│ │ - SELECT * FROM customers            │    │  ← Deletion (red bg, strikethrough)
│ │ + SELECT customer_id, name, email    │    │  ← Addition (jade bg)
│ │   FROM customers                     │    │  ← Unchanged (default)
│ │   WHERE created_at > '2024-01-01'    │    │
│ └──────────────────────────────────────┘    │
│ [Edit Inline] [Keep] [Undo]                 │
│                                             │
│ Cell 2: Python                              │
│ ┌──────────────────────────────────────┐    │
│ │ + import pandas as pd                │    │
│ │ + df = pd.read_sql(query, conn)      │    │
│ └──────────────────────────────────────┘    │
│ [Keep] [Undo]                               │
│                                             │
├─────────────────────────────────────────────┤
│ [Accept All] [Reject All]                   │
└─────────────────────────────────────────────┘
```

**Color Coding:**

| Change Type   | Background                            | Text Color        | Additional Style                |
| ------------- | ------------------------------------- | ----------------- | ------------------------------- |
| **Addition**  | `rgba(92, 177, 152, 0.15)` (Jade 15%) | `#5CB198` (Jade)  | None                            |
| **Deletion**  | `rgba(255, 100, 100, 0.15)` (Red 15%) | `#ff6464` (Red)   | `text-decoration: line-through` |
| **Unchanged** | Transparent                           | `#FFFFFF` (White) | None                            |
| **Modified**  | Both deletion + addition lines shown  | Both colors       | Combined styling                |

**Component Structure:**

```css
.diff-container {
  background: #0f0f15; /* Dark background */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.diff-cell {
  margin-bottom: 24px;
}

.diff-cell-title {
  font-family: 'PP Formula', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #99797d; /* Gray 600 */
  margin-bottom: 8px;
}

.diff-code-block {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: #14141c; /* Obsidian */
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}

.diff-line {
  display: flex;
  padding: 2px 8px;
  border-radius: 3px;
}

.diff-line-addition {
  background: rgba(92, 177, 152, 0.15);
  color: #5cb198;
}

.diff-line-deletion {
  background: rgba(255, 100, 100, 0.15);
  color: #ff6464;
  text-decoration: line-through;
}

.diff-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
```

**Action Buttons:**

| Button          | Style                        | Action                     |
| --------------- | ---------------------------- | -------------------------- |
| **Keep**        | Rose-quartz accent, solid    | Accept this cell's changes |
| **Undo**        | Gray outline                 | Reject this cell's changes |
| **Edit Inline** | Gray text link               | Modify before accepting    |
| **Accept All**  | Rose-quartz solid, prominent | Accept all pending changes |
| **Reject All**  | Gray outline                 | Reject all pending changes |

**Keyboard Shortcuts:**

- `Cmd/Ctrl + Enter` - Accept current cell
- `Cmd/Ctrl + Backspace` - Reject current cell
- `Tab` - Navigate to next cell
- `Shift + Tab` - Navigate to previous cell

---

### 3. Step-by-Step Reasoning Display

**Purpose:** Show AI's thinking process transparently (used in Threads)

**Visual Design:**

```
┌─────────────────────────────────────────────┐
│ 🤖 Analyzing your question...                │
│                                             │
│ ✓ Step 1: Searching for relevant data       │
│   Found 3 semantic models and 12 tables     │
│                                             │
│ ⟳ Step 2: Determining best approach...      │  ← In progress (spinning icon)
│   Considering cohort analysis vs trend      │
│   analysis                                  │
│                                             │
│ ○ Step 3: Writing SQL query                 │  ← Pending (empty circle)
│                                             │
│ ○ Step 4: Generating visualization          │
│                                             │
└─────────────────────────────────────────────┘
```

**Component States:**

| State           | Icon           | Color                 | Description                |
| --------------- | -------------- | --------------------- | -------------------------- |
| **Completed**   | ✓ checkmark    | Jade (#5CB198)        | Step finished successfully |
| **In Progress** | ⟳ spinner      | Rose-quartz (#F5C0C0) | Currently executing        |
| **Pending**     | ○ empty circle | Gray 600 (#99797d)    | Not started yet            |
| **Error**       | ✗ X mark       | Red (#ff6464)         | Step failed                |

**Expandable Details:**

```css
.reasoning-step {
  padding: 12px 16px;
  border-left: 2px solid transparent;
  transition: all 200ms ease;
}

.reasoning-step.completed {
  border-left-color: #5cb198; /* Jade */
}

.reasoning-step.in-progress {
  border-left-color: #f5c0c0; /* Rose-quartz */
  animation: pulse 2s ease-in-out infinite;
}

.reasoning-step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.reasoning-step-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.reasoning-step-title {
  font-family: 'Cinetype', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: #ffffff;
}

.reasoning-step-details {
  margin-top: 8px;
  margin-left: 32px;
  font-family: 'Cinetype', sans-serif;
  font-size: 14px;
  color: #99797d; /* Gray 600 */
  line-height: 1.5;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
```

**User Control:**

- Click step to expand/collapse details
- "Pause" button to stop agent mid-execution
- "Refine" button to provide feedback and retry

---

### 4. Agent Response Container

**Purpose:** Visual distinction for AI-generated content

**Visual Design:**

```
┌─────────────────────────────────────────────┐
│ 🤖 Agent Response                           │
├─────────────────────────────────────────────┤
│                                             │
│ I've analyzed the customer churn data and   │
│ identified three key patterns:              │
│                                             │
│ 1. Customers inactive for 30+ days have     │
│    65% churn rate                           │
│ 2. Support tickets correlate with           │
│    retention                                │
│ 3. Pricing tier affects churn likelihood    │
│                                             │
│ ┌──────────────────────────────────────┐    │
│ │ SELECT                               │    │  ← Generated code
│ │   customer_tier,                     │    │
│ │   COUNT(*) as churned                │    │
│ │ FROM customers                       │    │
│ │ WHERE status = 'churned'             │    │
│ │ GROUP BY customer_tier               │    │
│ └──────────────────────────────────────┘    │
│                                             │
│ Would you like me to visualize this data?   │
│                                             │
│ [Yes, create chart] [No, thanks] [Refine]   │
└─────────────────────────────────────────────┘
```

**Styling:**

```css
.agent-response {
  background: linear-gradient(
    135deg,
    rgba(245, 192, 192, 0.05),
    rgba(164, 119, 178, 0.05)
  ); /* Subtle gradient from rose-quartz to amethyst */
  border: 1px solid rgba(245, 192, 192, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
}

.agent-response-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-family: 'PP Formula', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #f5c0c0; /* Rose-quartz */
}

.agent-response-content {
  font-family: 'Cinetype', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  color: #ffffff;
}

.agent-response-code {
  margin: 16px 0;
  background: #0f0f15; /* Darker than container */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px;
  overflow-x: auto;
}

.agent-response-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}
```

**Agent Avatar:**

- Icon: 🤖 or custom Hex agent icon
- Size: 20px × 20px
- Color: Rose-quartz (#F5C0C0)
- Position: Left of "Agent Response" header

---

### 5. "Ask a Question" Modal

**Purpose:** Entry point for Notebook Agent interaction

**Visual Design:**

```
┌─────────────────────────────────────────────┐
│ Ask the Notebook Agent            [History] │
├─────────────────────────────────────────────┤
│                                             │
│ ┌──────────────────────────────────────────┐│
│ │ What would you like to analyze?          ││ ← Input field
│ │                                          ││
│ │ e.g., "Analyze @sales_table for trends"  ││ ← Placeholder
│ └──────────────────────────────────────────┘│
│                                             │
│ Quick actions:                              │
│ [📊 Visualize data] [🔍 Find table]          │
│ [🐛 Debug cell] [📝 Summarize]               │
│                                             │
│ Recent @mentions:                           │
│ @customer_transactions  @df_revenue         │
│                                             │
│ [Send] or press Cmd+Enter                   │
└─────────────────────────────────────────────┘
```

**Position:** Fixed to bottom-right corner of notebook interface

**Styling:**

```css
.agent-modal {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 480px;
  background: #14141c; /* Obsidian */
  border: 1px solid rgba(245, 192, 192, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  padding: 24px;
  z-index: 1000;
}

.agent-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-family: 'PP Formula', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.agent-input {
  width: 100%;
  min-height: 80px;
  background: #0f0f15;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  font-family: 'Cinetype', sans-serif;
  font-size: 15px;
  color: #ffffff;
  resize: vertical;
  transition: border-color 200ms ease;
}

.agent-input:focus {
  outline: none;
  border-color: #f5c0c0; /* Rose-quartz on focus */
}

.agent-input::placeholder {
  color: #786065; /* Gray 700 */
  font-style: italic;
}

.quick-actions {
  display: flex;
  gap: 8px;
  margin: 16px 0;
  flex-wrap: wrap;
}

.quick-action-btn {
  background: rgba(245, 192, 192, 0.1);
  border: 1px solid rgba(245, 192, 192, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
  font-family: 'Cinetype', sans-serif;
  font-size: 13px;
  color: #ffffff;
  cursor: pointer;
  transition: all 150ms ease;
}

.quick-action-btn:hover {
  background: rgba(245, 192, 192, 0.2);
  border-color: #f5c0c0;
}
```

**Keyboard Shortcuts:**

- `Cmd/Ctrl + K` - Open modal
- `Cmd/Ctrl + Enter` - Send query
- `Esc` - Close modal

**Trigger Button (when modal closed):**

- Floating button in bottom-right: "Ask AI"
- Icon: Sparkle (✨) or robot (🤖)
- Size: 56px × 56px (FAB style)
- Color: Rose-quartz gradient
- Animation: Gentle pulse on hover

---

### 6. Typeahead (Inline Autocomplete)

**Purpose:** Predictive code suggestions as user types

**Visual Design:**

```
SQL Query:
SELECT customer_id, name,
       email, created_at         ← User typing
       , lifetime_value          ← Gray ghost text (AI suggestion)
FROM customers
```

**Styling:**

```css
.typeahead-suggestion {
  color: #786065; /* Gray 700 - muted */
  font-style: italic;
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
}

/* Shown inline after cursor */
.cell-editor {
  position: relative;
}

.cell-editor .typeahead {
  position: absolute;
  left: 0;
  top: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  padding: inherit;
  white-space: pre-wrap;
  z-index: 1;
}
```

**Interaction:**

- `Tab` or `→` (right arrow) - Accept suggestion
- Continue typing - Dismiss suggestion
- Appears after 500ms pause in typing

---

### 7. Browser Tab Readiness Indicator

**Purpose:** Show when AI is done thinking (Threads feature)

**Visual Design:**

```
Tab title when agent is thinking:
⟳ Threads | Hex

Tab title when agent is done:
✓ Threads | Hex
```

**Implementation:**

```javascript
// Update document title based on agent status
function updateTabStatus(status) {
  if (status === 'thinking') {
    document.title = '⟳ Threads | Hex';
  } else if (status === 'complete') {
    document.title = '✓ Threads | Hex';
    // Optional: Flash notification icon
    flashFavicon('success');
  }
}
```

---

## AI Component Library Summary

| Component          | Purpose           | Key Visual Element                             |
| ------------------ | ----------------- | ---------------------------------------------- |
| **@ Mention Chip** | Context control   | Amethyst background, monospace font            |
| **Diff View**      | Review changes    | Color-coded additions (jade) / deletions (red) |
| **Step Reasoning** | Transparency      | Checkmarks, spinners, expandable details       |
| **Agent Response** | AI output         | Gradient border, rose-quartz accent            |
| **Ask Modal**      | Agent input       | Bottom-right modal, quick actions              |
| **Typeahead**      | Code prediction   | Gray ghost text inline                         |
| **Tab Indicator**  | Background status | Dynamic title with icons                       |

---

## Interaction Patterns

### Progressive Disclosure

1. **Default:** Typeahead always visible (low friction)
2. **Opt-in:** Ask modal requires click (medium friction)
3. **Approval required:** Diff view for all changes (high friction, high stakes)

### Feedback Loops

1. **Instant:** Typeahead (< 1s)
2. **Quick:** Ask modal response (5-15s)
3. **Thoughtful:** Step-by-step reasoning (15s-2min)

### Error Recovery

- **Soft errors:** Inline suggestions "I'm not sure, try..."
- **Hard errors:** Modal with clear error message and retry button
- **Graceful degradation:** Fall back to manual input if AI unavailable

---

## Implementation for Athena

### Priority Components

1. ✅ **@ Mention System** - Critical for context control in document queries
2. ✅ **Step-by-Step Reasoning** - Essential for AI transparency in Athena
3. ✅ **Agent Response Container** - Visual distinction for AI outputs
4. ✅ **Diff View** - If implementing AI-suggested edits to documents

### Optional Components

- **Typeahead** - Consider for query builder, not documents
- **Tab Indicator** - Nice-to-have for background processing
- **Ask Modal** - Alternative: inline prompt bar on homepage (like Threads)

---

## Related Documentation

- [Colors](./colors.md) - Color palette for AI components
- [Typography](./typography.md) - Font usage in AI interfaces
- [Threads Architecture](../product-architecture/threads.md) - Step-by-step reasoning implementation
- [Notebook Agent](../product-architecture/notebook-agent.md) - @ mentions and diff views
- [AI Philosophy](../philosophy/ai-integration-philosophy.md) - Design principles behind these patterns

---

**Last Updated:** January 2025
**Source:** Hex AI features (Threads, Notebook Agent, Modeling Agent)
