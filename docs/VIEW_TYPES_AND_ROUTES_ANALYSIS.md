# View Types and Route Structure Analysis

**Date**: 2025-11-06
**Context**: LOG-186 - Determining optimal view types (tree vs table) for different routes
**Status**: Analysis Document

---

## Overview

This document analyzes the trade-offs between different view types (tree view vs table view) across different routes in the Olympus platform, and explores the optimal information architecture for document management.

## View Type Definitions

### Tree View (Hierarchical)

**Characteristics:**

- Nested folder structure with expandable/collapsible nodes
- Parent-child relationships visible
- Drag-and-drop for organization
- Visual hierarchy with indentation
- Good for: Organization, categorization, project structure

**Implementation:**

- Custom tree component with dnd-kit
- Recursive rendering of folders
- Max depth limit (5 levels)

**Performance:**

- Virtualization with `@tanstack/react-virtual`
- Lazy-load nested folders on expand
- Handles 1000+ items efficiently

### Table View (Flat)

**Characteristics:**

- Columnar layout with sortable headers
- Search, filter, and sort capabilities
- Bulk selection with checkboxes
- Dense information display
- Good for: Browsing, searching, batch operations

**Implementation:**

- TanStack Table (React Table v8)
- Virtualized rows for performance
- Column resizing, sorting, filtering

**Performance:**

- Virtualization handles 10,000+ rows
- Server-side pagination for massive datasets
- Instant search with debouncing

---

## Proposed Route Structure

### Option A: Hybrid Approach (Recommended)

```
/spaces/:id           → Table view (upload & organize space-scoped docs)
/documents            → Dual view (table + tree sidebar, org-wide management)
/threads              → Standalone route (no document view, mentions for filtering)
/projects (future)    → Tree view in sidebar (project hierarchy)
```

**Rationale**: Each route serves a different user intent, so different views optimize for different workflows.

### Option B: Table-Only Approach

```
/spaces/:id           → Table view only
/documents            → Table view only (no tree sidebar)
/threads              → Standalone route
/projects (future)    → Tree view in sidebar
```

**Rationale**: Simpler to build, tree view only used for Projects where hierarchy matters most.

### Option C: Unified Approach

```
/spaces/:id           → Dual view (table + tree)
/documents            → Dual view (table + tree)
/threads              → Standalone route
/projects (future)    → Dual view (table + tree)
```

**Rationale**: Consistent UX across all routes, users can choose their preferred view.

---

## Route-by-Route Analysis

### 1. `/spaces/:id` - Space Upload & Organization

**Primary use case**: Upload documents scoped to a specific space

**User tasks:**

- Upload new documents to this space
- View recently uploaded documents
- Quick organization into folders (if needed)
- Delete or move documents

**Recommended view**: **Table view (primary)** with optional tree sidebar

**Rationale:**

- Upload workflow benefits from flat list showing upload status
- Most users will upload, not reorganize immediately
- Table view shows metadata (size, date, status) more clearly
- Tree sidebar available for quick folder assignment during upload

**Columns:**
| Column | Sortable | Filterable | Notes |
|--------|----------|------------|-------|
| Name | ✅ | ✅ | Document name with file type icon |
| Folder | ✅ | ✅ | Folder path (clickable) |
| Size | ✅ | ✅ | File size (KB, MB, GB) |
| Uploaded | ✅ | ✅ | Relative date ("2 hours ago") |
| Status | ✅ | ✅ | Processing, Ready, Failed |
| Actions | ❌ | ❌ | Move, Delete, Preview |

**Layout:**

```
┌────────────────────────────────────────────────────┐
│ Space: Marketing Analytics                         │
│ ┌──────────────────────────────────────────────┐  │
│ │ 📤 Upload Documents (drag & drop or browse) │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ┌─────┬──────────┬────────┬──────────┬────────┐  │
│ │ ☑   │ Name     │ Folder │ Size     │ Date   │  │
│ ├─────┼──────────┼────────┼──────────┼────────┤  │
│ │ ☑   │ Q1.pdf   │ /2024  │ 2.3 MB   │ 2h ago │  │
│ │ ☐   │ Q2.xlsx  │ /2024  │ 1.1 MB   │ 1d ago │  │
│ └─────┴──────────┴────────┴──────────┴────────┘  │
└────────────────────────────────────────────────────┘
```

