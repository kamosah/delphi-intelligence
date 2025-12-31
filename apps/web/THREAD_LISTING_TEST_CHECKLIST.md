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

### 2. Organization Thread Listing

**Location**: Navigate to Threads page without space filter (e.g., `/threads`)

**Expected Behavior**:

- [ ] Organization-wide threads displayed (`visibility: ORGANIZATION`)
- [ ] User's personal threads displayed (`visibility: PERSONAL`)
- [ ] Space threads NOT displayed (unless user selects specific space)
- [ ] No console errors

**GraphQL Query**: `threads(organizationId: ID)`

---

### 3. Thread Creation

**Location**: Create new thread form

**Test Data**:

- [ ] Create **Space thread**: Select a space from dropdown
  - Should set `visibility: SPACE`
  - Should require `spaceId`

- [ ] Create **Org thread**: No space selected
  - Should set `visibility: ORGANIZATION`
  - `spaceId` should be null

**Expected Behavior**:

- [ ] Form submits successfully
- [ ] New thread appears in appropriate listing
- [ ] Visibility field is set correctly
- [ ] No TypeScript errors (visibility is required)

**GraphQL Mutation**: `createThread(input: CreateThreadInput!)`

---

### 4. Thread Detail View

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
