# ADR-007: Routing Architecture for Multi-Tenant Organization Context

**Status:** Accepted
**Date:** 2025-11-09
**Deciders:** Development Team
**Tags:** architecture, routing, multi-tenancy, ux

## Context

Olympus is a multi-tenant platform where users can belong to multiple organizations. We need to establish a clear routing structure that:

1. Makes it obvious which organization context the user is working in
2. Provides clear separation between workspace content and settings
3. Scales as we add more features (billing, API keys, team management)
4. Follows industry best practices for SaaS applications
5. Aligns with our Hex-inspired design system

The key question is: **How should we structure routes for organization-scoped resources and settings?**

## Decision Drivers

- **User Mental Model:** Clear distinction between "doing work" (dashboard) and "configuring" (settings)
- **Hex Alignment:** Our design inspiration uses a similar hybrid pattern
- **URL Shareability:** Settings URLs should include org ID for sharing
- **State Management:** Organization context already managed via Zustand (`useAuthStore().currentOrganization`)
- **Developer Experience:** Simple, predictable routing patterns
- **Scalability:** Easy to add new settings pages and resource types

## Options Considered

### Option 1: Organization-Scoped Routes

**Pattern:** `/:orgSlug/dashboard`, `/:orgSlug/spaces`, `/:orgSlug/settings`

**Pros:**

- Clear org context in URL
- Shareable org-specific URLs
- Matches Linear, Notion, Vercel patterns

**Cons:**

- More complex routing logic
- URL changes when switching orgs
- Need org slug resolution on every route

**Decision:** ❌ Rejected - Adds unnecessary complexity for our use case

---

### Option 2: Dashboard-Scoped Settings

**Pattern:** `/dashboard/settings/organizations/[id]`, `/dashboard/settings/profile`

**Pros:**

- All authenticated routes under `/dashboard`
- Simpler top-level routing

**Cons:**

- Settings feel cramped under dashboard
- Less clear mental model (settings ≠ workspace)
- Harder to navigate between workspace and settings

**Decision:** ❌ Rejected - Poor information architecture

---

### Option 3: Hybrid Approach (SELECTED)

**Pattern:** `/dashboard` for work, `/settings` for configuration

```
/dashboard (context: useAuthStore().currentOrganization)
  / (overview)
  /spaces
  /threads

/settings
  /organizations/[orgId]
    / (general settings)
    /members
  /profile
```

**Pros:**

- Clear mental model: Dashboard = work, Settings = configuration
- Matches Hex's routing pattern
- Settings URLs include org ID for shareability
- Organization context via state (no URL changes on switch)
- Scalable for future settings (billing, API keys, etc.)
- Clean separation of concerns

**Cons:**

- Settings outside `/dashboard` (acceptable trade-off)
- Need to pass org context to settings pages

**Decision:** ✅ **ACCEPTED**

---

### Option 4: Nested Organization Routes

**Pattern:** `/organizations/[id]/dashboard`, `/organizations/[id]/settings`

**Pros:**

- Very explicit ownership hierarchy
- Good for complex enterprise apps

**Cons:**

- Deeper nesting
- More verbose URLs
- Feels heavyweight for small teams

**Decision:** ❌ Rejected - Over-engineered for our needs

## Decision

**We will implement Option 3: Hybrid Approach**

### Route Structure

```
/dashboard (authenticated, uses current org from state)
  / (page.tsx - organization overview/home)
  /spaces (existing)
    /[id] (existing)
      /threads/[threadId] (existing)
  /threads (existing - org-wide thread list)

/settings (authenticated, dedicated settings area)
  /organizations/[orgId]
    / (page.tsx - general: name, description, slug)
    /members (page.tsx - member management)
  /profile (future - user personal settings)
  /notifications (future)
  /api-keys (future)
```

### Layout Strategy

**Dashboard Layout** (`/dashboard/layout.tsx`):

- Shows OrganizationSwitcher in sidebar
- Current org from `useAuthStore().currentOrganization`
- AppSidebar with navigation: Spaces, Threads, Documents, Settings

**Settings Layout** (`/settings/layout.tsx`):

- Shows OrganizationSwitcher (allows switching while in settings)
- Settings-specific sidebar with:
  - Organizations section (lists all user's orgs)
  - Profile section
  - Other settings sections

### State Management

- **Current Organization:** Managed via Zustand (`useAuthStore().currentOrganization`)
- **Dashboard routes:** Read current org from state
- **Settings routes:** Get org ID from URL param `[orgId]`
- **OrganizationSwitcher:** Updates `currentOrganization` in both contexts

## Consequences

### Positive

✅ **Clear Mental Model:** Users understand dashboard = work, settings = configuration
✅ **Hex Alignment:** Matches our design inspiration's routing pattern
✅ **Scalable:** Easy to add new settings pages (billing, integrations, etc.)
✅ **Shareable URLs:** Settings URLs include org ID
✅ **Simple State:** Organization context via Zustand, no complex URL params
✅ **Flexible Navigation:** Can switch orgs from both dashboard and settings

### Negative

⚠️ **Settings Outside Dashboard:** Settings not nested under `/dashboard` (acceptable - clearer separation)
⚠️ **Duplicate Org Context:** Org ID in URL for settings, in state for dashboard (intentional - different needs)

### Neutral

ℹ️ **Migration Path:** Existing `/dashboard` routes remain unchanged
ℹ️ **Future Expansion:** Can add `/admin` for platform-level settings if needed

## Implementation Plan

1. **Create Settings Layout** (`/settings/layout.tsx`)
   - Settings-specific sidebar
   - OrganizationSwitcher integration
   - Breadcrumb navigation

2. **Organization Settings Pages**
   - `/settings/organizations/[orgId]/page.tsx` - General settings
   - `/settings/organizations/[orgId]/members/page.tsx` - Member management

3. **Update AppSidebar**
   - Add "Settings" navigation item → `/settings/organizations/[currentOrgId]`

4. **Future Additions**
   - `/settings/profile` - User personal settings
   - `/settings/notifications` - Notification preferences
   - `/settings/api-keys` - API key management

## References

- **Hex:** Uses similar hybrid pattern (workspace context + settings area)
- **GitHub:** Settings at `/settings` with org/user separation
- **Figma:** Organization context in state, settings at top level
- **Next.js App Router:** Best practices for route organization
- [ADR-001: State Management](./001-state-management.md) - Organization context in Zustand
- [Hybrid Architecture Doc](../HYBRID_ARCHITECTURE.md) - Multi-tenant design principles

## Related Decisions

- [ADR-001: State Management](./001-state-management.md) - `currentOrganization` in Zustand
- Future ADR: User Permissions & RBAC routing guards

## Notes

This routing structure provides a foundation for:

- Organization-level settings (members, billing, integrations)
- User-level settings (profile, preferences, notifications)
- Workspace resources (spaces, threads, documents)

The hybrid approach balances simplicity with scalability, allowing us to grow the application while maintaining a clear information architecture.
