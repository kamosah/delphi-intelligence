# Figma Wireframes Specification

**Date**: 2025-11-06
**Related**: LOG-186 - Document & Folder Management UI
**Reference**: ADR-004, VIEW_TYPES_AND_ROUTES_ANALYSIS.md
**Design System**: HEX_DESIGN_SYSTEM.md

---

## Overview

This document specifies the wireframes needed for the document and folder management system across different routes. All designs should follow the **Hex aesthetic** as documented in `docs/HEX_DESIGN_SYSTEM.md` and `docs/guides/hex-component-mapping.md`.

---

## Design System Reference

### Core Hex Aesthetic Principles

**Colors:**

- Primary gradient: `from-blue-500 to-blue-600` for primary actions
- Background: `bg-gray-50` (light mode), `bg-gray-900` (dark mode)
- Cards: White with subtle shadow on hover (`hover:shadow-md transition-shadow`)
- Borders: `border-gray-200` (light), `border-gray-700` (dark)

**Typography:**

- Headings: `font-semibold` or `font-bold`
- Body: `font-normal`
- Mono for code/data: `font-mono`

**Components:**

- Rounded corners: `rounded-lg` for cards, `rounded-md` for buttons
- Icons: Lucide React icons (minimal, consistent)
- Badges: Colored backgrounds with matching text (e.g., `bg-green-100 text-green-700`)

**Interactions:**

- Hover states: Shadow elevation, subtle color shifts
- Active states: Darker gradient, pressed effect
- Focus states: Blue ring (`ring-2 ring-blue-500`)

---

## Wireframe Requirements

### 1. Spaces Route - Upload & Table View

**Route**: `/spaces/:id`
**File**: `wireframe-spaces-table-view.fig`

#### Layout Components

**A. Header Section**

- Space name (editable inline)
- Space description (below name, lighter text)
- Right-aligned actions: Settings icon, Share button

**B. Upload Area** (Prominent, top of page)

- Large drop zone with dashed border
- Icon: Upload cloud icon (Lucide `Upload`)
- Text: "Drop documents here or click to browse"
- Supported formats listed below: "PDF, DOCX, XLSX, CSV, TXT (max 100MB)"
- Progress bars for active uploads (if uploading)

**C. Document Table**

- Column headers (sortable, with sort indicators):
  - Checkbox column (bulk select)
  - Name (with file type icon)
  - Folder (clickable path)
  - Size (human-readable: KB, MB, GB)
  - Uploaded (relative date: "2 hours ago")
  - Status (badge: Processing, Ready, Failed)
  - Actions (dropdown menu icon: ⋮)
- Row hover state: Light gray background
- Row selection: Blue background tint
- Empty state: "No documents yet. Upload your first document!"

**D. Bulk Actions Bar** (appears when rows selected)

- Fixed to bottom of viewport
- Background: Dark blue gradient
- Text: "X documents selected"
- Actions: Move to folder, Delete, Download (all white text)

**E. Optional: Tree Sidebar** (collapsible, right side)

- 240px width
- Folder tree with expand/collapse icons
- Drag target zones highlighted on drag
- Folders show document count

#### Interaction States

**Upload States:**

1. **Idle**: Dashed border, muted colors
2. **Drag over**: Blue border, blue background tint
3. **Uploading**: Progress bar with percentage, cancel button
4. **Complete**: Green checkmark, fade out after 2 seconds
5. **Error**: Red border, error message, retry button

**Table Row States:**

1. **Default**: White background
2. **Hover**: Light gray background
3. **Selected**: Blue background tint
4. **Dragging**: Opacity 50%, cursor: grabbing

**Folder States (if tree sidebar shown):**

1. **Collapsed**: Right arrow icon (`ChevronRight`)
2. **Expanded**: Down arrow icon (`ChevronDown`)
3. **Drag over**: Blue background, thicker border
4. **Selected**: Blue background

#### Responsive Behavior

**Desktop (1440px+):**

- Full table with all columns
- Optional tree sidebar (240px) on right

**Tablet (768px - 1439px):**

- Hide "Folder" and "Size" columns
- Collapse tree sidebar by default (icon to expand)

**Mobile (< 768px):**

- Card layout instead of table
- Each document as a card with key info
- Swipe actions for Move/Delete

---

### 2. Documents Route - Dual View (Table + Tree)

**Route**: `/documents`
**File**: `wireframe-documents-dual-view.fig`

#### Layout Components

**A. Header Section**

- Page title: "Documents" (large, bold)
- Subtitle: "Organization-wide document management"
- Right-aligned actions: Upload button (gradient), Filter icon, View toggle (table/grid)

**B. Search & Filter Bar**

