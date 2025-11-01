# ADR 003: Mentions Implementation with TipTap

**Status:** Accepted

**Date:** 2025-10-31

**Decision Makers:** Engineering Team

**Related:** LOG-177 (Vector Search), Threads Interface, Notebook Interface

---

## Context

The Olympus MVP platform requires a rich mentions system to enable users to reference three types of entities within Threads (chat interface) and Notebooks:

1. **@user** - Mention team members for collaboration and notifications
2. **@database** - Reference connected database sources for SQL context
3. **#space** - Tag workspaces for organization and scoping

This feature is critical for:

- **Collaboration**: Notify team members when mentioned in threads
- **Context Awareness**: Allow AI agent to understand which database connections to query
- **Organization**: Tag content by workspace for filtering and permissions
- **UX Parity**: Match functionality expected from modern collaboration tools (Slack, Notion, Linear)

### Requirements

- Multi-entity mentions with different trigger characters (`@` for users/databases, `#` for spaces)
- Real-time autocomplete dropdown with fuzzy search
- Visual distinction between entity types (badges, colors, icons)
- Keyboard navigation (arrow keys, enter, escape)
- Accessibility (ARIA labels, screen reader support)
- Mobile-responsive UI
- Integration with existing Hex-themed design system (`@olympus/ui`)
- Future compatibility with real-time collaboration (Yjs)
- TypeScript-first with full type safety

### Current Tech Stack Context

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Design System**: Shadcn-ui (`@olympus/ui`) built on Radix UI primitives
- **State Management**: React Query (server state), Zustand (client state)
- **Collaboration (Planned)**: Yjs for real-time collaborative editing
- **GraphQL API**: User, database connection, and space queries available

---

## Decision

