# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the Olympus project.

## ADR Format

We use the following format for ADRs:

- **Status**: Proposed, Accepted, Deprecated, or Superseded
- **Context**: The situation that led to this decision
- **Decision**: What we decided to do
- **Consequences**: The results of this decision, both positive and negative

## ADR Index

| ADR                                                  | Title                                             | Status   |
| ---------------------------------------------------- | ------------------------------------------------- | -------- |
| [ADR-001](./001-state-management.md)                 | Client-Side State Management Strategy             | Accepted |
| [ADR-002](./002-ai-agent-orchestration.md)           | AI Agent Orchestration                            | Accepted |
| [ADR-003](./003-mentions-implementation-tiptap.md)   | Mentions Implementation with Tiptap               | Accepted |
| [ADR-004](./004-document-folder-management-ui.md)    | Document and Folder Management UI Architecture    | Proposed |
| [ADR-005](./005-threads-standalone-route.md)         | Threads as Standalone Route with Mentions System  | Accepted |
| [ADR-006](./006-rename-query-to-thread-backend.md)   | Rename "Query" to "Thread" in Backend             | Accepted |
| [ADR-007](./007-routing-architecture.md)             | Routing Architecture for Multi-Tenant Context     | Accepted |
| [ADR-008](./008-micro-frontend-architecture.md)      | Micro Frontend Architecture for Olympus Dashboard | Proposed |
| [ADR-009](./009-nextjs-ssr-react-query.md)           | Next.js SSR with React Query Implementation       | Proposed |
| [ADR-010](./010-http-only-cookie-authentication.md)  | HTTP-Only Cookie Authentication                   | Accepted |
| [ADR-011](./011-error-handling-and-observability.md) | Error Handling and Observability                  | Accepted |
| [ADR-012](./012-access-control-authorization.md)     | Access Control and Authorization Architecture     | Proposed |

## Naming Convention

ADRs are numbered sequentially: `NNNN-title-with-hyphens.md`
