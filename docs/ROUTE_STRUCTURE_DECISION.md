# Route Structure & View Type Decision

**Date**: 2025-11-06
**Decision**: Option A - Hybrid Approach (Accepted)
**Related**: LOG-186, ADR-004, VIEW_TYPES_AND_ROUTES_ANALYSIS.md

---

## Decision Summary

We are implementing **Option A: Hybrid Approach** from the view types analysis. Each route will use the optimal view type for its primary use case.

## Final Route Structure

### `/spaces/:id` - Space Upload & Organization

**View Type**: **Table view (primary)** with optional tree sidebar

**Primary use case**: Upload documents scoped to a specific space

**Features**:

- Prominent upload drop zone at top
- Table view showing recently uploaded documents
- Optional collapsible tree sidebar (240px) on right for quick folder assignment
- Columns: Name, Folder, Size, Uploaded, Status, Actions

**Rationale**:

- Upload workflow benefits from flat list showing upload status
- Most users will upload, not reorganize immediately
- Table view shows metadata (size, date, status) more clearly
- Tree sidebar available for quick folder assignment during upload

**Implementation**: LOG-195 (table view component)

---

### `/documents` - Organization-Wide Document Management

**View Type**: **Dual view (table + tree sidebar)**

**Primary use case**: Manage ALL documents across all spaces, organize into folders

**Features**:

- Tree sidebar (280px) on left showing folder hierarchy
- Table view on right showing searchable, sortable list of all documents
- Drag-and-drop from table to tree folders
- Global search across all documents
- Filters: Space, Folder, Type, Date range
- Upload button (floating action button, bottom-right)

**Rationale**:

- This is the power-user document management hub
- Tree sidebar shows folder hierarchy for organization
- Table view shows searchable, sortable list
- Supports both browsing (table) and organizing (tree) workflows

**Implementation**:

- LOG-195 (table view component)
- LOG-196, LOG-197, LOG-198, LOG-199 (tree view component, 4 phases)

**Upload capability**: **YES** - Org-wide documents accessible to all spaces

---

### `/threads` - Standalone Conversations Route

**View Type**: **No document view** - Conversation interface only

**Primary use case**: AI-powered conversations with document/data sources

**Layout**:

- Full-height conversation area (main content)
- Messages displayed top-to-bottom
- Input field at bottom
- **ThreadsPanel** (conversation history) toggleable at bottom, below input

**Features**:

- Main conversation interface shows current thread
- Mentions system for document/database selection
- ThreadsPanel (toggleable) shows conversation history at bottom
- No direct document management (done in Spaces/Documents)

**Rationale**:

- Threads is for asking questions, not managing documents
- Mentions system provides document/database selection (`@sales_data`, `@Q1.pdf`, etc.)
- Cleaner UX: dedicated route for conversations
- ThreadsPanel at bottom keeps focus on current conversation
- Document management belongs in Spaces/Documents

**Implementation**: LOG-179 (already completed)

**Mentions system examples**:

- `@sales_database` - Mention entire database connection
- `@Q1_report.pdf` - Mention specific document
- `@Marketing/2024` - Mention entire folder
- `@space:Sales` - Mention all documents in a space

---

### `/projects/:id` - Project Management (Future)

**View Type**: **Tree sidebar + canvas** (main content area)

**Primary use case**: Build and organize projects with data sources

**Features**:

- Tree sidebar (280px) on left showing project structure
- Main canvas area on right for project builder
- Add documents/databases to projects
- Build queries/notebooks within project context

**Rationale**:

- Projects are inherently hierarchical (folders, sections, queries)
- Tree view shows project structure in sidebar
- Main content area shows project builder/canvas
- Similar to Hex's project structure

**Implementation**: Future (Phase 3+)

---

## View Type Matrix

| Route                | View Type                                  | Upload?               | Organization   | Tree Component      | Table Component    |
| -------------------- | ------------------------------------------ | --------------------- | -------------- | ------------------- | ------------------ |
| `/spaces/:id`        | Table + optional tree                      | ✅ Yes (space-scoped) | Space-scoped   | Optional (LOG-196+) | Required (LOG-195) |
| `/documents`         | **Dual (table + tree)**                    | ✅ Yes (org-wide)     | Org-wide       | Required (LOG-196+) | Required (LOG-195) |
| `/threads`           | Conversation only (ThreadsPanel at bottom) | ❌ No                 | N/A            | Not needed          | Not needed         |
| `/projects` (future) | Tree + canvas                              | ❌ No                 | Project-scoped | Required            | Not needed         |

---

## Folder & Document Scoping

### Folder Hierarchy: Space-Scoped

**Decision**: Folders are scoped to spaces, not org-wide

**Rationale**:

- Each space has its own folder hierarchy
- Simpler permissions (folders inherit space permissions)
- Cleaner UX (no cross-space folder confusion)
- Users can still search across all spaces from `/documents` route