- Global search input (left): "Search all documents..."
- Filters (right):
  - Space dropdown: "All Spaces ▾"
  - Folder dropdown: "All Folders ▾"
  - Type dropdown: "All Types ▾"
  - Date range picker

**C. Tree Sidebar** (left, 280px width)

- Folder hierarchy (recursive tree)
- Expandable/collapsible folders
- Folder icons with document count badges
- Right-click context menu: Create folder, Rename, Delete
- Drag-and-drop zones highlighted
- Breadcrumb navigation at top
- Depth indicator (indentation + connecting lines)

**D. Main Table View** (right, flexible width)

- Column headers (all sortable):
  - Checkbox (bulk select)
  - Name (with file type icon)
  - Space (badge with space color)
  - Folder Path (truncated, tooltip on hover)
  - Size
  - Uploaded
  - Modified (last modified date)
  - Actions (⋮)
- Virtualized rendering (loads rows as you scroll)
- Row count at bottom: "Showing 1-50 of 1,234 documents"

**E. Upload Button** (floating action button)

- Fixed to bottom-right corner
- Blue gradient background
- Plus icon + "Upload" text
- On click: Opens upload modal

#### Interaction States

**Tree Sidebar:**

- **Folder hover**: Light gray background
- **Folder selected**: Blue background
- **Drag over folder**: Blue border, animated
- **Empty folder**: Muted icon, "(empty)" text
- **Create folder inline**: Input field appears below selected folder

**Table:**

- **Search active**: Show matching count, highlight matches
- **No results**: "No documents found. Try adjusting your filters."
- **Drag from table to tree**: Document row follows cursor (ghost image)
- **Drop on folder**: Folder highlights blue, shows "Drop to move here"

**Context Menu (right-click on folder):**

- Create subfolder
- Rename
- Delete (disabled if has contents, shows warning)
- Move to...

**Breadcrumb Navigation:**

- Shows current folder path: "Home > Marketing > 2024 > Q1"
- Each segment is clickable
- Truncates middle segments if too long: "Home > ... > Q1"

#### Responsive Behavior

**Desktop (1440px+):**

- Sidebar: 280px fixed width
- Table: Flexible, all columns visible

**Tablet (768px - 1439px):**

- Sidebar: Collapsible (overlay on top of table when open)
- Table: Hide "Folder Path" and "Modified" columns

**Mobile (< 768px):**

- Sidebar: Drawer (swipe from left to open)
- Table: Card layout
- Breadcrumb: Dropdown instead of full path

---

### 3. Threads Route - Conversation Interface

**Route**: `/threads`
**File**: `wireframe-threads-conversation.fig`

#### Layout Components

**A. Header**

- Page title: "💬 Threads"
- Right-aligned: "+ New Thread" button (gradient)

**B. Main Conversation Area**

- Thread title at top (editable inline)
- Messages scrollable area:
  - User messages (right-aligned, white background)
  - AI responses (left-aligned, light blue background)
  - Citations shown as expandable source cards
- Input area at bottom:
  - Text input: "Ask a question... @mention data sources"
  - Mentions dropdown appears on "@"
  - Send button (gradient, disabled until text entered)

**C. ThreadsPanel** (toggleable, bottom panel below input)

- Toggles open/closed (icon button next to input)
- When open: Shows conversation history (height: 200-400px, resizable)
- Thread history grouped by date:
  - "Today"
  - "Yesterday"
  - "Last 7 days"
  - "Older"
- Each thread shows:
  - Thread title (first query)
  - Timestamp
  - Preview of last message
- Hover: Light gray background
- Selected thread: Blue background
- Click thread: Loads that conversation in main area

**D. Mentions Dropdown** (appears on "@")

- Dropdown list showing:
  - Recent documents
  - Recent databases
  - Folders (with chevron to expand)
  - Spaces (with chevron to expand)
- Search within mentions: "Type to filter..."
- Each item shows:
  - Icon (file type or database icon)
  - Name
  - Path/location (muted text)
- Selected mentions shown as pills in input

#### Interaction States

**ThreadsPanel:**

- **Collapsed**: Icon button shows history count badge
- **Expanded**: Panel slides up from bottom (200-400px height)
- **Thread hover**: Light gray background
- **Thread selected**: Blue background
- **New thread**: Pulsing blue dot indicator
- **Resizable**: Drag handle at top to resize panel height

**Conversation:**

- **Message sending**: Loading spinner
- **Message error**: Red border, retry button
- **Citation hover**: Highlight source
- **Citation click**: Expand to show full context

**Mentions Dropdown:**

- **Searching**: Show matching items, dim non-matches
- **Selected**: Blue background
- **No matches**: "No sources found"

#### Responsive Behavior

**Desktop (1440px+):**

- ThreadsPanel: 200-400px height when open (resizable)
- Conversation: Flexible height above panel