**Tree sidebar?**: **Optional** - Show collapsed tree on right sidebar for quick folder assignment during upload

---

### 2. `/documents` - Organization-Wide Document Management

**Primary use case**: Manage ALL documents across all spaces, organize into folders

**User tasks:**

- Browse all documents in the organization
- Search across all documents
- Organize documents into folder hierarchies
- Move documents between folders (possibly across spaces)
- Bulk operations (move, delete, tag)

**Recommended view**: **Dual view (table + tree sidebar)** - OPTION A

**Rationale:**

- This is the power-user document management hub
- Tree sidebar shows folder hierarchy for organization
- Table view shows searchable, sortable list of all documents
- Drag-and-drop from table to tree folders for organization
- Supports both browsing (table) and organizing (tree) workflows

**Alternative**: **Table-only** - OPTION B

**Rationale:**

- Simpler to build (no tree component needed)
- Folder column in table shows hierarchy (e.g., "/Marketing/2024/Q1")
- "Move to folder" dropdown action for organization
- Reduces complexity if tree view is only needed for Projects

**Columns:**
| Column | Sortable | Filterable | Notes |
|--------|----------|------------|-------|
| Name | ✅ | ✅ | Document name with file type icon |
| Space | ✅ | ✅ | Which space it belongs to |
| Folder Path | ✅ | ✅ | Full folder hierarchy |
| Size | ✅ | ✅ | File size |
| Uploaded | ✅ | ✅ | Date uploaded |
| Modified | ✅ | ✅ | Last modified date |
| Tags | ❌ | ✅ | Document tags |
| Actions | ❌ | ❌ | Move, Delete, Preview, Download |

**Layout (Dual View - Option A):**

```
┌──────────────────────────────────────────────────────────────┐
│ Documents (Organization-wide)         🔍 Search all docs...  │
├──────────┬───────────────────────────────────────────────────┤
│ 📁 Tree  │ Table View                                        │
│          │ ┌────┬──────────┬────────┬────────┬─────────┐   │
│ Marketing│ │ ☑  │ Name     │ Space  │ Folder │ Date    │   │
│ ├─ 2024  │ ├────┼──────────┼────────┼────────┼─────────┤   │
│ │  ├─ Q1 │ │ ☑  │ Q1.pdf   │ Mktg   │ /2024  │ 2h ago  │   │
│ │  └─ Q2 │ │ ☐  │ Q2.xlsx  │ Sales  │ /2024  │ 1d ago  │   │
│ Sales    │ └────┴──────────┴────────┴────────┴─────────┘   │
│ ├─ 2024  │                                                   │
│ HR       │ Showing 1,234 documents                           │
└──────────┴───────────────────────────────────────────────────┘
```

**Layout (Table-only - Option B):**

```
┌──────────────────────────────────────────────────────────────┐
│ Documents (Organization-wide)         🔍 Search all docs...  │
│                                                               │
│ Filters: [All Spaces ▾] [All Folders ▾] [All Types ▾]       │
│                                                               │
│ ┌────┬──────────┬────────┬──────────────┬─────────┬────────┐│
│ │ ☑  │ Name     │ Space  │ Folder Path  │ Date    │ Actions││
│ ├────┼──────────┼────────┼──────────────┼─────────┼────────┤│
│ │ ☑  │ Q1.pdf   │ Mktg   │ /2024/Q1     │ 2h ago  │ ⋮      ││
│ │ ☐  │ Q2.xlsx  │ Sales  │ /2024/Q2     │ 1d ago  │ ⋮      ││
│ └────┴──────────┴────────┴──────────────┴─────────┴────────┘│
│                                                               │
│ Showing 1,234 documents across 3 spaces                      │
└──────────────────────────────────────────────────────────────┘
```

