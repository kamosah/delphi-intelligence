# ADR-004: Document and Folder Management UI Architecture

**Status**: Proposed

**Date**: 2025-11-06

**Deciders**: Engineering Team

**Technical Story**: LOG-186 - Research UI/UX for Document & Folder Management in Spaces

---

## Context

The Olympus MVP requires a hierarchical document and folder management interface within Spaces. Users need to:

1. **Organize documents** into nested folder structures for better data source management
2. **Move documents** between folders efficiently (before creating queries in Threads)
3. **Navigate hierarchies** with a clean, intuitive UI that matches the Hex aesthetic
4. **Select documents** for queries using the upcoming mentions system
5. **Manage large datasets** with 100+ documents without performance degradation

Thread history will be displayed in the Threads Panel ([LOG-178](https://linear.app/logarithmic/issue/LOG-178)), so document/folder management belongs in the Spaces page where users organize their data sources. Documents in spaces will be displayed in spaces where uploaded. All documents can be displayed in Documents path where they can be queried and file location can be managed

## Decision

We will adopt a **Hybrid Approach (Option 3)** using:

1. **`@dnd-kit/core`** for drag-and-drop primitives
2. **Custom tree view component** built with Hex design aesthetic
3. **`@tanstack/react-virtual`** for virtualized rendering of large lists
4. **Custom action buttons** as fallback for accessibility and mobile

### Component Architecture

```
DocumentTree (Custom)
├── @dnd-kit/core          # Drag-and-drop interactions
├── @tanstack/react-virtual # Virtualized list rendering
├── @olympus/ui            # Base components (Card, Button, etc.)
└── Custom tree logic       # Collapsible folders, selection state
```

### Folder Hierarchy Design

- **Max nesting depth**: 5 levels (prevents overly complex structures)
- **Display pattern**: Tree view with collapsible folders
- **Navigation**: Breadcrumbs at top + expandable tree structure
- **Icons**: Hex-style minimal folder icons with file type badges

### Interaction Patterns

**Drag & Drop** (Primary for desktop):

- Drag documents/folders onto target folders
- Visual drop zone highlights
- Keyboard modifiers for copy vs. move (Shift = copy)

**Action Buttons** (Fallback + Mobile):

- Context menu (right-click) for desktop
- Long-press menu for mobile
- Explicit "Move to folder" action in dropdown

**Both patterns coexist** for maximum usability across devices.

### CRUD Operations

| Operation           | Pattern                                      | Rationale                      |
| ------------------- | -------------------------------------------- | ------------------------------ |
| **Create folder**   | Inline creation with input field             | Faster, Hex-style minimal      |
| **Read/Preview**    | Expand in place (tree view)                  | No navigation required         |
| **Rename**          | Inline editing on double-click               | Fast for power users           |
| **Delete**          | Modal confirmation for folders with contents | Safety for destructive actions |
| **Move**            | Drag-and-drop + action button                | Accessibility covered          |
| **Bulk operations** | Multi-select with Cmd/Ctrl + action button   | Power user efficiency          |

### GraphQL Mutations

```graphql
# Create folder
mutation CreateFolder($input: CreateFolderInput!) {
  createFolder(input: $input) {
    id
    name
    parentId
    spaceId
  }
}

# Move documents
mutation MoveDocuments($input: MoveDocumentsInput!) {
  moveDocuments(input: $input) {
    success
    movedDocuments {
      id
      folderId
    }
  }
}

# Update folder
mutation UpdateFolder($id: UUID!, $input: UpdateFolderInput!) {
  updateFolder(id: $id, input: $input) {
    id
    name
  }
}

# Delete folder
mutation DeleteFolder($id: UUID!, $recursive: Boolean!) {
  deleteFolder(id: $id, recursive: $recursive) {
    success
  }
}
```

## Rationale

### Why NOT Option 1 (Build Fully Custom)?

**Cons:**

- 8-13 story points of development time
- Need to implement complex drag-and-drop from scratch
- Accessibility edge cases (keyboard navigation, screen readers)
- Mobile touch events handling
- Performance optimization for large lists

**What we're giving up:**

- Complete control (mitigated: we still control the tree view)
- Zero dependencies (mitigated: dnd-kit and react-virtual are tiny, well-maintained)

### Why NOT Option 2 (Use Component Library)?

**Cons:**

- Libraries like `react-arborist` or `react-complex-tree` have opinionated styling
- Difficult to match Hex aesthetic perfectly
- Bundle size bloat (20-40kb for full tree libraries)
- Learning curve for library-specific APIs
- May not integrate cleanly with GraphQL + React Query

**What we're giving up:**

- Faster initial setup (mitigated: hybrid approach is still fast)
- Battle-tested tree logic (mitigated: we control tree, just outsource dnd)

### Why Option 3 (Hybrid Approach)?

**Pros:**

1. **Best of both worlds**: Battle-tested drag-and-drop + custom Hex aesthetic
2. **Smaller bundle size**: dnd-kit (12kb) + react-virtual (5kb) = 17kb vs 40kb+ for full libraries
3. **Full design control**: Tree view matches Hex exactly (clean, minimal, gradient actions)
4. **GraphQL integration**: Custom hooks work seamlessly with React Query
5. **Performance**: react-virtual handles 1000+ documents without lag
6. **Accessibility**: dnd-kit has built-in keyboard navigation and screen reader support
7. **Mobile support**: Action buttons provide touch-friendly fallback
8. **Maintainability**: Only drag-and-drop logic is outsourced, we control the rest

**Cons:**

1. Still requires custom tree view implementation (~5 story points)
2. Need to integrate dnd-kit with React Query cache updates
3. Two dependencies instead of one (but both are modular)

### Comparison with Alternatives

| Feature             | Option 1 (Custom) | Option 2 (Library) | **Option 3 (Hybrid)** ✅ |
| ------------------- | ----------------- | ------------------ | ------------------------ |
| Hex Aesthetic       | Perfect ✅        | Difficult ⚠️       | Perfect ✅               |
| Development Time    | 8-13 points       | 3-5 points         | **5-8 points** ✅        |
| Bundle Size         | Minimal (0kb)     | Large (40kb+)      | **Small (17kb)** ✅      |
| Accessibility       | Manual ⚠️         | Built-in ✅        | **Built-in** ✅          |
| Mobile Support      | Manual ⚠️         | Varies             | **Dual pattern** ✅      |
| GraphQL Integration | Perfect ✅        | Custom ⚠️          | **Perfect** ✅           |
| Performance         | Manual ⚠️         | Good               | **Optimized** ✅         |
| Maintainability     | High effort       | Vendor lock-in     | **Modular** ✅           |

## Consequences

### Positive

- **40% faster development** compared to fully custom (5-8 points vs 8-13 points)
- **Perfect Hex aesthetic** with full control over tree view
- **Production-ready accessibility** from dnd-kit
- **Mobile-friendly** with dual interaction patterns
- **Performance optimized** for 1000+ documents
- **Seamless GraphQL integration** with React Query
- **Modular architecture**: Can swap dnd-kit if needed (unlikely)

### Negative

- **Two dependencies** instead of one (but both are well-maintained)
- **Learning curve** for dnd-kit API (mitigated by excellent docs)
- **Custom tree logic** still required (~5 points of work)

### Risks and Mitigations

| Risk                                    | Mitigation                                                     |
| --------------------------------------- | -------------------------------------------------------------- |
| dnd-kit bundle size increases in future | Bundle is already small (12kb), and we can lazy-load if needed |
| dnd-kit API breaking changes            | Library is stable (v6), used by thousands of projects          |
| Performance issues with 1000+ documents | react-virtual handles this, plus we'll lazy-load folders       |
| Mobile drag-and-drop UX issues          | Action buttons provide explicit fallback                       |
| Accessibility gaps                      | dnd-kit has built-in ARIA support + keyboard nav               |
| Cache invalidation complexity           | React Query's `invalidateQueries` handles this cleanly         |

## Implementation Plan

### Phase 1: Core Tree View (3 points)

- [ ] Create `DocumentTree` component with Hex aesthetic
- [ ] Implement collapsible folders (recursive rendering)
- [ ] Add breadcrumb navigation
- [ ] Integrate with GraphQL `folders` and `documents` queries
- [ ] Add empty states, loading states, error states

### Phase 2: Drag & Drop (2 points)

- [ ] Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- [ ] Implement drag-and-drop for documents
- [ ] Implement drag-and-drop for folders
- [ ] Add visual drop zone highlights
- [ ] Add keyboard modifiers (Shift = copy)
- [ ] Integrate with `moveDocuments` mutation

### Phase 3: Action Buttons (1 point)

- [ ] Add context menu (right-click) for desktop
- [ ] Add long-press menu for mobile
- [ ] Add "Move to folder" dropdown
- [ ] Add bulk selection with Cmd/Ctrl

### Phase 4: Performance & Polish (2 points)

- [ ] Install `@tanstack/react-virtual`
- [ ] Virtualize large document lists (100+ items)
- [ ] Add folder depth limit (max 5 levels)
- [ ] Add rename inline editing
- [ ] Add delete confirmation modal
- [ ] Add create folder inline input

**Total: 8 points** (matches LOG-186 estimate)

## Component API Design

### DocumentTree Component

```typescript
interface DocumentTreeProps {
  spaceId: string;
  selectedDocumentIds?: string[];
  onDocumentSelect?: (documentIds: string[]) => void;
  onFolderCreate?: (name: string, parentId?: string) => void;
  onDocumentMove?: (documentIds: string[], targetFolderId: string) => void;
  maxDepth?: number; // Default: 5
  enableDragDrop?: boolean; // Default: true
  enableVirtualization?: boolean; // Default: true for 100+ items
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  spaceId: string;
  depth: number; // Calculated client-side
  children: Folder[];
  documents: Document[];
  isExpanded: boolean; // UI state
}
```

### React Query Hooks

```typescript
// hooks/queries/useFolders.ts
export function useFolders(spaceId: string) {
  return useQuery({
    queryKey: ['folders', spaceId],
    queryFn: () => graphqlClient.request(GET_FOLDERS, { spaceId }),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFolderInput) =>
      graphqlClient.request(CREATE_FOLDER, { input }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders', data.spaceId] });
    },
  });
}

export function useMoveDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveDocumentsInput) =>
      graphqlClient.request(MOVE_DOCUMENTS, { input }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}
```

### Cache Invalidation Strategy

**Optimistic updates** for better UX:

```typescript
// Optimistically update UI before server responds
const moveDocuments = useMutation({
  mutationFn: moveDocumentsAPI,
  onMutate: async (input) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['documents'] });

    // Snapshot current state
    const previousDocuments = queryClient.getQueryData(['documents']);

    // Optimistically update
    queryClient.setQueryData(['documents'], (old) => {
      // Move documents in cache
      return updateDocumentLocations(old, input);
    });

    return { previousDocuments };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['documents'], context.previousDocuments);
  },
  onSettled: () => {
    // Refetch to ensure sync
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  },
});
```

## References

- **dnd-kit**: https://dndkit.com/ (drag-and-drop primitives)
- **TanStack Virtual**: https://tanstack.com/virtual/latest (virtualized lists)
- **Hex Visual References**: `docs/visual-references/hex/` (design patterns)
- **LOG-178**: Query history sidebar (consistency reference)
- **LOG-186**: Original research issue
- **HEX_DESIGN_SYSTEM.md**: Complete design patterns reference

## Dependencies

- `@dnd-kit/core` (12kb)
- `@dnd-kit/sortable` (included in core)
- `@dnd-kit/utilities` (included in core)
- `@tanstack/react-virtual` (5kb)
- Existing: `@olympus/ui`, `react-query`, `graphql-request`

## Next Steps

1. ✅ Create ADR-004 (this document)
2. [ ] Create Figma wireframes showing tree view + drag-and-drop interactions
3. [ ] Technical spike: Proof-of-concept drag-and-drop with dnd-kit (1-2 hours)
4. [ ] Performance test: Virtualized rendering with 1000 documents (1 hour)
5. [ ] Mobile test: Touch interactions on iOS/Android (1 hour)
6. [ ] Update LOG-186 acceptance criteria with implementation plan
7. [ ] Create implementation tickets (LOG-XXX) for each phase

## Approval

**Decision**: Pending review
**Reviewers**:

- [ ] Product Owner
- [ ] Engineering Lead

---

_Last Updated: 2025-11-06_
_Author: Engineering Team_
