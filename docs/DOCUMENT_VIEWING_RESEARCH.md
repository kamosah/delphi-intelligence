# Document Viewing Research

**Research Date**: January 2025

**Status**: ✅ Research Complete → Implementation Planning

**Related Context**: Document viewing within Threads, Spaces, and Documents tab

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Analysis](#platform-analysis)
3. [Common Viewing Patterns](#common-viewing-patterns)
4. [UI Pattern Comparison](#ui-pattern-comparison)
5. [Technical Considerations](#technical-considerations)
6. [Implementation Recommendations for Olympus](#implementation-recommendations-for-olympus)
7. [Success Metrics](#success-metrics)
8. [References](#references)

---

## Executive Summary

This document synthesizes research on document viewing patterns from leading platforms to inform the implementation of document viewing across Olympus's Threads, Spaces, and Documents features. The research analyzed 10+ major platforms and identified key viewing patterns that balance accessibility with workflow integration.

### Key Findings

1. **Context Determines Pattern**: Different contexts require different viewing patterns:
   - **Quick Reference** (Threads citations): Inline preview + modal for full view
   - **Active Collaboration** (Spaces): Split-screen or side-by-side viewing
   - **Document Management** (Documents tab): Full-page viewer with navigation

2. **Progressive Disclosure Wins**: Best platforms start with lightweight previews (hover cards, inline snippets) and progressively reveal more detail on demand (modal, full-page, split-screen)

3. **Dual-Mode Viewing**: Most successful platforms offer both:
   - **Compact mode**: Quick preview without leaving current context
   - **Expanded mode**: Full document viewer for deep reading/analysis

4. **Citation Integration**: AI platforms (Perplexity, Claude) excel at inline citation → preview → full document flow

5. **Collaboration Features**: Real-time collaboration platforms (Notion, Dropbox Paper) prioritize inline previews with annotation capabilities

### Recommended Implementation Approach

Implement document viewing in **3 phases** with context-specific patterns:

1. **Phase 1 - Threads**: Inline citations + hover preview + modal viewer
2. **Phase 2 - Spaces**: Grid/list view + split-screen document viewer
3. **Phase 3 - Documents Tab**: Full-page document viewer with navigation + metadata panel

---

## Platform Analysis

### 1. Hex (Data Analytics Platform)

**Context**: Data notebooks with embedded visualizations and SQL queries

**Document Viewing Patterns**:

- **Notebook-Centric**: Documents viewed as "cells" within notebooks
- **Layered Complexity**: Default view shows clean visualizations; "click into" cells for raw data/code
- **Explore Feature**: New cell type for visual data exploration within notebooks
- **Threads Integration**: Conversational interface (Fall 2025) with access to notebook context
- **Notebook Agent**: Can view/edit upstream cells with full project context

**Key Features**:

- Inline data previews (tables, charts) within notebook flow
- Expandable cells for detailed inspection
- Full auditability: every Thread backed by a Hex project
- Asynchronous processing with background status indicators

**Strengths**:

- Seamless integration of documents/data into workflow
- Progressive disclosure (summary → details → technical)
- No context switching required

**Application to Olympus**:

- Threads should show document snippets inline (like Hex cells)
- Clicking citation should expand inline preview or open side panel (not new tab)
- Consider "notebook conversion" concept: Threads → full document analysis workspace

**Visual Patterns**:

```
[Thread Message]
└── Inline data visualization
    └── "View full data" → Expands cell inline
    └── "Open in notebook" → Opens full editor
```

---

### 2. Perplexity (AI Search Engine)

**Context**: AI-powered search with source attribution

**Document Viewing Patterns**:

- **Inline Citations**: Numbered footnotes `[1]`, `[2]` embedded in AI responses
- **Hover Preview**: Quick popover with title, snippet, metadata (no click required)
- **Click Action**: Opens full source in new tab OR expands citation card
- **File Upload Support**: Users can upload documents and chat with them
- **Citation Tracking**: "Copy citations" feature for reference management

**Key Features**:

- Dual interaction: hover for preview, click for full source
- Rich metadata: title, favicon, publication date, credibility badges
- Exact passage highlighting: points to specific sentences, not whole documents
- Full-page scrolling in document previews with highlighting

**Strengths**:

- Minimal friction: hover preview loads instantly (<200ms)
- Clear source attribution builds trust
- Visual hierarchy helps scan relevance quickly

**Application to Olympus**:

- Must-have: hover preview for inline citations in Threads
- Show similarity scores + document metadata in preview
- Click citation → scroll to full chunk in side panel (not new tab)

**Visual Patterns**:

```
AI Response text with [1] inline citation
     ↓ (hover)
┌─────────────────────────────┐
│ Document: Q4_Report.pdf     │
│ "Revenue increased by 23%..." │
│ Similarity: 87%             │
│ [View full document] →      │
└─────────────────────────────┘
```

---

### 3. Claude (Anthropic)

**Context**: AI assistant with document upload and analysis capabilities

**Document Viewing Patterns**:

- **File Creation & Editing**: Can create/edit Excel, Word, PowerPoint, PDFs directly in chat (Sept 2025)
- **Drag-and-Drop**: Desktop app supports drag-drop files into conversation
- **In-Chat Previews**: Documents render inline within chat interface
- **Files API**: Store large files once, reference by `file_id` to avoid re-uploads (Beta, April 2025)
- **Skills Feature**: Folders with instructions/resources that Claude loads on demand (Oct 2025)

**Key Features**:

- Up to 30 MB per file, 20 files per conversation
- Supports PDF, Excel (up to 30 MB), Word, PowerPoint, images
- Extract information, interpret charts, answer questions about content
- Visual content analysis (text + embedded images/diagrams)

**Strengths**:

- In-context document editing (no need to leave chat)
- Large file support (30 MB vs. typical 10 MB limits)
- Files API reduces redundant uploads

**Application to Olympus**:

- Threads should support document preview inline (like Claude's chat interface)
- Consider "edit document" capability for future (Phase 3+)
- Implement Files API pattern: upload once, reference by ID in multiple queries

**Visual Patterns**:

```
[User uploads document]
     ↓
[Inline document preview in chat]
     ↓
[AI analyzes and responds with citations pointing to specific pages]
```

---

### 4. ChatGPT (OpenAI)

**Context**: General-purpose AI assistant with file upload

**Document Viewing Patterns**:

- **Native PDF Support**: Click paperclip icon to upload PDFs
- **Visual Content Analysis**: Can process text + embedded images/diagrams
- **Multi-Source Upload**: Connect to Google Drive, OneDrive, or upload directly
- **Third-Party Tools**: ChatPDF offers side-by-side chat + document view

**Key Features**:

- ChatGPT Plus subscribers can upload files directly
- Combines text and visuals in one analysis (improved from image-only processing)
- Supports summarization, Q&A, data extraction from PDFs

**Third-Party Patterns** (ChatPDF):

- **Side-by-Side Interface**: Chat on left, document on right
- **Clickable Citations**: Click citation → instantly scroll to exact source in PDF
- **Synchronized Navigation**: Chat citations linked to document scroll position

**Strengths**:

- Integrated upload flow (Google Drive, OneDrive, local)
- Visual + text analysis (not just text extraction)

**Application to Olympus**:

- Adopt ChatPDF's side-by-side pattern for Threads document viewing
- Implement synchronized navigation: click citation → auto-scroll to chunk
- Support Google Drive/OneDrive integration (future)

**Visual Patterns**:

```
┌─────────────────┬─────────────────┐
│   Thread Chat   │  Document View  │
│                 │                 │
│ AI: "According  │ [PDF Page 15]   │
│ to [1]..."      │ >>> Highlighted │
│                 │     chunk       │
└─────────────────┴─────────────────┘
```

---

### 5. Notion (All-in-One Workspace)

**Context**: Collaborative documents and knowledge base

**Document Viewing Patterns**:

- **Link Previews**: Paste external links (Jira, Slack, GitHub) → auto-generate live preview
- **Full Document Embeds**: Preview Word docs from SharePoint/OneDrive inside Notion
- **Real-Time Collaboration**: Up to 50 simultaneous editors
- **Inline Comments**: Tag team members, comment on specific sections
- **Notion 3.0 Agents**: AI can perform any action users can (Sept 2025)

**Key Features**:

- Visual link previews with real-time updates from external tools
- Unified search across Notion + connected tools (Enterprise Search)
- AI meeting notes with automatic capture/summarization
- Auto-save and syncing for version consistency

**Strengths**:

- Inline previews keep users in single flow (no tool-hopping)
- Real-time collaboration with instant updates
- Rich link previews for external content

**Application to Olympus**:

- Implement inline document previews in Spaces (like Notion pages)
- Real-time collaboration on document annotations (future)
- Unified search across documents in all Spaces

**Visual Patterns**:

```
[Notion Page]
└── Pasted link: docs.google.com/...
    └── Auto-generates preview:
        ┌───────────────────────┐
        │ Google Doc Title      │
        │ Last edited: 2h ago   │
        │ [Preview snippet...]  │
        └───────────────────────┘
```

---

### 6. Google Drive

**Context**: Cloud storage with document management

**Document Viewing Patterns**:

- **Hovercards**: Hover over file icon → see thumbnail, metadata, modification details
- **Multi-File Preview**: Chrome extensions enable preview of multiple files simultaneously
- **Split-Screen Extensions**: Third-party tools (Google Docs SplitView) enable split-screen mode
- **Native Preview**: Click file → full-page preview with edit option

**Key Features**:

- Quick metadata access on hover (no click required)
- Supports Google Docs, Sheets, Slides, PDFs, images, videos
- Customizable layouts via extensions

**Strengths**:

- Hovercard provides instant metadata without opening file
- Extensions fill gaps (split-screen, multi-preview)

**Limitations**:

- Native split-screen not available (requires extensions)
- Preview requires full-page view (no inline option)

**Application to Olympus**:

- Implement hovercard pattern for document grid in Documents tab
- Native split-screen support (don't rely on extensions)
- Consider thumbnail previews for quick scanning

**Visual Patterns**:

```
[Document Grid]
     ↓ (hover on file icon)
┌─────────────────────────┐
│ 📄 Q4_Report.pdf        │
│ Modified: Jan 5, 2025   │
│ Owner: Kwame Amosah     │
│ Size: 2.3 MB           │
└─────────────────────────┘
```

---

### 7. Dropbox Paper

**Context**: Collaborative document editing

**Document Viewing Patterns**:

- **Inline File Previews**: Embed Illustrator, PDF, PowerPoint → customize preview display
- **Annotations**: Comment on images, preview audio/video without downloading
- **Real-Time Collaboration**: Up to 50 simultaneous editors
- **Comment Threading**: Leave comments on specific sections, tag team members
- **External Embeds**: Supports InVision, Vimeo, and other integrations

**Key Features**:

- Customizable file preview display (size, layout)
- All Dropbox-supported file formats preview in Paper
- Annotations on images and document previews (rectangles, highlights)
- No need to download file or use original application

**Strengths**:

- Inline previews reduce context switching
- Annotation system provides focused feedback
- Supports wide range of file formats

**Application to Olympus**:

- Implement annotation system for document collaboration (Phase 3+)
- Inline audio/video preview for multimedia documents
- Comment threading on specific document sections

**Visual Patterns**:

```
[Paper Document]
└── Embedded PDF preview
    └── Annotation tools: rectangle, highlight, comment
        └── Tagged comments: @team-member
```

---

### 8. Linear (Issue Tracking)

**Context**: Project management with document attachments

**Document Viewing Patterns**:

- **Project Documents**: Long-form text documents attached to projects (briefs, RFCs)
- **Peek Preview**: Press Space to view issue details without opening (description, attachments, metadata)
- **Editor Previews**: Pasting Figma link → embeds file preview (if integration enabled)
- **Quick Look**: Cmd/Ctrl + K → right arrow for preview in command menu
- **Attachment Links**: Attachments accessible from project sidebar

**Key Features**:

- Peek preview shows details without navigation
- Inline image/video upload with preview while uploading
- Figma integration for design file previews
- Project documents for long-form content

**Strengths**:

- Peek preview maintains context (no full navigation)
- Quick Look in command menu for fast access
- Integration previews (Figma) reduce tool-hopping

**Application to Olympus**:

- Implement "peek preview" for document hover in Spaces
- Quick command menu with document preview (Cmd+K)
- Integration previews for external sources (future)

**Visual Patterns**:

```
[Issue List]
     ↓ (press Space on item)
┌─────────────────────────────┐
│ Issue Title                 │
│ Description...              │
│ Attachments: [doc.pdf]      │
│ Status: In Progress         │
└─────────────────────────────┘
```

---

### 9. GitBook

**Context**: Documentation platform

**Document Viewing Patterns**:

- **Sidebar Navigation**: Table of contents on left, page content on right
- **Page Outline**: H1/H2 headings for quick navigation within page
- **Split View**: Content area + outline for easy section jumping
- **Search Integration**: Search bar in sidebar for global search
- **Snippets**: Reusable content blocks accessible from sidebar

**Key Features**:

- Three-column layout: sidebar (navigation) + content + outline
- Organization overview in sidebar
- Notifications and search in sidebar
- Table of contents lists all pages/links in space

**Strengths**:

- Always-visible navigation (sidebar)
- Page outline for long documents
- Clear visual hierarchy

**Application to Olympus**:

- Documents tab should have sidebar navigation (Space list + document tree)
- Page outline for long documents (H1/H2 navigation)
- Search integration in sidebar

**Visual Patterns**:

```
┌──────────┬───────────────┬──────────┐
│ Sidebar  │  Content      │ Outline  │
│          │               │          │
│ Space 1  │  # Page Title │ • Intro  │
│ Space 2  │  Content...   │ • Setup  │
│ > Docs   │               │ • Usage  │
│   - Doc1 │               │          │
│   - Doc2 │               │          │
└──────────┴───────────────┴──────────┘
```

---

### 10. Confluence

**Context**: Team collaboration and documentation

**Document Viewing Patterns**:

- **Configurable Sidebar**: Choose "Child pages" or "Page tree" view
- **Space Overview**: Access pages, live docs, blogs, whiteboards from sidebar
- **Collapsible Sidebar**: Minimize for streamlined view
- **Easy Heading Plugin**: Adds navigation sidebar for pages with headings
- **Resizable Panels**: Drag to adjust sidebar width

**Key Features**:

- Customizable sidebar (logo, hierarchy, shortcuts)
- Two navigation modes: child pages or full page tree
- Third-party plugins for enhanced navigation (Easy Heading Pro)
- Space-level navigation organization

**Strengths**:

- Flexible sidebar configuration
- Hierarchical page organization
- Resizable panels for personalization

**Application to Olympus**:

- Configurable sidebar for Documents tab (user preference)
- Resizable panels (sidebar, document, metadata)
- Hierarchical document organization by Space

**Visual Patterns**:

```
┌─────────────┬──────────────────┐
│ Sidebar     │  Page Content    │
│ (resizable) │                  │
│ Space       │  # Document      │
│ └─ Page 1   │  Content...      │
│    └─ Sub   │                  │
│ └─ Page 2   │                  │
└─────────────┴──────────────────┘
```

---

## Common Viewing Patterns

After analyzing 10 platforms, we identified **7 universal document viewing patterns**:

### 1. Inline Preview (Lightweight)

**Pattern**: Show document snippets/thumbnails within existing interface

**Use Cases**:

- Quick reference without context switching
- Citation previews in AI responses
- Document cards in grid/list views

**Implementation**:

- Hover cards with metadata
- Inline snippets (2-3 sentences)
- Thumbnail images

**Platforms Using This**:

- Perplexity (citation hover preview)
- Google Drive (hovercard)
- Linear (peek preview)
- Notion (link previews)

**Pros**:

- ✅ No navigation required
- ✅ Fast loading (<200ms)
- ✅ Maintains user context

**Cons**:

- ❌ Limited content visible
- ❌ Not suitable for deep reading
- ❌ Requires good metadata

**Olympus Application**:

- **Threads**: Hover over citation `[1]` → show document title, snippet, similarity score
- **Spaces**: Hover over document card → show thumbnail, metadata, last modified
- **Documents Tab**: Hover over file name → show quick preview card

---

### 2. Modal Overlay (Medium Detail)

**Pattern**: Pop-up overlay that dims background, shows document in modal

**Use Cases**:

- Full document view without leaving current page
- Quick inspection with option to download/open externally
- Image/video previews

**Implementation**:

- Modal dialog (60-80% screen width/height)
- Close button (X or click outside)
- Pagination for multi-page documents
- Download/open buttons

**Platforms Using This**:

- React PDF Viewer examples (modal pattern)
- Various document management systems

**Pros**:

- ✅ More space than inline preview
- ✅ Maintains page context (no navigation)
- ✅ Easy to dismiss (ESC or click outside)

**Cons**:

- ❌ Reduced screen space vs. full-page
- ❌ Scrolling in modal not ideal UX
- ❌ Accessibility issues if modal height exceeds screen

**Olympus Application**:

- **Threads**: Click citation → open document modal showing relevant chunk highlighted
- **Spaces**: Click document card → open modal preview with download option
- **Use for**: Quick inspection, not long reading sessions

---

### 3. Split-Screen / Side-by-Side (Dual Context)

**Pattern**: Screen divided into two panels (e.g., 50/50 or 40/60)

**Use Cases**:

- Reading document while taking notes
- Comparing two documents
- Chat interface + document reference (ChatPDF pattern)

**Implementation**:

- Two fixed panels (or resizable with drag handle)
- Left: Primary context (chat, notes, query)
- Right: Document viewer
- Synchronized scrolling (optional)

**Platforms Using This**:

- ChatPDF (chat + document)
- Google Docs SplitView (extension)
- GitBook (sidebar + content + outline)

**Pros**:

- ✅ Two contexts visible simultaneously
- ✅ No context switching
- ✅ Good for workflows requiring reference

**Cons**:

- ❌ Reduced space per panel (may feel cramped)
- ❌ Not ideal for mobile/small screens
- ❌ Complexity: need to manage two scroll states

**Olympus Application**:

- **Threads**: Split-screen mode toggle (chat left, document right)
- **Spaces**: Compare two documents side-by-side
- **Documents Tab**: Document left, metadata/comments right

---

### 4. Full-Page Viewer (Maximum Detail)

**Pattern**: Entire screen dedicated to document viewing

**Use Cases**:

- Deep reading/analysis
- Document editing
- Long-form content consumption

**Implementation**:

- Full viewport (minus header/nav)
- Navigation controls (prev/next page)
- Zoom, search, download tools
- Exit button back to previous context

**Platforms Using This**:

- Google Drive (click file → full-page preview)
- Confluence (page view)
- Dropbox Paper (document editing)

**Pros**:

- ✅ Maximum screen space for content
- ✅ Best for long documents
- ✅ Can include advanced tools (annotations, etc.)

**Cons**:

- ❌ Leaves current context (requires navigation)
- ❌ Back button required to return
- ❌ May feel like "leaving the app"

**Olympus Application**:

- **Documents Tab**: Primary viewing mode
- **Threads**: "Open full document" link from modal
- **Spaces**: "View document" action from grid

---

### 5. Slide-in Panel / Drawer (Contextual Detail)

**Pattern**: Panel slides in from side (usually right), overlays part of screen

**Use Cases**:

- Document metadata/properties
- Comments/annotations sidebar
- Document preview without full navigation

**Implementation**:

- Panel slides from right (typically 300-500px wide)
- Darkened overlay on remaining screen (optional)
- Close button or swipe to dismiss
- Can be resized or docked

**Platforms Using This**:

- Linear (project details sidebar)
- Many SaaS apps (details panel)

**Pros**:

- ✅ Non-blocking (doesn't require full navigation)
- ✅ More space than modal
- ✅ Can show rich content + actions

**Cons**:

- ❌ Still limited width (not for full documents)
- ❌ Requires overlay management
- ❌ May obstruct content on smaller screens

**Olympus Application**:

- **Spaces**: Click document → slide-in panel with preview + metadata
- **Threads**: Click citation → slide-in panel with document chunk
- **Documents Tab**: Metadata/comments panel for selected document

---

### 6. Inline Expansion (Accordion-Style)

**Pattern**: Content expands in place, pushing other content down

**Use Cases**:

- Expandable document sections
- Collapsible file previews
- Accordion lists

**Implementation**:

- Click to expand, click again to collapse
- Smooth height animation
- Maintains scroll position

**Platforms Using This**:

- Hex (notebook cells)
- Dropbox Paper (inline file previews)
- Notion (toggle lists)

**Pros**:

- ✅ No navigation required
- ✅ Maintains context (content stays in place)
- ✅ Progressive disclosure (show only what's needed)

**Cons**:

- ❌ Pushes content down (can cause disorientation)
- ❌ Not suitable for large documents
- ❌ May require scrolling to see expanded content

**Olympus Application**:

- **Threads**: Expand citation inline to show full chunk text
- **Spaces**: Expandable document cards in grid view
- **Not ideal for**: Full document viewing (use modal/split-screen instead)

---

### 7. Tabbed Interface (Multi-Document)

**Pattern**: Multiple documents open in tabs (like browser tabs)

**Use Cases**:

- Working with multiple documents simultaneously
- Quick switching between documents
- Reference comparisons

**Implementation**:

- Tab bar at top of document viewer
- Click tab to switch active document
- Close button on each tab
- Keyboard shortcuts (Cmd+1, Cmd+2, etc.)

**Platforms Using This**:

- Browser-based document editors (Google Docs via browser tabs)
- IDEs (VS Code, IntelliJ)
- Some document management systems

**Pros**:

- ✅ Easy multi-document workflow
- ✅ Quick switching (no menu navigation)
- ✅ Familiar pattern (browsers, IDEs)

**Cons**:

- ❌ Tab overflow on many documents
- ❌ Memory/performance concerns (many open docs)
- ❌ Requires state management (active tab, unsaved changes)

**Olympus Application**:

- **Documents Tab**: Open multiple documents in tabs
- **Threads**: Not recommended (focus on single conversation)
- **Spaces**: Consider for document comparison workflows (future)

---

## UI Pattern Comparison

### Pattern Selection Matrix

| Context                        | Primary Need                        | Recommended Pattern            | Alternative Pattern       |
| ------------------------------ | ----------------------------------- | ------------------------------ | ------------------------- |
| **Threads - Citation Preview** | Quick reference, maintain chat flow | Inline hover preview           | Modal overlay             |
| **Threads - Full Document**    | Deep dive from citation             | Split-screen OR slide-in panel | Modal (if short doc)      |
| **Spaces - Document Card**     | Quick metadata, thumbnail           | Inline hover preview           | Slide-in panel            |
| **Spaces - Document View**     | Collaboration, comparison           | Split-screen OR full-page      | Tabbed interface          |
| **Documents Tab - Browse**     | Scanning, management                | Inline hover preview           | Grid with thumbnails      |
| **Documents Tab - Read**       | Deep reading, analysis              | Full-page viewer               | Split-screen (with notes) |
| **Documents Tab - Compare**    | Side-by-side analysis               | Split-screen                   | Tabbed interface          |

---

### Pattern Trade-offs

#### **Speed vs. Detail**

```
Fast ←───────────────────────────→ Detailed

Hover Preview → Modal → Slide-in → Split-screen → Full-page
```

- **Fast**: Hover preview (instant, <200ms)
- **Balanced**: Modal or slide-in (quick but more content)
- **Detailed**: Split-screen or full-page (maximum information)

#### **Context Preservation vs. Screen Space**

```
Keep Context ←────────────────────→ Max Space

Inline/Hover → Modal → Slide-in → Split-screen → Full-page
```

- **Keep Context**: Inline/hover (never leave current view)
- **Balanced**: Modal/slide-in (overlays current view)
- **Max Space**: Full-page (leave current context)

#### **Simplicity vs. Flexibility**

```
Simple ←────────────────────────→ Flexible

Inline → Modal → Slide-in → Split-screen → Tabbed
```

- **Simple**: Inline (minimal UI, one pattern)
- **Flexible**: Tabbed + split-screen (many options, complex UI)

---

## Technical Considerations

### Frontend Architecture

**Component Structure**:

```
apps/web/src/components/documents/
├── DocumentPreviewHover.tsx      # Hover preview card
├── DocumentModal.tsx             # Modal overlay viewer
├── DocumentSplitView.tsx         # Split-screen layout
├── DocumentFullPageViewer.tsx    # Full-page viewer
├── DocumentSlideInPanel.tsx      # Slide-in drawer
├── DocumentTabs.tsx              # Tabbed interface
├── DocumentViewer.tsx            # Core viewer component (PDF, DOCX, etc.)
└── DocumentViewerControls.tsx    # Zoom, download, navigate buttons
```

**Viewer Library Options**:

1. **PDF Documents**:
   - `react-pdf` (PDF.js wrapper) - Most popular, active maintenance
   - `@react-pdf-viewer/core` - Feature-rich, customizable
   - `pdfjs-dist` (low-level) - Full control, more complex

2. **Office Documents** (DOCX, XLSX, PPTX):
   - `mammoth.js` (DOCX → HTML) - Lightweight, good compatibility
   - `@microsoft/office-js` - Official but requires Office Online
   - `react-file-viewer` - Multi-format, heavy dependency

3. **Images**:
   - Native `<img>` tag with lazy loading
   - `react-image-gallery` for multi-image documents

4. **Text/Markdown**:
   - `react-markdown` (already in use for AI responses)
   - Native `<pre>` with syntax highlighting

**Recommended Stack**:

- Primary: `react-pdf` for PDFs (already widely used, good performance)
- Secondary: `mammoth.js` for DOCX (lightweight, no external service)
- Fallback: Download button for unsupported formats

---

### State Management

**Document Viewer State** (Zustand store):

```typescript
// apps/web/src/lib/stores/document-viewer-store.ts

interface DocumentViewerState {
  // Current viewing mode
  viewMode: 'inline' | 'modal' | 'split' | 'fullpage' | 'panel';

  // Currently open documents
  openDocuments: {
    id: string;
    title: string;
    url: string;
    currentPage?: number;
    scrollPosition?: number;
  }[];

  // Active document (for tabbed interface)
  activeDocumentId: string | null;

  // Split-screen state
  splitScreenMode: 'chat-document' | 'document-document' | null;
  splitRatio: number; // 0.5 = 50/50, 0.4 = 40/60

  // User preferences
  preferences: {
    defaultViewMode: 'modal' | 'split' | 'fullpage';
    showThumbnails: boolean;
    autoScrollToCitation: boolean;
  };

  // Actions
  openDocument: (doc: Document, mode?: ViewMode) => void;
  closeDocument: (docId: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSplitRatio: (ratio: number) => void;
  navigateToChunk: (docId: string, chunkIndex: number) => void;
}
```

**React Query Hooks**:

```typescript
// apps/web/src/hooks/queries/useDocuments.ts

// Fetch document content for viewing
export function useDocumentContent(documentId: string) {
  return useQuery({
    queryKey: ['document-content', documentId],
    queryFn: async () => {
      // Fetch pre-signed URL or base64 content
      const response = await graphqlClient.request(GET_DOCUMENT_CONTENT, {
        documentId,
      });
      return response.document;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!documentId,
  });
}

// Prefetch document content on hover
export function usePrefetchDocumentContent() {
  const queryClient = useQueryClient();

  return (documentId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['document-content', documentId],
      queryFn: async () => {
        const response = await graphqlClient.request(GET_DOCUMENT_CONTENT, {
          documentId,
        });
        return response.document;
      },
    });
  };
}
```

---

### Performance Optimization

**Lazy Loading**:

```typescript
// Lazy-load document viewer components
const DocumentModal = lazy(() => import('@/components/documents/DocumentModal'));
const DocumentSplitView = lazy(() => import('@/components/documents/DocumentSplitView'));
const DocumentFullPageViewer = lazy(() => import('@/components/documents/DocumentFullPageViewer'));

// In component:
<Suspense fallback={<DocumentViewerSkeleton />}>
  {viewMode === 'modal' && <DocumentModal {...props} />}
  {viewMode === 'split' && <DocumentSplitView {...props} />}
</Suspense>
```

**Prefetching**:

```typescript
// Prefetch on hover (200ms delay)
const handleDocumentHover = useMemo(
  () =>
    debounce((documentId: string) => {
      prefetchDocumentContent(documentId);
    }, 200),
  [prefetchDocumentContent]
);

<DocumentCard
  onMouseEnter={() => handleDocumentHover(doc.id)}
  {...props}
/>
```

**Virtualization** (for long documents):

```typescript
import { FixedSizeList } from 'react-window';

// Virtualize PDF pages (render only visible pages)
<FixedSizeList
  height={600}
  itemCount={numPages}
  itemSize={800}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <Page pageNumber={index + 1} />
    </div>
  )}
</FixedSizeList>
```

**Caching**:

- Use React Query cache for document content (5 min stale time)
- Cache pre-signed URLs (avoid re-fetching from S3)
- Browser cache for PDF.js worker (service worker)

---

### Backend Requirements

**GraphQL Schema Extensions**:

```graphql
type Document {
  id: ID!
  title: String!
  file_path: String!
  file_size: Int!
  mime_type: String!
  num_pages: Int
  thumbnail_url: String # NEW: S3 URL for thumbnail image
  preview_url: String # NEW: Pre-signed URL for preview (expires 1 hour)
  download_url: String # NEW: Pre-signed URL for download
}

type DocumentChunk {
  id: ID!
  document_id: ID!
  chunk_text: String!
  chunk_index: Int!
  page_number: Int # NEW: Page number for navigation
  start_char: Int # NEW: Character offset for highlighting
  end_char: Int
}

type Query {
  # Get document content for viewing
  getDocumentContent(documentId: ID!): DocumentContent!

  # Get specific chunk with context (prev/next chunks)
  getDocumentChunk(
    documentId: ID!
    chunkIndex: Int!
    contextBefore: Int = 1 # Include N chunks before
    contextAfter: Int = 1 # Include N chunks after
  ): DocumentChunkWithContext!
}

type DocumentContent {
  document: Document!
  content: String # Base64 or plain text
  preview_url: String # Pre-signed S3 URL (preferred)
  chunks: [DocumentChunk!]! # All chunks with page numbers
}

type DocumentChunkWithContext {
  targetChunk: DocumentChunk!
  previousChunks: [DocumentChunk!]!
  nextChunks: [DocumentChunk!]!
}
```

**S3 Pre-Signed URLs**:

```python
# apps/api/app/services/document_service.py

async def generate_document_preview_url(
    document_id: str,
    expires_in: int = 3600  # 1 hour
) -> str:
    """Generate pre-signed URL for document preview."""
    document = await get_document(document_id)

    # Generate S3 pre-signed URL
    s3_client = boto3.client('s3')
    preview_url = s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': settings.s3_bucket,
            'Key': document.file_path
        },
        ExpiresIn=expires_in
    )

    return preview_url
```

**Thumbnail Generation** (for PDFs):

```python
# apps/api/app/services/thumbnail_service.py

from pdf2image import convert_from_path
import boto3

async def generate_pdf_thumbnail(
    document_id: str,
    page_num: int = 1
) -> str:
    """Generate thumbnail image for PDF first page."""
    document = await get_document(document_id)

    # Download PDF temporarily
    local_path = f"/tmp/{document_id}.pdf"
    s3_client = boto3.client('s3')
    s3_client.download_file(
        settings.s3_bucket,
        document.file_path,
        local_path
    )

    # Convert first page to image
    images = convert_from_path(local_path, first_page=page_num, last_page=page_num)
    thumbnail = images[0]
    thumbnail.thumbnail((300, 400))  # Resize to 300x400

    # Upload thumbnail to S3
    thumbnail_path = f"thumbnails/{document_id}_p{page_num}.jpg"
    thumbnail.save(f"/tmp/{document_id}_thumb.jpg")
    s3_client.upload_file(
        f"/tmp/{document_id}_thumb.jpg",
        settings.s3_bucket,
        thumbnail_path
    )

    # Generate pre-signed URL
    thumbnail_url = s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': settings.s3_bucket, 'Key': thumbnail_path},
        ExpiresIn=86400  # 24 hours
    )

    # Clean up
    os.remove(local_path)
    os.remove(f"/tmp/{document_id}_thumb.jpg")

    return thumbnail_url
```

---

## Implementation Recommendations for Olympus

### Phase 1: Threads Citation Preview (Priority 1)

**Goal**: Allow users to preview cited documents inline without leaving Threads conversation

**Viewing Pattern**:

1. **Hover Preview** (inline, lightweight)
2. **Modal Viewer** (click for full chunk)
3. **Split-Screen** (optional, power users)

**Implementation**:

```typescript
// components/threads/CitationPreview.tsx

import { Popover, PopoverContent, PopoverTrigger } from '@olympus/ui';
import { usePrefetchDocumentContent } from '@/hooks/queries/useDocuments';

export function InlineCitation({ citation }: { citation: Citation }) {
  const prefetch = usePrefetchDocumentContent();

  return (
    <Popover>
      <PopoverTrigger
        onMouseEnter={() => prefetch(citation.document_id)}
        className="citation-badge"
      >
        [{citation.index}]
      </PopoverTrigger>

      <PopoverContent className="w-96">
        {/* Hover preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DocumentIcon className="h-4 w-4" />
            <span className="font-semibold">{citation.document_title}</span>
          </div>

          <p className="text-sm text-gray-600">
            {citation.snippet}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {citation.page_number} • Chunk {citation.chunk_index}
            </span>

            <SimilarityScore score={citation.similarity_score} />
          </div>

          <Button
            variant="link"
            onClick={() => openDocumentModal(citation)}
          >
            View full document →
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Features**:

- ✅ Hover preview with document metadata + snippet
- ✅ Similarity score visualization
- ✅ Click to open modal with full chunk (highlighted)
- ✅ "View full document" link to open split-screen or full-page viewer
- ✅ Prefetch document content on hover (200ms delay)

**Estimated Effort**: 5 points (~6-10 hours)

---

### Phase 2: Spaces Document Grid & Viewer (Priority 2)

**Goal**: Browse documents in Space, preview on hover, view in split-screen or full-page

**Viewing Patterns**:

1. **Grid View** with hover preview
2. **Split-Screen** viewer (document + metadata/comments)
3. **Full-Page** viewer (deep reading)

**Implementation**:

```typescript
// components/spaces/DocumentGrid.tsx

import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentSplitView } from '@/components/documents/DocumentSplitView';

export function DocumentGrid({ spaceId }: { spaceId: string }) {
  const { data: documents } = useDocuments(spaceId);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid');

  if (viewMode === 'split' && selectedDoc) {
    return (
      <DocumentSplitView
        document={selectedDoc}
        onClose={() => setViewMode('grid')}
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onClick={() => {
            setSelectedDoc(doc);
            setViewMode('split');
          }}
        />
      ))}
    </div>
  );
}

// components/documents/DocumentCard.tsx

export function DocumentCard({ document, onClick }: DocumentCardProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={onClick}
        >
          {/* Thumbnail */}
          {document.thumbnail_url ? (
            <img
              src={document.thumbnail_url}
              alt={document.title}
              className="w-full h-48 object-cover rounded-t-lg"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
              <DocumentIcon className="h-16 w-16 text-gray-400" />
            </div>
          )}

          {/* Metadata */}
          <div className="p-4">
            <h3 className="font-semibold truncate">{document.title}</h3>
            <p className="text-sm text-gray-500">
              {formatFileSize(document.file_size)} • {document.num_pages} pages
            </p>
          </div>
        </Card>
      </PopoverTrigger>

      <PopoverContent className="w-80">
        {/* Hover preview */}
        <DocumentHoverPreview document={document} />
      </PopoverContent>
    </Popover>
  );
}
```

**Features**:

- ✅ Grid layout with document cards (thumbnail + metadata)
- ✅ Hover preview showing: title, file size, num pages, last modified, owner
- ✅ Click to open split-screen viewer (document left, metadata/comments right)
- ✅ "Open full-page" button for deep reading
- ✅ Toggle between grid and list view

**Estimated Effort**: 8 points (~10-15 hours)

---

### Phase 3: Documents Tab Full-Page Viewer (Priority 3)

**Goal**: Dedicated document management tab with full-page viewer

**Viewing Patterns**:

1. **Sidebar Navigation** (Space list + document tree)
2. **Full-Page Viewer** (primary viewing mode)
3. **Metadata Panel** (slide-in panel for document properties, comments)

**Implementation**:

```typescript
// app/dashboard/documents/page.tsx

export default function DocumentsPage() {
  return (
    <div className="flex h-screen">
      {/* Sidebar: Space + Document Tree */}
      <DocumentSidebar />

      {/* Main Content: Document Viewer */}
      <DocumentFullPageViewer />

      {/* Metadata Panel (slide-in from right) */}
      <DocumentMetadataPanel />
    </div>
  );
}

// components/documents/DocumentFullPageViewer.tsx

import { Document, Page } from 'react-pdf';

export function DocumentFullPageViewer({ documentId }: { documentId: string }) {
  const { data: docContent } = useDocumentContent(documentId);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <DocumentViewerToolbar
        currentPage={currentPage}
        numPages={numPages}
        onPageChange={setCurrentPage}
        onDownload={() => downloadDocument(docContent.document)}
      />

      {/* Document Content */}
      <div className="flex-1 overflow-auto p-8 bg-gray-50">
        <Document
          file={docContent.preview_url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          <Page
            pageNumber={currentPage}
            width={800}
            renderTextLayer={true}  // Enable text selection
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Navigation */}
      <DocumentNavigation
        currentPage={currentPage}
        numPages={numPages}
        onPageChange={setCurrentPage}
        chunks={docContent.chunks}  // Show chunk markers
      />
    </div>
  );
}
```

**Features**:

- ✅ Sidebar with Space selector + document tree
- ✅ Full-page PDF/DOCX viewer with text selection
- ✅ Toolbar: zoom, search, download, print
- ✅ Page navigation with chunk markers (show which pages have citations)
- ✅ Slide-in metadata panel: document properties, tags, comments
- ✅ Keyboard shortcuts (arrow keys for navigation, Cmd+F for search)

**Estimated Effort**: 13 points (~15-20 hours)

---

### User Preferences

**Add to Transparency Settings** (existing store):

```typescript
// apps/web/src/lib/stores/transparency-store.ts

interface TransparencySettings {
  // ... existing settings

  // Document viewing preferences
  documentViewing: {
    defaultViewMode: 'modal' | 'split' | 'fullpage';
    showThumbnails: boolean;
    autoScrollToCitation: boolean;
    splitScreenRatio: number; // 0.4 = 40/60, 0.5 = 50/50
    prefetchOnHover: boolean;
  };
}
```

**Settings UI**:

```typescript
// components/settings/DocumentViewingSettings.tsx

export function DocumentViewingSettings() {
  const { documentViewing, updateDocumentViewing } = useTransparencySettings();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Document Viewing</h3>

      <div>
        <Label>Default view mode</Label>
        <Select
          value={documentViewing.defaultViewMode}
          onValueChange={(value) =>
            updateDocumentViewing({ defaultViewMode: value })
          }
        >
          <option value="modal">Modal (quick preview)</option>
          <option value="split">Split-screen (side-by-side)</option>
          <option value="fullpage">Full-page (deep reading)</option>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Auto-scroll to citation</Label>
        <Switch
          checked={documentViewing.autoScrollToCitation}
          onCheckedChange={(checked) =>
            updateDocumentViewing({ autoScrollToCitation: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Show thumbnails</Label>
        <Switch
          checked={documentViewing.showThumbnails}
          onCheckedChange={(checked) =>
            updateDocumentViewing({ showThumbnails: checked })
          }
        />
      </div>
    </div>
  );
}
```

---

## Success Metrics

### User Engagement (Primary Metrics)

**1. Document Preview Interaction Rate**

- **Metric**: % of users who hover over citations to see preview
- **Target**: >50% of users interact with previews
- **Measurement**: Track `CitationPreview` hover events

**2. Document View Rate**

- **Metric**: % of users who open full document viewer from citation
- **Target**: >20% of citations clicked to view full document
- **Measurement**: Track modal/split-screen opens from citations

**3. Average Time in Document Viewer**

- **Metric**: Average session duration in document viewer
- **Target**: >2 minutes (indicates engagement, not just quick preview)
- **Measurement**: Track time from open → close

---

### Performance (Secondary Metrics)

**1. Preview Load Time**

- **Metric**: Time from hover → preview displayed
- **Target**: <200ms (p50), <500ms (p95)
- **Measurement**: Browser performance API

**2. Full Document Load Time**

- **Metric**: Time from click → document rendered
- **Target**: <1s for first page (p50), <2s (p95)
- **Measurement**: React Query request duration

**3. Prefetch Success Rate**

- **Metric**: % of document opens that use prefetched content (cache hit)
- **Target**: >80% (most hovers result in cache hit)
- **Measurement**: React Query cache metrics

---

### User Satisfaction (Tertiary Metrics)

**1. Document Viewer Satisfaction**

- **Question**: "Was the document viewer helpful for verifying AI responses?"
- **Target**: >85% "Yes" or "Very helpful"
- **Measurement**: In-app survey (post-query, 10% sample rate)

**2. View Mode Preference**

- **Question**: "Which document viewing mode do you prefer?"
- **Options**: Hover preview, Modal, Split-screen, Full-page
- **Measurement**: In-app survey + track actual usage patterns

---

## References

### Platform Documentation

1. **Hex**: [Threads Launch](https://hex.tech/blog/fall-2025-launch/), [Notebook Agent](https://learn.hex.tech/changelog/2025-08-27)
2. **Perplexity**: [Getting Started Guide](https://www.perplexity.ai/hub/blog/getting-started-with-perplexity), [Citation Tracking](https://www.datastudios.org/post/how-to-use-perplexity-ai)
3. **Claude**: [File Creation Feature](https://www.anthropic.com/news/create-files), [PDF Support](https://www.datastudios.org/post/claude-for-pdfs)
4. **ChatGPT**: [Visual Retrieval FAQ](https://help.openai.com/en/articles/10416312-visual-retrieval-with-pdfs-faq)
5. **Notion**: [Visual Link Previews](https://www.notion.com/help/guides/visual-link-previews-streamline-collaboration), [Notion 3.0 Agents](https://www.notion.com/releases/2025-09-18)
6. **Google Drive**: [New Preview Feature](https://www.howtogeek.com/google-drive-has-a-cool-new-preview-feature/)
7. **Dropbox Paper**: [Collaborate on Docs](https://help.dropbox.com/files-folders/paper/doc-collaboration), [File Previews](https://help.dropbox.com/view-edit/file-previews)
8. **Linear**: [Peek Preview Docs](https://linear.app/docs/peek), [Project Documents](https://linear.app/docs/project-documents)
9. **GitBook**: [GitBook UI](https://gitbook.com/docs/resources/gitbook-ui), [Navigation](https://docs.gitbook.com/product-tour/navigation)
10. **Confluence**: [Navigate Confluence](https://www.atlassian.com/software/confluence/guides/get-started/navigate), [Configure Sidebar](https://confluence.atlassian.com/doc/configure-the-sidebar-317194694.html)

---

### UX Research & Best Practices

1. **Document Viewer UI Patterns**: [UX Stack Exchange Discussion](https://ux.stackexchange.com/questions/108332/how-to-implement-document-viewer-ui-in-webpage)
2. **Modal UX Best Practices**: [Eleken - Mastering Modal UX](https://www.eleken.co/blog-posts/modal-ux)
3. **Progressive Disclosure**: Nielsen Norman Group research
4. **AI Citation Patterns**: [ShapeofAI.com - Citations Pattern](https://www.shapeof.ai/patterns/citations)

---

### Technical Libraries

1. **react-pdf**: [GitHub](https://github.com/wojtekmaj/react-pdf), [Documentation](https://react-pdf.org/)
2. **@react-pdf-viewer**: [Website](https://react-pdf-viewer.dev/), [Modal Example](https://react-pdf-viewer.dev/examples/preview-a-document-inside-a-modal/)
3. **mammoth.js**: [GitHub](https://github.com/mwilliamson/mammoth.js)
4. **pdf2image**: [PyPI](https://pypi.org/project/pdf2image/) (thumbnail generation)

---

### Olympus Internal Documentation

1. **Agent Transparency Research**: [AGENT_TRANSPARENCY_RESEARCH.md](./AGENT_TRANSPARENCY_RESEARCH.md) - Related UI patterns
2. **HEX Design System**: [HEX_DESIGN_SYSTEM.md](./HEX_DESIGN_SYSTEM.md) - Design aesthetic guidelines
3. **Frontend Guide**: [frontend-guide.md](./guides/frontend-guide.md) - React Query, Zustand patterns
4. **Vector Search Guide**: [vector-search-guide.md](./guides/vector-search-guide.md) - Citation retrieval architecture

---

## Appendix: Implementation Checklist

### Phase 1: Threads Citation Preview ✅

**Frontend Components**:

- [ ] Create `InlineCitation.tsx` (clickable badge with hover preview)
- [ ] Create `CitationPreview.tsx` (popover with snippet + metadata)
- [ ] Create `DocumentModal.tsx` (modal viewer for full chunk)
- [ ] Update `MarkdownContent.tsx` to replace `[N]` with `InlineCitation`
- [ ] Add prefetch logic to `useDocuments.ts` hook

**Backend**:

- [ ] Add `preview_url` field to `Document` type (pre-signed S3 URL)
- [ ] Add `snippet` field to `Citation` type (2-3 sentence preview)
- [ ] Implement `getDocumentContent` GraphQL query
- [ ] Generate pre-signed URLs with 1-hour expiry

**Design**:

- [ ] Citation badge styling (Hex blue, hoverable)
- [ ] Preview popover layout (title, snippet, score, "View full" link)
- [ ] Modal layout (document viewer + close button)

**Testing**:

- [ ] Unit tests: citation parsing, prefetch logic
- [ ] Integration tests: hover preview loads correctly
- [ ] Performance tests: preview load time <200ms
- [ ] User testing: validate preview usefulness

---

### Phase 2: Spaces Document Grid & Viewer ✅

**Frontend Components**:

- [ ] Create `DocumentGrid.tsx` (grid layout with cards)
- [ ] Create `DocumentCard.tsx` (thumbnail + metadata + hover preview)
- [ ] Create `DocumentHoverPreview.tsx` (popover with document details)
- [ ] Create `DocumentSplitView.tsx` (split-screen layout)
- [ ] Create `DocumentViewer.tsx` (core PDF/DOCX viewer)
- [ ] Add toggle between grid and list view

**Backend**:

- [ ] Generate thumbnail images for PDFs (first page, 300x400px)
- [ ] Upload thumbnails to S3 with 24-hour pre-signed URLs
- [ ] Add `thumbnail_url` field to `Document` type
- [ ] Optimize document list query (paginate, filter by Space)

**Design**:

- [ ] Document card layout (thumbnail, title, metadata)
- [ ] Hover preview popover (detailed metadata)
- [ ] Split-screen layout (document left, metadata panel right)
- [ ] Resizable split panels (drag handle)

**Testing**:

- [ ] Unit tests: grid rendering, card interactions
- [ ] Integration tests: split-screen viewer loads correctly
- [ ] Performance tests: thumbnail generation <5s per document
- [ ] User testing: validate grid vs. list preference

---

### Phase 3: Documents Tab Full-Page Viewer ✅

**Frontend Components**:

- [ ] Create `DocumentSidebar.tsx` (Space selector + document tree)
- [ ] Create `DocumentFullPageViewer.tsx` (full-page PDF/DOCX viewer)
- [ ] Create `DocumentViewerToolbar.tsx` (zoom, search, download, print)
- [ ] Create `DocumentNavigation.tsx` (page nav + chunk markers)
- [ ] Create `DocumentMetadataPanel.tsx` (slide-in panel with properties)

**Backend**:

- [ ] Add `page_number` to `DocumentChunk` (for navigation)
- [ ] Implement `getDocumentChunk` with context (prev/next chunks)
- [ ] Add search endpoint (full-text search within document)

**Design**:

- [ ] Sidebar layout (collapsible, Space tree, document list)
- [ ] Full-page viewer layout (toolbar, content, navigation)
- [ ] Metadata panel layout (properties, tags, comments)
- [ ] Keyboard shortcuts (arrow keys, Cmd+F)

**Testing**:

- [ ] Unit tests: viewer controls, navigation
- [ ] Integration tests: full-page viewer loads correctly
- [ ] Performance tests: page render time <500ms
- [ ] User testing: validate navigation UX

---

### User Preferences ✅

**Frontend**:

- [ ] Add `documentViewing` to `transparency-store.ts`
- [ ] Create `DocumentViewingSettings.tsx` panel
- [ ] Add settings to user menu or preferences page
- [ ] Persist preferences to localStorage

**Testing**:

- [ ] Unit tests: preference storage and retrieval
- [ ] Integration tests: components respect preferences
- [ ] User testing: validate settings clarity

---

## Document Metadata

**Author**: Research conducted by Kwame Amosah

**Date**: January 2025

**Last Updated**: January 5, 2025

**Status**: ✅ Research Complete → Implementation Planning

**Next Steps**:

1. Review research document with team
2. Prioritize implementation phases (recommend: Phase 1 → Phase 2 → Phase 3)
3. Create Linear issue with detailed implementation plan
4. Begin Phase 1 implementation (Threads Citation Preview)