**Upload on `/documents`?**: **YES** - Allow org-wide document upload

**Rationale:**

- Documents uploaded here are accessible to all spaces (org-wide)
- Use case: Shared templates, company policies, reference materials
- Requires folder assignment during upload (default: root folder)
- Alternative: Documents uploaded here must be assigned to a space

---

### 3. `/threads` - Standalone Conversations Route

**Primary use case**: AI-powered conversations with document/data sources

**User tasks:**

- Start new conversation threads
- View conversation history
- Use mentions system to filter/select data sources
- No direct document management (done in Spaces/Documents)

**Recommended view**: **No document view** - Conversation interface only

**Rationale:**

- Threads is for asking questions, not managing documents
- Mentions system provides document/database selection
- Cleaner UX: dedicated route for conversations
- ThreadsPanel at bottom keeps focus on current conversation
- Document management belongs in Spaces/Documents

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│ 💬 Threads                                    + New Thread   │
├──────────────────────────────────────────────────────────────┤
│ Current Thread                                               │
│                                                              │
│ User: @sales_data @Q1.pdf Show me revenue...                │
│ AI: Based on the data, Q1 revenue was...                    │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Ask a question... @mention data sources      [History] │  │
│ └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ ThreadsPanel (toggleable, below input)                      │
│ Today:        Sales Q1 Analysis | 2h ago                    │
│               HR Data Review    | 4h ago                    │
│ Yesterday:    Product Research  | 1d ago                    │
└──────────────────────────────────────────────────────────────┘
```

**ThreadsPanel (bottom panel):**

- Toggleable via icon button next to input
- Shows conversation history when open (200-400px height, resizable)
- Keeps main focus on current conversation
- Click thread: Loads that conversation in main area

**Mentions system examples:**

- `@sales_database` - Mention entire database connection
- `@Q1_report.pdf` - Mention specific document
- `@Marketing/2024` - Mention entire folder
- `@space:Sales` - Mention all documents in a space

---

### 4. `/projects` - Project Management (Future)

**Primary use case**: Build and organize projects with data sources

**User tasks:**

- Create project hierarchies
- Add documents/databases to projects
- Organize project structure (folders, sections)
- Build queries/notebooks within project context

**Recommended view**: **Tree view in sidebar** + main content area

**Rationale:**

- Projects are inherently hierarchical (folders, sections, queries)
- Tree view shows project structure in sidebar
- Main content area shows project builder/canvas
- Similar to Hex's project structure

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│ 📊 Projects                               + New Project      │
├─────────────┬────────────────────────────────────────────────┤
│ Tree        │ Project Canvas                                 │
│             │                                                 │
│ Sales Q1    │ ┌─────────────────────────────────────────────┐│
│ ├─ Data     │ │ Sales Q1 Analysis Project                   ││
│ │  ├─ DB    │ │                                             ││
│ │  └─ Docs  │ │ [Data Sources] [Queries] [Visualizations]  ││
│ ├─ Queries  │ │                                             ││
│ │  ├─ SQL   │ │ ... project building interface ...          ││
│ │  └─ RAG   │ │                                             ││
│ └─ Reports  │ └─────────────────────────────────────────────┘│
└─────────────┴────────────────────────────────────────────────┘
```

---

## Comparison Matrix

### Option A: Hybrid Approach (Recommended)

| Route         | View Type                                  | Upload?           | Organization   | Use Case              |
| ------------- | ------------------------------------------ | ----------------- | -------------- | --------------------- |
| `/spaces/:id` | Table (+ optional tree sidebar)            | ✅ Yes            | Space-scoped   | Upload & quick view   |
| `/documents`  | **Dual (table + tree sidebar)**            | ✅ Yes (org-wide) | Org-wide       | Power-user management |
| `/threads`    | Conversation only (ThreadsPanel at bottom) | ❌ No             | N/A            | AI conversations      |
| `/projects`   | Tree sidebar + canvas                      | ❌ No             | Project-scoped | Project building      |

**Pros:**