**Schema**:

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Folders belong to a space
-- Max depth: 5 levels (enforced client-side and server-side)
```

### Document Upload: Space-Scoped + Org-Wide

**Decision**: Documents can be uploaded to spaces OR org-wide

**Scenarios**:

1. **Space-scoped documents** (uploaded via `/spaces/:id`):
   - Belong to a specific space
   - Accessible only within that space (unless shared)
   - Use case: Project-specific documents

2. **Org-wide documents** (uploaded via `/documents`):
   - Accessible to all spaces via mentions
   - Use case: Shared templates, company policies, reference materials
   - Stored in virtual "Organization" space or require folder assignment

**Schema**:

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id),
  size BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- All documents belong to a space
-- Folder is optional (documents can be at root level)
```

---

## Implementation Phases

### Phase 1: MVP (Table-Only) - **8 points, ~2 weeks**

**Goal**: Ship basic document management ASAP

**Tickets**:

- LOG-195: Build table view component (5 points)
- Integration into `/spaces/:id` route (included in LOG-195)
- Integration into `/documents` route (included in LOG-195)

**Deliverables**:

- ✅ Table view with sorting, filtering, search
- ✅ Upload functionality in `/spaces/:id`
- ✅ Org-wide upload in `/documents`
- ✅ Action buttons (Move, Delete, Download)
- ✅ Responsive: Desktop, tablet, mobile

**What's missing**: Tree view, drag-and-drop (added in Phase 2)

---

### Phase 2: Tree View (Power User Features) - **8 points, ~2 weeks**

**Goal**: Add tree view for advanced organization

**Tickets**:

- LOG-196: Phase 1 - Core tree view (3 points)
- LOG-197: Phase 2 - Drag & drop (2 points)
- LOG-198: Phase 3 - Action buttons & context menus (1 point)
- LOG-199: Phase 4 - Performance & polish (2 points)

**Deliverables**:

- ✅ Tree sidebar in `/documents` route
- ✅ Optional tree sidebar in `/spaces/:id` route
- ✅ Drag-and-drop organization
- ✅ Context menus for CRUD operations
- ✅ Virtualization for 1000+ documents

---

### Phase 3: Projects (Future) - **13 points, ~3 weeks**

**Goal**: Build project management interface

**Features**:

- Tree sidebar for project structure
- Project canvas for building queries/notebooks
- Add documents/databases to projects
- Hex-inspired project builder

**Tickets**: TBD (future phase)

---

## Trade-offs Accepted

### Pros of Option A ✅

- Each route optimized for its primary workflow
- Tree view where it adds most value (Documents, Projects)
- Table view for efficient browsing and batch operations
- Threads is clean, focused conversation interface
- ThreadsPanel at bottom keeps focus on current conversation
- Mentions system eliminates need for document pickers in Threads

### Cons of Option A ⚠️

- Requires building both tree and table components (~16 points total)
- Documents route has more UI complexity (dual view)
- Users must learn two different patterns (tree vs table)

### Mitigations

- ✅ Build table view first (5-8 points), tree view second (8 points)
- ✅ Ship Documents route with table-only initially, add tree later
- ✅ Consistent Hex aesthetic makes patterns feel familiar
- ✅ Can defer tree view to Phase 2 based on user feedback

---

## Open Questions & Answers

### Q1: Should Documents route have dual view or table-only?

**Answer**: Dual view (table + tree sidebar) for power users

**Validation needed**: How often do users reorganize documents?

**Ship strategy**: Ship table-only in Phase 1, add tree in Phase 2 based on user feedback

---

### Q2: Should org-wide document upload be allowed?

**Answer**: **YES** - Org-wide documents accessible to all spaces

**Rationale**:

- More flexible for enterprise use cases
- Supports shared templates, policies, reference docs
- Can still be organized into folders
- Accessible via mentions system in Threads

---

### Q3: Are folders space-scoped or org-wide?

**Answer**: **Space-scoped** folders

**Rationale**:

- Simpler permissions (folders inherit space permissions)
- Cleaner UX (no cross-space folder confusion)
- Users can still search across all spaces from `/documents` route
- Easier to implement and maintain

---

## Success Metrics

### Phase 1 (Table View)

- [ ] Users can upload documents to spaces
- [ ] Users can search/filter/sort documents
- [ ] Users can move documents via action buttons
- [ ] Upload success rate > 95%
- [ ] Table loads in < 500ms for 1000 documents

### Phase 2 (Tree View)

- [ ] Users can organize documents into 3+ folder levels
- [ ] 70%+ of power users use drag-and-drop for organization
- [ ] Tree view loads in < 300ms for 100 folders
- [ ] Drag-and-drop success rate > 90%

### Phase 3 (Projects)

- [ ] Users can create projects with 5+ data sources
- [ ] Project creation time < 5 minutes
- [ ] 80%+ of users use tree sidebar for project organization

---

## Related Documents

- [VIEW_TYPES_AND_ROUTES_ANALYSIS.md](./VIEW_TYPES_AND_ROUTES_ANALYSIS.md) - Full analysis of all options
- [ADR-004](./adr/004-document-folder-management-ui.md) - Architecture decision record
- [FIGMA_WIREFRAMES_SPEC.md](./FIGMA_WIREFRAMES_SPEC.md) - Design specifications
- [HEX_DESIGN_SYSTEM.md](./HEX_DESIGN_SYSTEM.md) - Design system reference

---

**Approved By**: Engineering Team
**Date**: 2025-11-06
**Status**: Accepted