**We will use [TipTap](https://tiptap.dev/) with the [@tiptap/extension-mention](https://tiptap.dev/api/extensions/mention) extension** for implementing mentions functionality.

---

## Rationale

### Option Comparison

| Criteria                  | TipTap (✅ Chosen)                              | Lexical (Meta)               | Slate.js           | Draft.js              |
| ------------------------- | ----------------------------------------------- | ---------------------------- | ------------------ | --------------------- |
| **Implementation Time**   | 6-10 hours                                      | 10-15 hours                  | 10-15 hours        | 8-12 hours            |
| **Multi-Entity Mentions** | ✅ Built-in                                     | ⚠️ Custom plugin             | ⚠️ Custom plugin   | ⚠️ Custom decorator   |
| **Yjs Collaboration**     | ✅ Official (`@tiptap/extension-collaboration`) | ✅ Official (`@lexical/yjs`) | ⚠️ Third-party     | ❌ Not supported      |
| **TypeScript Support**    | ✅ TypeScript-first                             | ✅ TypeScript-first          | ⚠️ Partial         | ❌ Flow-based         |
| **Hex Aesthetic Fit**     | ✅ Unstyled primitives                          | ✅ Headless                  | ✅ Headless        | ⚠️ Opinionated styles |
| **React Integration**     | ✅ React hooks API                              | ✅ React-first               | ✅ React hooks     | ⚠️ Imperative API     |
| **Bundle Size**           | ~45KB gzipped                                   | ~75KB gzipped                | ~30KB gzipped      | ~135KB gzipped        |
| **Maintenance**           | ✅ Active (2024)                                | ✅ Active (2024)             | ⚠️ Slower releases | ❌ Deprecated (2022)  |
| **Documentation**         | ✅ Excellent                                    | ✅ Excellent                 | ⚠️ Good            | ⚠️ Outdated           |
| **Community**             | ✅ Large                                        | ✅ Growing                   | ✅ Mature          | ⚠️ Declining          |

### Why TipTap Wins

1. **Fastest Implementation** (6-10 hours vs 10-15+ hours)
   - Built-in `@tiptap/extension-mention` with autocomplete UI
   - Multi-entity support via multiple mention extensions
   - No need to build core mention logic from scratch

2. **Official Yjs Collaboration Support**
   - `@tiptap/extension-collaboration` is first-party, not third-party
   - Critical for Phase 2+ real-time collaborative editing roadmap
   - Proven in production (e.g., GitLab uses TipTap + Yjs)

3. **TypeScript-First Design**
   - Full type inference for editor commands, extensions, attributes
   - Matches project's TypeScript-first philosophy
   - Better DX than Flow-based Draft.js

4. **Hex Aesthetic Compatibility**
   - Completely unstyled by default (headless)
   - Renders to plain HTML/React components we can style with Tailwind
   - No CSS overrides needed (unlike Draft.js)

5. **Modern React Integration**
   - `useEditor()` hook fits existing React Query + Zustand patterns
   - Declarative component API (`<EditorContent />`)
   - Plays well with Next.js 14 App Router

6. **Proven Multi-Entity Mentions**
   - TipTap docs show examples with multiple mention types
   - Can register separate mention extensions with different triggers:
     ```typescript
     (Mention.configure({
       suggestion: userMentionConfig,
       HTMLAttributes: { class: 'mention-user' },
     }),
       Mention.extend({ name: 'database-mention' }).configure({
         suggestion: dbMentionConfig,
       }),
       Mention.extend({ name: 'space-mention' }).configure({
         suggestion: spaceMentionConfig,
       }));
     ```

### Why We Rejected Alternatives

**Lexical (Meta)**

- **Pros**: Meta-backed, excellent TypeScript, Yjs support
- **Cons**: Requires custom mention plugin (~10-15 hours), less mature ecosystem, larger bundle
- **Verdict**: Slower implementation with minimal advantages

**Slate.js**

- **Pros**: Mature, small bundle, flexible
- **Cons**: No official Yjs support (third-party plugin risk), requires custom mention logic, slower development
- **Verdict**: Higher long-term risk, slower implementation

**Draft.js**

- **Pros**: Mature, battle-tested at Meta
- **Cons**: **Officially deprecated** (Meta sunset in 2022), Flow-based, no Yjs support, largest bundle, outdated docs
- **Verdict**: **Not viable** for new projects in 2025

---

## Consequences

### Positive

1. **Fast Time-to-Market**
   - Estimated 6-10 hours total implementation vs 10-15+ for alternatives
   - Built-in mention autocomplete UI reduces custom component work
   - Can ship mentions feature in single sprint

2. **Future-Proof for Collaboration**
   - Official Yjs extension ready when we add real-time editing
   - No need to migrate editors later

3. **Developer Experience**
   - TypeScript autocomplete for editor commands
   - Clear documentation with examples
   - Active community for troubleshooting

4. **Design Flexibility**
   - Completely unstyled allows full Hex aesthetic implementation
   - No fighting CSS specificity battles

5. **Extensibility**
   - Easy to add more entity types later (e.g., @document, @table)
   - Rich extension ecosystem for future features (slash commands, AI autocomplete)

### Negative

1. **Bundle Size Increase**
   - TipTap core + mention extension ~45KB gzipped
   - Additional 15KB vs Slate.js (smallest option)
   - **Mitigation**: Code splitting, lazy load editor only in Threads/Notebooks

2. **Learning Curve**
   - Team needs to learn TipTap API and ProseMirror concepts
   - ~2-4 hours ramp-up time
   - **Mitigation**: Well-documented, similar to other headless libraries we use (Radix UI)

3. **Vendor Lock-In**
   - Switching editors later would require significant refactor
   - **Mitigation**: TipTap is open-source (MIT), active maintenance, large adoption

4. **Potential Over-Engineering**
   - TipTap is powerful (full rich-text editor), we only need mentions
   - Could add complexity we don't need yet
   - **Mitigation**: Start with minimal extensions (mention-only), expand as needed

---

## Implementation Plan

### Phase 1: Setup TipTap Foundation (1-2 story points, ~2-4 hours)

**Files to Create/Modify:**

- `apps/web/src/components/editor/TipTapEditor.tsx` - Base editor component
- `apps/web/src/hooks/useTipTapEditor.ts` - Editor initialization hook
- `apps/web/src/lib/tiptap/extensions.ts` - Extension configuration

**Tasks:**

1. Install dependencies: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-mention`
2. Create base `TipTapEditor` component with Hex styling (Tailwind)
3. Configure minimal extensions (Document, Paragraph, Text, HardBreak)
4. Test basic typing and rendering

**Acceptance Criteria:**

- Editor renders in Threads input area
- Basic text input works
- Styled with Hex aesthetic (blue focus ring, gray-100 background)

---

### Phase 2: Implement Multi-Entity Mentions (5-8 story points, ~10-16 hours)

#### 2.1: @user Mentions (2-3 points, ~4-6 hours)

**Files:**

- `apps/web/src/components/editor/mentions/UserMention.tsx` - User mention node renderer
- `apps/web/src/components/editor/mentions/UserMentionList.tsx` - Autocomplete dropdown
- `apps/web/src/lib/tiptap/mentions/userMentionConfig.ts` - Suggestion config
- `apps/web/src/hooks/queries/useUsers.ts` - Fetch users via GraphQL (if not exists)

**Tasks:**

1. Create `Mention` extension for users (trigger: `@`)
2. Build autocomplete dropdown with fuzzy search (Fuse.js or native filter)
3. Render mention as blue badge with avatar (Hex-styled)
4. Integrate with `useUsers()` React Query hook
5. Test keyboard navigation (up/down arrows, enter, escape)

**Acceptance Criteria:**

- Typing `@` shows user autocomplete dropdown
- Selecting user inserts mention badge
- Mentions persist on re-render
- Clicking mention shows user profile tooltip (future)

#### 2.2: @database Mentions (1-2 points, ~2-4 hours)

**Files:**

- `apps/web/src/components/editor/mentions/DatabaseMention.tsx`
- `apps/web/src/components/editor/mentions/DatabaseMentionList.tsx`
- `apps/web/src/lib/tiptap/mentions/databaseMentionConfig.ts`

**Tasks:**

1. Extend `Mention` as `database-mention` (trigger: `@`)
2. Fetch database connections via existing GraphQL query
3. Render as green badge with database icon
4. Disambiguate from user mentions in autocomplete (section headers: "Users" / "Databases")

**Acceptance Criteria:**

- Typing `@` shows both users and databases in dropdown
- Database mentions render with distinct styling (green vs blue)
- AI agent can parse database mentions from thread message

#### 2.3: #space Mentions (1-2 points, ~2-4 hours)

**Files:**

- `apps/web/src/components/editor/mentions/SpaceMention.tsx`
- `apps/web/src/components/editor/mentions/SpaceMentionList.tsx`
- `apps/web/src/lib/tiptap/mentions/spaceMentionConfig.ts`

**Tasks:**

1. Extend `Mention` as `space-mention` (trigger: `#`)
2. Fetch spaces via existing `useSpaces()` hook
3. Render as purple badge with hash icon
4. Filter spaces by user access permissions

**Acceptance Criteria:**

- Typing `#` shows space autocomplete dropdown (separate from `@`)
- Space mentions render with distinct styling (purple badge)
- Only shows spaces user has access to

---

### Phase 3: UI Polish & Accessibility (1-2 points, ~2-4 hours)

**Files:**

- `apps/web/src/components/editor/mentions/MentionDropdown.tsx` - Shared dropdown component
- `apps/web/src/components/editor/TipTapEditor.stories.tsx` - Storybook stories

**Tasks:**

1. Refactor autocomplete dropdowns into shared component
2. Add ARIA labels for screen readers
3. Add loading states for async mention data
4. Add empty states ("No users found")
5. Create Storybook stories for all mention types
6. Mobile responsive testing (touch selection)

**Acceptance Criteria:**

- Screen reader announces mention suggestions
- Keyboard-only navigation works
- Mobile autocomplete dropdown doesn't overflow viewport
- Storybook stories demonstrate all entity types

---

## Alternatives Considered

### 1. Build Custom Contenteditable Solution

**Approach:** Use native `contenteditable` with manual mention parsing

**Pros:**

- Full control over behavior
- Smallest possible bundle size
- No dependencies

**Cons:**

- 20-30 hours implementation time
- High complexity (cursor management, cross-browser bugs)
- No collaboration support
- Security risks (XSS from unescaped HTML)

**Rejection Reason:** Too slow, too risky, reinventing the wheel

---

### 2. Use Simple Textarea with Markdown Mentions

**Approach:** Textarea with `@username` as plain text, parse on submit

**Pros:**

- Simplest implementation (2-3 hours)
- Tiny bundle size
- Easy to understand

**Cons:**

- Poor UX (no autocomplete, no visual badges)
- Hard to parse ambiguous mentions (`@john` vs `@john-smith`)
- Doesn't match Hex aesthetic (rich text expected)
- No collaboration support

**Rejection Reason:** Unacceptable UX for modern collaboration tool

---

## References

- **TipTap Docs**: https://tiptap.dev/
- **TipTap Mention Extension**: https://tiptap.dev/api/extensions/mention
- **TipTap Collaboration**: https://tiptap.dev/guide/collaborative-editing
- **Yjs Integration**: https://docs.yjs.dev/ecosystem/editor-bindings/tiptap
- **Lexical Mentions**: https://lexical.dev/docs/concepts/plugins#mentions
- **Slate.js Mentions**: https://www.slatejs.org/examples/mentions
- **GitLab TipTap Case Study**: https://about.gitlab.com/blog/2021/05/04/behind-the-scenes-tiptap/
- **ProseMirror (TipTap Core)**: https://prosemirror.net/

---

## Notes

- **Bundle Size Estimate**: Includes TipTap core, starter-kit, and mention extension. Based on official TipTap bundle analyzer data.
- **Implementation Time Estimates**: Based on experience with similar headless libraries (Radix UI, React Hook Form). Assumes team familiarity with React patterns.
- **Yjs Priority**: Real-time collaboration is Phase 2+ roadmap, but architecture decision impacts now (can't easily switch editors later).
- **Accessibility**: WCAG 2.1 Level AA compliance required for enterprise customers. TipTap provides primitives, but implementation responsibility is ours.

---

## Approval

**Approved By:** Engineering Team
**Date:** 2025-10-31
**Next Steps:** Update `docs/PRODUCT_REQUIREMENTS.md` and create Linear Epic/tasks