**Tablet (768px - 1439px):**

- ThreadsPanel: Fixed 250px height when open
- Conversation: Flexible height above panel

**Mobile (< 768px):**

- ThreadsPanel: Bottom sheet modal (swipe up from bottom)
- Conversation: Full height when panel closed
- Messages: Full width, stacked

---

### 4. Projects Route - Tree Sidebar + Canvas (Future)

**Route**: `/projects/:id`
**File**: `wireframe-projects-tree-canvas.fig`

#### Layout Components

**A. Header**

- Project name (editable inline)
- Breadcrumb: "Projects > Sales Q1 Analysis"
- Right-aligned: Share button, Settings icon

**B. Tree Sidebar** (left, 280px)

- Project structure:
  - 📁 Data Sources
    - 🗄️ Sales Database
    - 📄 Q1_Report.pdf
  - 📊 Queries
    - 🔍 Revenue by Region (SQL)
    - 💬 Document Q&A (RAG)
  - 📈 Visualizations
    - Chart: Revenue Trends
- Drag-and-drop to reorder
- Right-click context menu: Add, Rename, Delete
- Icons indicate type (database, document, query, chart)

**C. Main Canvas Area** (right, flexible)

- Tabs at top: "Data Sources", "Queries", "Visualizations"
- Content area shows selected item:
  - SQL editor for queries
  - Document viewer for docs
  - Chart builder for visualizations
- Bottom panel: Results/output area (resizable)

**D. Add Button** (in sidebar)

- "+ Add" button at top of sidebar
- Dropdown menu: Add data source, Add query, Add visualization

#### Interaction States

**Tree Sidebar:**

- **Item hover**: Light gray background
- **Item selected**: Blue background
- **Drag item**: Ghost follows cursor
- **Drop zone**: Blue dashed outline

**Canvas:**

- **Loading**: Skeleton loader
- **Error**: Red border, error message
- **Editing**: Blue focus ring
- **Saving**: "Saving..." indicator (auto-save)

#### Responsive Behavior

**Desktop (1440px+):**

- Sidebar: 280px fixed
- Canvas: Flexible width
- Bottom panel: Resizable

**Tablet (768px - 1439px):**

- Sidebar: Collapsible overlay
- Canvas: Full width when sidebar collapsed

**Mobile (< 768px):**

- Sidebar: Drawer (bottom sheet)
- Canvas: Full width
- Bottom panel: Separate tab

---

## Component States to Design

### 1. Empty States

**Spaces (no documents):**

- Icon: Empty folder or upload cloud
- Heading: "No documents yet"
- Body: "Upload your first document to get started"
- Action: "Upload Document" button (gradient)

**Documents (no documents in folder):**

- Icon: Empty folder
- Heading: "This folder is empty"
- Body: "Drag and drop documents here, or upload from the button above"

**Threads (no conversations):**

- Icon: Chat bubble
- Heading: "Start your first conversation"
- Body: "Ask questions about your documents and databases"
- Action: "+ New Thread" button

**Projects (no items):**

- Icon: Project icon
- Heading: "Build your first project"
- Body: "Add data sources, queries, and visualizations to analyze your data"
- Action: "+ Add Data Source" button

### 2. Loading States

**Table loading:**

- Skeleton rows (gray shimmer animation)
- 5-7 skeleton rows visible
- Column headers visible

**Tree loading:**

- Skeleton folder items (gray shimmer)
- Indentation shows hierarchy

**Conversation loading:**

- AI response: Typing indicator (three dots pulsing)
- Citations: Skeleton cards

**Upload progress:**

- Progress bar with percentage
- File name and size
- Cancel button

### 3. Error States

**Upload error:**

- Red border around drop zone
- Error icon (X in circle)
- Error message: "Upload failed: [reason]"
- Action: "Try Again" button

**Table error:**

- Error icon in center
- Heading: "Failed to load documents"
- Body: Error message
- Action: "Retry" button

**Tree error:**

- Show error message above tree
- Disable interactions
- Retry button

**Conversation error:**

- Message with red border
- Error icon
- Retry button inline

---

## Interaction Flows to Design

### Flow 1: Upload Document to Space

1. **Start**: User drags file onto drop zone
2. **Drag over**: Drop zone highlights blue, shows "Drop to upload"
3. **Drop**: Progress bar appears, shows upload percentage
4. **Processing**: Status badge shows "Processing" (yellow)
5. **Complete**: Status badge changes to "Ready" (green), document appears in table

### Flow 2: Move Document Between Folders (Dual View)

1. **Start**: User drags document from table
2. **Dragging**: Document row follows cursor (ghost image)
3. **Over tree**: Folders highlight blue as cursor moves over them
4. **Drop on folder**: Folder highlights, shows "Drop to move here"
5. **Complete**: Document disappears from table (if filter active), folder count updates