- Each route optimized for its primary use case
- Tree view available where it adds most value (Documents, Projects)
- Table view for browsing and batch operations
- Clear separation of concerns

**Cons:**

- Requires building both tree and table components
- More complexity in Documents route (dual view)
- ~8 story points for tree implementation

**Development estimate**: 13-16 story points total

- Tree view component: 8 points (ADR-004)
- Table view component: 5-8 points (virtualized table with filters)

---

### Option B: Table-Only Approach

| Route         | View Type                | Upload?           | Organization   | Use Case              |
| ------------- | ------------------------ | ----------------- | -------------- | --------------------- |
| `/spaces/:id` | Table only               | ✅ Yes            | Space-scoped   | Upload & quick view   |
| `/documents`  | **Table only**           | ✅ Yes (org-wide) | Org-wide       | Simplified management |
| `/threads`    | None (conversation only) | ❌ No             | N/A            | AI conversations      |
| `/projects`   | Tree sidebar + canvas    | ❌ No             | Project-scoped | Project building      |

**Pros:**

- Simpler to build (no tree in Documents)
- Consistent table UX in Spaces and Documents
- Tree view only where absolutely needed (Projects)
- Faster development (~8 points saved)

**Cons:**

- Documents route less powerful for organization
- No drag-and-drop folder organization
- Folder management via dropdowns/modals only
- May need tree view later anyway

**Development estimate**: 5-8 story points total

- Table view component only: 5-8 points (no tree needed yet)

---

### Option C: Unified Dual-View Everywhere

| Route         | View Type                | Upload? | Organization   | Use Case          |
| ------------- | ------------------------ | ------- | -------------- | ----------------- |
| `/spaces/:id` | Dual (table + tree)      | ✅ Yes  | Space-scoped   | Upload & organize |
| `/documents`  | Dual (table + tree)      | ✅ Yes  | Org-wide       | Management        |
| `/threads`    | None (conversation only) | ❌ No   | N/A            | AI conversations  |
| `/projects`   | Tree sidebar + canvas    | ❌ No   | Project-scoped | Project building  |

**Pros:**

- Consistent UX across Spaces and Documents
- Users can choose preferred view on all routes
- Maximum flexibility for all workflows

**Cons:**

- Overkill for Spaces route (most users just upload)
- Significant development time (16-21 points)
- More complex UI (might overwhelm users)

**Development estimate**: 16-21 story points total

- Tree + table in multiple routes: Higher complexity

---

## Recommendation: Option A (Hybrid Approach)

### Rationale

1. **Spaces route** → **Table view (primary)** with optional tree sidebar
   - Most users: Upload → done
   - Power users: Can use tree sidebar for quick folder assignment
   - Keeps upload workflow simple and focused

2. **Documents route** → **Dual view (table + tree sidebar)**
   - This is the dedicated management hub
   - Tree sidebar for folder hierarchy and drag-and-drop organization
   - Table view for searching, sorting, filtering across all documents
   - Justifies the complexity because this route is for power users

3. **Threads route** → **No document view** (conversation only)
   - Mentions system handles document/database selection
   - Cleaner UX with dedicated route for conversations
   - Document management happens elsewhere

4. **Projects route** → **Tree sidebar + canvas**
   - Projects are inherently hierarchical
   - Tree view is essential for project structure
   - Main canvas for building queries/notebooks

### Trade-offs Accepted

**Pros:**

- ✅ Each route optimized for its primary workflow
- ✅ Tree view where it adds most value (Documents, Projects)
- ✅ Table view for efficient browsing and batch operations
- ✅ Threads is clean, focused conversation interface
- ✅ Mentions system eliminates need for document pickers in Threads

**Cons:**

- ⚠️ Requires building both tree and table components (~13-16 points)
- ⚠️ Documents route has more UI complexity (dual view)
- ⚠️ Users must learn two different patterns (tree vs table)

**Mitigations:**

- Build table view first (5-8 points), tree view second (8 points)
- Ship Documents route with table-only initially, add tree later
- Consistent Hex aesthetic makes patterns feel familiar

