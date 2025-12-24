# ADR-013: Access Control and Authorization Architecture

**Status**: Proposed
**Date**: 2025-12-24
**Deciders**: Engineering Team
**Technical Story**: TBD - Access Control Implementation

---

## Context

Olympus currently implements access control through:

1. **Organization-level membership**: `OrganizationMember` model with roles (Owner, Admin, Member, Viewer)
2. **Space-level membership**: `SpaceMember` model with roles (Owner, Editor, Viewer)
3. **Raw SQL permission checks**: GraphQL resolvers verify membership using direct database queries
4. **PostgreSQL RLS**: Supabase row-level security for basic tenant isolation

### Current Limitations

- **No centralized authorization service**: Permission logic scattered across resolvers
- **Difficult to audit**: "Who can access what?" requires complex SQL queries
- **Not declarative**: Permission rules embedded in imperative code
- **Hard to extend**: Adding new permission rules requires code changes across multiple files
- **No support for complex relationships**: Cannot express hierarchical permissions (organization → space → document)
- **Limited context-awareness**: Cannot enforce attribute-based rules (time-based access, IP restrictions)

### Requirements from Product Vision

Based on PRODUCT_REQUIREMENTS.md and HYBRID_ARCHITECTURE.md, Olympus requires:

1. **Multi-tenant hierarchy**: Organizations → Spaces → Documents/Threads/Database Connections
2. **Role-based permissions**: Organization and Space-level roles with clear capabilities
3. **Resource-level access**: Fine-grained permissions on documents, queries, database credentials
4. **Collaboration features**: Share spaces, public/private visibility, comments
5. **Enterprise security**: Audit trails, credential encryption, compliance-ready
6. **Future needs**: SSO/SAML, custom roles, attribute-based rules

### Industry Research Summary

Modern SaaS platforms use **hybrid authorization models** combining:

- **RBAC** (Role-Based): Simple hierarchical permissions
- **ReBAC** (Relationship-Based): Hierarchical resource access (Google Drive-style)
- **ABAC** (Attribute-Based): Context-aware rules (time, location, compliance)

Leading companies (GitHub, Linear, Slack) implement this through:

- **Declarative policy engines** for complex rules
- **PostgreSQL RLS** as defense-in-depth for tenant isolation
- **External authorization services** for business logic
- **Audit-first architecture** for compliance

Popular solutions evaluated:

| Solution  | Type          | Strengths                                 | Pricing          |
| --------- | ------------- | ----------------------------------------- | ---------------- |
| **Oso**   | Policy engine | RBAC + ReBAC + ABAC, Python-native, Polar | Free - $149/mo   |
| Cerbos    | Policy engine | Excellent ABAC, fast, limited ReBAC       | Free - custom    |
| Permit.io | SaaS platform | Easy UI, managed service                  | $18k/3 years     |
| SpiceDB   | Zanzibar DB   | Pure ReBAC, Google-proven, 5ms p95        | Open source      |
| Ory Keto  | Zanzibar impl | Cloud-native, headless, gRPC/REST         | Open source      |
| Custom    | Internal      | Full control, optimized for Olympus       | Development time |

## Decision

We will implement a **two-layer hybrid authorization architecture**:

### Layer 1: Oso Policy Engine (Application Logic)

**Primary authorization system** for all permission checks:

- **Declarative policies** in Polar language (`.polar` files)
- **Support for RBAC, ReBAC, and ABAC** in a unified model
- **Centralized permission checks** via FastAPI decorators and GraphQL resolver helpers
- **Audit-friendly** with policy versioning and testing framework

### Layer 2: PostgreSQL RLS (Defense in Depth)

**Secondary enforcement** for tenant isolation:

- **Simple `organization_id` filtering** to prevent data leaks
- **No complex business logic** in RLS policies
- **Backstop for bugs** in application layer

### Architecture

```
┌────────────────────────────────────────────────────┐
│            Access Control Architecture             │
├────────────────────────────────────────────────────┤
│                                                    │
│  GraphQL Resolvers / REST Endpoints               │
│              │                                     │
│              ▼                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │         Oso Policy Engine (Layer 1)          │ │
│  │  - Polar policies (.polar files)             │ │
│  │  - RBAC: organization_role, space_role       │ │
│  │  - ReBAC: org → space → document hierarchy   │ │
│  │  - ABAC: future compliance rules             │ │
│  │  - Audit: "who can access X?" queries        │ │
│  └────────────────┬─────────────────────────────┘ │
│                   │                                │
│                   ▼                                │
│  ┌──────────────────────────────────────────────┐ │
│  │      PostgreSQL RLS (Layer 2 - Backup)       │ │
│  │  - Basic organization_id filtering           │ │
│  │  - Defense against application bugs          │ │
│  │  - No complex business logic                 │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Example Policy (Polar)

```polar
# Organization permissions
allow(user: User, "read", org: Organization) if
    has_role(user, "member", org);