### Flow 3: Create New Thread with Mentions

1. **Start**: User clicks "+ New Thread"
2. **New thread view**: Empty conversation, input focused
3. **Type "@"**: Mentions dropdown appears
4. **Select source**: Source appears as pill in input
5. **Type question**: Input expands as user types
6. **Send**: Message appears, AI response streams in

### Flow 4: Organize Documents into Folders

1. **Start**: User right-clicks in tree sidebar
2. **Context menu**: "Create subfolder" option appears
3. **Click**: Inline input appears below selected folder
4. **Type name**: Folder name input
5. **Confirm**: Press Enter, new folder appears in tree
6. **Drag document**: User drags document from table to new folder
7. **Complete**: Document moves to folder

---

## Design Deliverables

### Required Figma Files

1. **wireframe-spaces-table-view.fig**
   - Desktop view (1440px)
   - Tablet view (768px)
   - Mobile view (375px)
   - States: Empty, Loading, Uploaded, Uploading, Error

2. **wireframe-documents-dual-view.fig**
   - Desktop view with sidebar (1440px)
   - Tablet view with collapsed sidebar (768px)
   - Mobile view with drawer (375px)
   - States: Empty folder, Loading, Search active, No results

3. **wireframe-threads-conversation.fig**
   - Desktop view (1440px)
   - Tablet view (768px)
   - Mobile view (375px)
   - States: Empty, New thread, Conversation active, Mentions dropdown

4. **wireframe-projects-tree-canvas.fig**
   - Desktop view (1440px)
   - Tablet view (768px)
   - Mobile view (375px)
   - States: Empty project, Project with items, Editing

5. **component-library.fig**
   - All reusable components:
     - Document table row
     - Folder tree item
     - Upload drop zone
     - Progress bar
     - Status badges
     - Action menus
     - Empty states
     - Loading skeletons
     - Error states

### Design Specifications to Include

For each component:

- Dimensions (width, height, padding, margins)
- Colors (hex codes)
- Typography (font family, size, weight, line height)
- Border radius, shadows
- Hover states, active states, focus states
- Transitions/animations (duration, easing)

---

## Hex Visual References

**Reference these for design consistency:**

1. **Hex sidebar patterns**: `docs/visual-references/hex/`
2. **Athena Intelligence document UI**: `docs/visual-references/athena-intelligence/`
3. **Design system**: `docs/HEX_DESIGN_SYSTEM.md`
4. **Component mapping**: `docs/guides/hex-component-mapping.md`

### Key Hex Patterns to Follow

**Gradients:**

- Primary actions: Blue gradient (`from-blue-500 to-blue-600`)
- Hover: Slightly darker gradient
- Disabled: Gray gradient (`from-gray-300 to-gray-400`)

**Cards:**

- White background in light mode
- Subtle shadow on hover (`hover:shadow-md`)
- Rounded corners (`rounded-lg`)
- Border: `border border-gray-200`

**Badges:**

- Status: Color-coded (green for success, yellow for processing, red for error)
- Format: `bg-{color}-100 text-{color}-700`
- Size: Small, inline with text
- Examples:
  - Ready: `bg-green-100 text-green-700`
  - Processing: `bg-yellow-100 text-yellow-700`
  - Failed: `bg-red-100 text-red-700`

**Icons:**

- Lucide React icon set
- 20px size for table rows
- 24px size for buttons
- 16px size for inline badges

**Spacing:**

- Consistent use of Tailwind spacing scale (4px grid)
- Padding: `p-4` (16px) for cards
- Margins: `mb-4` (16px) between sections
- Gap: `gap-4` (16px) between items

---

## Accessibility Requirements

### Keyboard Navigation

**Table:**

- Tab through rows
- Enter to select
- Arrow keys to navigate
- Space to toggle selection

**Tree:**

- Tab through folders
- Arrow keys to expand/collapse
- Enter to select
- Space to toggle expansion

**Mentions dropdown:**

- Arrow keys to navigate
- Enter to select
- Escape to close

### Screen Readers

- All interactive elements have ARIA labels
- Status updates announced (e.g., "Upload complete")
- Error messages announced
- Selected items announced

### Color Contrast

- All text meets WCAG AA standards (4.5:1 for normal text)
- Interactive elements have clear focus indicators
- Don't rely on color alone (use icons + text)

---

## Next Steps

1. ✅ Review this specification with design team
2. [ ] Create Figma files following this spec
3. [ ] Share Figma links in LOG-186 for review
4. [ ] Iterate based on feedback
5. [ ] Hand off to engineering with design tokens and components

---

**Author**: Engineering Team
**Reviewers**: Design Team, Product Owner
**Last Updated**: 2025-11-06