---

## Implementation Priority

### Phase 1: MVP (Table-only)

1. **Spaces route**: Table view with upload (5 points)
2. **Documents route**: Table view only (3 points)
3. **Threads route**: Conversation interface (done in LOG-179)

**Estimated**: 8 points, ~2 weeks

### Phase 2: Tree View (Power User Features)

4. **Documents route**: Add tree sidebar (8 points from ADR-004)
5. **Spaces route**: Add optional tree sidebar (2 points, reuse component)

**Estimated**: 10 points, ~2.5 weeks

### Phase 3: Projects (Future)

6. **Projects route**: Tree sidebar + canvas (13 points)

**Estimated**: 13 points, ~3 weeks

---

## Technical Components Needed

### Table View Component

**Package**: `@tanstack/react-table` (9kb, modern, maintained)

**Features:**

- Sortable columns
- Column resizing
- Global search
- Column-specific filters
- Multi-select rows
- Virtualization via `@tanstack/react-virtual`
- Server-side pagination support

**GraphQL queries:**

```graphql
query GetDocuments(
  $spaceId: UUID
  $folderId: UUID
  $search: String
  $sortBy: String
  $sortOrder: SortOrder
  $limit: Int
  $offset: Int
) {
  documents(
    spaceId: $spaceId
    folderId: $folderId
    search: $search
    sortBy: $sortBy
    sortOrder: $sortOrder
    limit: $limit
    offset: $offset
  ) {
    id
    name
    size
    uploadedAt
    folder {
      id
      name
      path
    }
    space {
      id
      name
    }
    status
  }
  documentsCount(spaceId: $spaceId, folderId: $folderId, search: $search)
}
```

### Tree View Component

**Packages** (from ADR-004):

- `@dnd-kit/core` (drag-and-drop)
- `@tanstack/react-virtual` (virtualization)
- Custom recursive tree component

**Features:**

- Collapsible folders
- Drag-and-drop organization
- Max depth limit (5 levels)
- Breadcrumb navigation
- Inline folder creation/rename

---

## Open Questions

### 1. Documents Route: Dual View or Table-Only?

**Lean toward**: Dual view (Option A) for power users

**Need to validate**:

- How often do users need to reorganize documents?
- Is folder hierarchy important enough to justify tree view?
- Can we ship table-only first, add tree later?

**Recommendation**: Ship table-only in Phase 1, add tree in Phase 2 based on user feedback

### 2. Org-Wide Document Upload?

**Question**: Should `/documents` route allow upload of org-wide documents (not scoped to a space)?

**Option A**: Yes, org-wide documents

- Use case: Shared templates, policies, reference docs
- Accessible from all spaces via mentions
- Stored in "Organization" virtual space

**Option B**: No, all documents must belong to a space

- Simpler data model
- Users must choose space during upload
- Can still be referenced across spaces via mentions

**Recommendation**: Option A (org-wide documents) - More flexible, supports enterprise use cases

### 3. Folder Hierarchy: Space-Scoped or Org-Wide?

**Question**: Are folders scoped to a space, or organization-wide?

**Option A**: Space-scoped folders

- Each space has its own folder hierarchy
- Simpler permissions (folders inherit space permissions)
- Cleaner UX (no cross-space folder confusion)

**Option B**: Org-wide folders

- One unified folder hierarchy for entire org
- Spaces are just tags/filters
- More complex permissions

**Recommendation**: Option A (space-scoped folders) - Simpler model, clearer permissions

---

## Next Steps

1. ✅ Complete this analysis document
2. [ ] Create Figma wireframes specification for:
   - Spaces route (table view)
   - Documents route (dual view: table + tree)
   - Threads route (conversation interface)
3. [ ] Create implementation tickets:
   - Phase 1: Table view component
   - Phase 2: Tree view component
   - Phase 3: Integrate into routes
4. [ ] Validate recommendations with product/design team
5. [ ] Update ADR-004 with final decisions on view types per route

---

**Author**: Engineering Team
**Last Updated**: 2025-11-06