allow(user: User, "manage_members", org: Organization) if
    has_role(user, ["owner", "admin"], org);

allow(user: User, "billing", org: Organization) if
    has_role(user, "owner", org);

# Space permissions (hierarchical)
allow(user: User, "read", space: Space) if
    space.is_public
    and has_role(user, "member", space.organization);

allow(user: User, "read", space: Space) if
    has_space_role(user, ["owner", "editor", "viewer"], space);

allow(user: User, "upload_document", space: Space) if
    has_space_role(user, ["owner", "editor"], space);

# Document permissions (inherit from space)
allow(user: User, "read", doc: Document) if
    allow(user, "read", doc.space);

allow(user: User, "delete", doc: Document) if
    user.id = doc.uploaded_by
    or has_space_role(user, "owner", doc.space);

# Database connection credentials
allow(user: User, "view_credentials", conn: DatabaseConnection) if
    user.id = conn.created_by
    or has_space_role(user, "owner", conn.space);
```

## Rationale

### Why Oso?

1. **Perfect fit for Olympus's hybrid model**:
   - RBAC for organization/space roles
   - ReBAC for hierarchical permissions (org → space → document)
   - ABAC for future compliance (time-based, IP restrictions)

2. **Python/FastAPI native**:
   - Clean Python library
   - Decorator pattern for endpoints
   - Easy GraphQL resolver integration

3. **Declarative and auditable**:
   - Policies in version-controlled `.polar` files
   - "Who can access X?" queries built-in
   - Testing framework for policy validation

4. **Developer experience**:
   - Excellent documentation
   - Active community
   - Free tier for development

5. **Scalable and proven**:
   - Used by Webflow and other SaaS platforms
   - Microservices-ready (if Olympus scales)
   - Caching for performance

### Why NOT Alternatives?

**Cerbos**:

- ❌ Limited ReBAC support (hard to model org → space → document hierarchy)
- ❌ More complex policy language
- ✅ Excellent ABAC (but we don't need heavy ABAC yet)

**Permit.io**:

- ❌ $18k/3 years pricing (expensive for MVP)
- ❌ Less customization vs open-source
- ✅ Nice UI for non-technical users (not needed yet)

**SpiceDB/Ory Keto** (Zanzibar):

- ❌ Pure ReBAC (need to layer RBAC on top)
- ❌ Steeper learning curve (new data model)
- ✅ Proven at Google scale (but Olympus isn't there yet)

**Custom policy service**:

- ❌ Development time (2-4 weeks to build)
- ❌ Maintenance burden (testing, bugs)
- ✅ Full control (but Oso is flexible enough)

### Why Keep PostgreSQL RLS?

**Defense in depth**: Even if application logic has bugs, RLS prevents cross-tenant data leaks

**Simple and reliable**: Basic `organization_id` filtering is easy to verify

**No performance overhead**: RLS is evaluated by PostgreSQL, not application

**Compliance-friendly**: Database-level enforcement for audits

## Consequences

### Positive

- **Centralized authorization**: All permission logic in one place (`.polar` files)
- **Auditable**: "Who can access this space?" queries built-in
- **Testable**: Policy testing framework prevents permission bugs
- **Declarative**: Easy to reason about and review
- **Flexible**: Supports RBAC, ReBAC, and ABAC in one system
- **Future-proof**: Can add SSO role mapping, custom roles, compliance rules
- **Developer-friendly**: FastAPI decorators and GraphQL helpers

### Negative

- **Learning curve**: Team needs to learn Polar policy language (mitigated by good docs)
- **External dependency**: Oso library (but open-source with MIT license)
- **Performance overhead**: Policy evaluation adds latency (mitigated by caching)
- **Migration effort**: Need to refactor existing raw SQL checks (2-4 weeks)

### Risks and Mitigations

| Risk                                       | Mitigation                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Oso policy bugs allow unauthorized access  | Comprehensive policy test suite + PostgreSQL RLS as backup       |
| Performance degradation from policy checks | Implement caching for policy decisions, monitor with LangSmith   |
| Oso library becomes unmaintained           | Oso is well-funded and widely used; fallback to custom if needed |
| Team struggles with Polar syntax           | Training session + pair programming for first policies           |
| Incomplete migration leaves security gaps  | Phased rollout with audit logging to catch permission failures   |

## Implementation Plan

### Phase 1: Foundation (Week 1-2, ~8 points)

- [ ] Install Oso library (`poetry add oso`)
- [ ] Create `policies/` directory structure
- [ ] Write basic policies for organizations and spaces
- [ ] Create `AuthorizationService` wrapper
- [ ] Add FastAPI decorator: `@require_permission("read", space_getter)`
- [ ] Add GraphQL helper: `async def authorize(user, action, resource)`

### Phase 2: Core Migration (Week 3-4, ~13 points)

- [ ] Migrate organization membership checks to Oso
- [ ] Migrate space membership checks to Oso
- [ ] Add document-level permissions
- [ ] Add database connection permissions
- [ ] Implement audit logging integration

### Phase 3: Testing & Validation (Week 5-6, ~8 points)

- [ ] Write comprehensive policy test suite
- [ ] Load test policy evaluation performance
- [ ] Add caching for frequently-checked permissions
- [ ] Security audit of all permission checks
- [ ] Documentation: "How to add new permissions"

### Phase 4: Advanced Features (Week 7-8+, ~13 points - Future)

- [ ] Custom roles per organization
- [ ] Attribute-based rules (if needed for compliance)
- [ ] Admin UI: "Why can't I access this?"
- [ ] SSO role mapping integration
- [ ] Team-based permissions (if Teams feature added)

**Total Estimate**: ~42 points (~40-60 hours)

### File Structure

```
apps/api/
├── app/
│   ├── auth/
│   │   ├── authorization.py         # Oso service, decorators, helpers
│   │   └── permissions.py           # Permission constants
│   ├── policies/                    # NEW
│   │   ├── organization.polar       # Organization permissions
│   │   ├── space.polar              # Space permissions
│   │   ├── document.polar           # Document permissions
│   │   ├── database_connection.polar # DB connection permissions
│   │   └── README.md                # Policy documentation
│   └── tests/
│       └── policies/                # NEW
│           ├── test_organization.py
│           ├── test_space.py
│           └── test_document.py
```

## References

### Research Sources

- [RBAC vs ABAC vs PBAC: Understanding Access Control Models in 2025](https://www.osohq.com/learn/rbac-vs-abac-vs-pbac)
- [RBAC, ABAC, and ReBAC - Differences and Scenarios](https://www.aserto.com/blog/rbac-abac-and-rebac-differences-and-scenarios)
- [Best Permit.io Alternatives & Competitors in 2025](https://permify.co/post/permit-alternatives/)
- [Top 21 Authorization Systems and Tools for 2025](https://www.osohq.com/learn/best-authorization-tools-and-software)
- [How to Choose the Right Authorization Model for Multi-Tenant SaaS](https://auth0.com/blog/how-to-choose-the-right-authorization-model-for-your-multi-tenant-saas-application/)
- [Postgres RLS Implementation Guide - Best Practices](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [Top 5 Google Zanzibar open-source implementations](https://workos.com/blog/top-5-google-zanzibar-open-source-implementations-in-2024)

### Documentation

- [Oso Documentation](https://docs.osohq.com/)
- [Oso Python Library](https://docs.osohq.com/python/guides/quickstart)
- [Polar Policy Language Reference](https://docs.osohq.com/reference/polar/polar-syntax)
- [Building Authorization with Oso](https://www.osohq.com/learn/authorization)

### Related ADRs

- [ADR-010: HTTP-Only Cookie Authentication](./010-http-only-cookie-authentication.md) - Auth token management
- [ADR-012: Error Handling and Observability](./012-error-handling-and-observability.md) - Audit logging
- [HYBRID_ARCHITECTURE.md](../HYBRID_ARCHITECTURE.md) - Organization context management

## Approval

**Decision**: ⏳ Proposed
**Date**: 2025-12-24
**Needs Approval From**:

- [ ] Engineering Lead
- [ ] Security/Compliance (if applicable)

**Revisit Date**: After Phase 1 implementation (validate performance and DX)

---

## Next Steps

1. **Create Linear ticket** for implementation tracking
2. **Schedule team training** on Oso and Polar syntax
3. **Set up development environment** with Oso library
4. **Write first policies** for organizations and spaces
5. **Implement Phase 1** (Foundation) over 1-2 weeks
6. **Review and iterate** on policy patterns before full migration

---

_Last Updated: 2025-12-24_
_Author: Engineering Team (via research investigation)_
