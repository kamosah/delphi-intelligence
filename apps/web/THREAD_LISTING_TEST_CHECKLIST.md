# Thread Listing Test Checklist (LOG-257)

## Overview

Test that thread listing queries work correctly with the new visibility model after GraphQL type updates.

## Pre-Test Setup

1. **Start Services**

   ```bash
   # Backend
   cd apps/api && docker compose up -d

   # Frontend
   cd apps/web && npm run dev
   ```

2. **Login** to the application at http://localhost:3000

## Test Cases

### 1. Space Thread Listing

**Location**: Navigate to a Space page (e.g., `/spaces/[space-id]`)

**Expected Behavior**:

- [ ] All threads in the space are displayed
- [ ] Threads show correct visibility: `SPACE`
- [ ] Collaborative model: Other members' threads visible
- [ ] No console errors

**GraphQL Query**: `threads(spaceId: ID)`

---

### 2. Personal Thread Listing

**Location**: Navigate to Personal Threads page (e.g., `/threads?filter=personal`)

**Expected Behavior**:

- [ ] Only user's personal threads displayed (`visibility: PERSONAL`)
- [ ] Each thread shows `organizationId: null` and `spaceId: null`
- [ ] Private to owner: Other users cannot see these threads
- [ ] No console errors

**GraphQL Query**: `threads(organizationId: ID)` filtered by `visibility: PERSONAL`

---

### 3. Organization Thread Listing

**Location**: Navigate to Threads page without space filter (e.g., `/threads`)

**Expected Behavior**:

- [ ] Organization-wide threads displayed (`visibility: ORGANIZATION`)
- [ ] User's personal threads displayed (`visibility: PERSONAL`)
- [ ] Space threads NOT displayed (unless user selects specific space)
- [ ] No console errors

**GraphQL Query**: `threads(organizationId: ID)`

---

### 4. Thread Creation

**Location**: Create new thread form

**Test Data**:

- [ ] Create **Personal thread**: No organization or space selected
  - Should set `visibility: PERSONAL`
  - Both `organizationId` and `spaceId` should be null

- [ ] Create **Space thread**: Select a space from dropdown
  - Should set `visibility: SPACE`
  - Should require `spaceId`

- [ ] Create **Org thread**: Select organization, no space
  - Should set `visibility: ORGANIZATION`
  - Should require `organizationId`
  - `spaceId` should be null

**Expected Behavior**:

- [ ] Form submits successfully
- [ ] New thread appears in appropriate listing
- [ ] Visibility field is set correctly
- [ ] No TypeScript errors (visibility is required)

**GraphQL Mutation**: `createThread(input: CreateThreadInput!)`

---

### 5. Thread Detail View

**Location**: Click into an individual thread (e.g., `/threads/[thread-id]`)

**Expected Behavior**:

- [ ] Thread loads successfully
- [ ] Visibility badge displays: "Personal" | "Space" | "Organization"
- [ ] Messages load correctly
- [ ] No console errors

**GraphQL Query**: `thread(id: ID!)`

---

## Type Safety Checks

### TypeScript Compilation

```bash
cd apps/web
npm run type-check
```

**Expected**:

- [ ] No TypeScript errors
- [ ] `visibility` field recognized as required in `CreateThreadInput`
- [ ] `ThreadVisibilityEnum` properly typed

### GraphQL Type Generation

```bash
cd apps/web
npm run graphql:generate
```

**Expected**:

- [ ] Generated types match backend schema
- [ ] `ThreadVisibilityEnum` has three values: PERSONAL, SPACE, ORGANIZATION
- [ ] Documentation comments present in generated types

---

## Performance Testing

### Cache Pre-Population Verification

**Purpose**: Verify that thread listing pre-populates individual thread caches for instant navigation

**Steps**:

1. **Open DevTools Network Tab** (Chrome/Firefox/Edge)

   ```bash
   # Frontend should be running
   cd apps/web && npm run dev
   ```

2. **Clear all caches** to start fresh
   - Open DevTools Console
   - Run: `localStorage.clear(); sessionStorage.clear();`
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

3. **Navigate to threads list** (e.g., `/threads` or `/spaces/[space-id]`)
   - **Expected**: GraphQL `threads` query in Network tab
   - Record response time (baseline)

4. **Click on a thread** from the list to view details
   - **Expected**: NO new GraphQL `thread` query in Network tab
   - Page should load instantly from cache
   - Verify thread detail page renders correctly

5. **Verify cache behavior**:
   - Navigate back to threads list
   - Click a different thread
   - **Expected**: Still no GraphQL request (all threads pre-populated)

**Pass Criteria**:

- [ ] Threads list query completes successfully
- [ ] Thread detail pages load without GraphQL requests (cached)
- [ ] Navigation is instant (<100ms perceived latency)
- [ ] No console errors

---

### Large Dataset Testing

**Purpose**: Verify performance with realistic data volumes (50+ threads)

**Setup**:

```bash
# Backend - seed large dataset (if seeding script exists)
cd apps/api
docker compose exec api poetry run python scripts/seed_threads.py --count=50

# Or manually create 50+ threads via UI/GraphQL
```

**Test Cases**:

1. **List Rendering Performance**
   - Navigate to threads list with 50+ threads
   - **Expected**: Page renders within 2 seconds
   - Scroll should be smooth (60fps)
   - No layout shifts or jank

2. **Cache Pre-Population at Scale**
   - Click on 10 random threads sequentially
   - **Expected**: All load instantly from cache
   - DevTools Network tab shows only initial `threads` query

3. **Memory Usage**
   - Open DevTools Memory Profiler
   - Take heap snapshot before loading threads
   - Load threads list (50+ threads)
   - Take heap snapshot after
   - **Expected**: Memory increase <10MB for cache data

**Pass Criteria**:

- [ ] List renders within 2 seconds for 50+ threads
- [ ] Smooth scrolling performance (no jank)
- [ ] All threads cached after initial query
- [ ] Memory usage remains reasonable (<10MB increase)

---

## Common Issues & Fixes

### Issue: "visibility is required" error

**Cause**: Old code using optional visibility
**Fix**: Update thread creation to always provide visibility value

### Issue: Threads not filtering correctly

**Cause**: Backend query logic or SpiceDB permissions
**Fix**: Check backend logs, verify SpiceDB relationships

### Issue: TypeScript errors on ThreadVisibilityEnum

**Cause**: Outdated generated types
**Fix**: Re-run `npm run graphql:generate`

---

## Automated Test Coverage (Future: LOG-258)

These manual tests should be automated in LOG-258:

1. **E2E Tests** (Playwright)
   - Thread listing by visibility
   - Thread creation with different visibility levels
   - Authorization checks (space member access)

2. **Integration Tests** (Backend)
   - GraphQL query filtering
   - SpiceDB permission checks
   - Visibility constraint validation

---

## Sign-Off

- [ ] All manual tests passed
- [ ] No console errors
- [ ] TypeScript compilation clean
- [ ] Ready for LOG-258 (automated testing)
