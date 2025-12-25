# ADR-013: Authorization System - SpiceDB Migration

**Status**: Proposed
**Date**: 2025-12-25
**Deciders**: Engineering Team
**Supersedes**: [ADR-012: Access Control and Authorization Architecture](./012-access-control-authorization.md) (Oso deprecated)
**Related**: LOG-246 (Authorization Implementation), LOG-245 (Invitations), LOG-218 (Access Control Epic)

## Context

Olympus is a multi-tenant SaaS platform that requires sophisticated authorization across multiple dimensions.

### Previous Decision (ADR-012)

On 2025-12-24, we decided to use **Oso** as our authorization system (see [ADR-012](./012-access-control-authorization.md)). However, on 2025-12-25, we discovered that **Oso's open-source library was deprecated in December 2023**, with the company pivoting to a managed cloud service.

### Current State

- **ADR-012 Recommendation**: Oso Policy Engine (now deprecated)
- **Phase 1 Implementation**: Began implementing Oso before discovering deprecation
- **Inline Permission Checks**: Scattered SQL queries for authorization still exist
- **Technical Debt**: Need to pivot to a maintained, open-source solution

### Requirements

1. **Multi-Tenant Isolation**: Organizations as tenant boundaries
2. **Hierarchical Access Control**: Organization → Spaces → Documents
3. **Flexible Role Models**:
   - **RBAC**: Organization roles (OWNER, ADMIN, MEMBER, VIEWER)
   - **ReBAC**: Space membership and relationships
   - **ABAC**: Subscription tiers, time-based access
4. **Time-Based Permissions**: Temporary access, expiration
5. **Subscription/Pricing Tiers**: Feature gating by plan level
6. **AI-Powered Features**: Document RAG, database queries (require fine-grained control)
7. **Invitation System**: Temporary pre-authorization state

### Technical Constraints

- **Stack**: Python/FastAPI, SQLAlchemy, Supabase PostgreSQL
- **Existing Models**: User, Organization, Space, Document already defined
- **Development Timeline**: Need production-ready solution within 2-3 sprints

### Evaluation Criteria

1. **Open Source or Generous Free Tier**: Avoid vendor lock-in, support prototyping
2. **Centralized Declarative Authorization**: Policy/schema files (not scattered code)
3. **Active Maintenance**: Regular 2025 releases, community support
4. **Python/FastAPI Integration**: First-class SDK and examples
5. **Expressive Language**: Readable, auditable policies
6. **Scalability**: Multi-tenant SaaS at scale
7. **Developer Experience**: Learning curve, documentation quality

## Decision

We will adopt **Authzed SpiceDB** as our authorization system for the following reasons:

### Primary: SpiceDB Open Source

- **License**: Apache 2.0 (perpetual open source)
- **Deployment**: Self-hosted initially (Docker Compose for dev, K8s for production)
- **Managed Option**: Can migrate to managed service ($2/hr) if operational overhead increases

### Why SpiceDB Over Alternatives

**vs. Oso Cloud**:

- ❌ Oso: OSS deprecated (vendor lock-in risk)
- ✅ SpiceDB: Apache 2.0, no vendor dependency
- ❌ Oso: Free tier limits unclear
- ✅ SpiceDB: Fully free self-hosted option

**vs. Cerbos**:

- ✅ Cerbos: Easier policy-based approach
- ✅ SpiceDB: More mature ReBAC for complex relationships
- ❌ Cerbos: Smaller community, less documentation
- ✅ SpiceDB: Mature ecosystem, extensive examples

**vs. OpenFGA**:

- ✅ OpenFGA: CNCF sandbox project (governance)
- ✅ SpiceDB: More mature (earlier release, larger community)
- ❌ OpenFGA: Auth0 ecosystem dependency
- ✅ SpiceDB: Vendor-neutral

**vs. Permify**:

- ❌ Permify: Recent FusionAuth acquisition (uncertainty)
- ✅ SpiceDB: Independent, stable governance
- ❌ Permify: Less mature documentation
- ✅ SpiceDB: Battle-tested at scale

### Key Features Leveraged

1. **Schema Language** (`.zed` files):

```zed
definition user {}

definition organization {
  relation owner: user
  relation admin: user
  relation member: user
  relation viewer: user

  // Hierarchical permissions
  permission manage_settings = owner + admin
  permission invite_member = owner + admin
  permission remove_member = owner + admin
  permission view = viewer + member + admin + owner
}

definition space {
  relation organization: organization
  relation owner: user
  relation editor: user
  relation viewer: user

  // Inherit org permissions
  permission manage = owner + organization->admin
  permission write = editor + manage
  permission read = viewer + write + organization->member
}

definition document {
  relation space: space
  relation uploader: user

  // Space-based permissions
  permission read = space->read
  permission update = uploader + space->write
  permission delete = uploader + space->manage
}
```

2. **Caveats for ABAC**:

```zed
caveat has_pro_subscription(user_tier string) {
  user_tier == "pro" || user_tier == "enterprise"
}

caveat within_trial_period(trial_end timestamp) {
  now() < trial_end
}

definition advanced_feature {
  relation user: user with has_pro_subscription | within_trial_period
}
```

3. **Relationship Expiration** (v1.40+):

```python
# Temporary support access (24-hour expiration)
client.write_relationships([
    WriteRelationshipRequest(
        resource=ObjectReference(object_type="organization", object_id="org123"),
        relation="support_access",
        subject=SubjectReference(object=ObjectReference(
            object_type="user", object_id="support_user456"
        )),
        optional_expiration=Timestamp(seconds=int(time.time()) + 86400)  # 24h
    )
])
```

4. **Python Integration**:

```python
from authzed.api.v1 import Client, CheckPermissionRequest, ObjectReference, SubjectReference

class SpiceDBService:
    """Centralized authorization service using SpiceDB."""

    def __init__(self, endpoint: str, token: str):
        self.client = Client(endpoint, token)

    async def is_allowed(
        self,
        user_id: str,
        permission: str,
        resource_type: str,
        resource_id: str,
        context: dict | None = None
    ) -> bool:
        """Check if user has permission on resource."""
        response = self.client.permissions_service.check_permission(
            CheckPermissionRequest(
                resource=ObjectReference(
                    object_type=resource_type,
                    object_id=resource_id
                ),
                permission=permission,
                subject=SubjectReference(
                    object=ObjectReference(
                        object_type="user",
                        object_id=user_id
                    )
                ),
                context=context or {}
            )
        )

        return response.permissionship == PermissionshipValue.HAS_PERMISSION
```

## Consequences

### Positive

1. **Open Source Freedom**:
   - No vendor lock-in
   - Can self-host indefinitely
   - Full control over upgrades
   - Apache 2.0 license perpetual

2. **Mature Zanzibar Implementation**:
   - Google Zanzibar paper-compliant
   - Battle-tested at scale (Airbnb, Carta, Netflix)
   - Strong consistency guarantees

3. **Flexible Authorization Models**:
   - RBAC via schema patterns
   - ReBAC native (relationships)
   - ABAC via caveats (CEL expressions)
   - Time-based via relationship expiration

4. **Multi-Tenant Architecture Fit**:
   - Perfect for org → space → document hierarchy
   - Built-in tenant isolation via relationships
   - Subscription tiers via caveats

5. **Production-Ready Options**:
   - Self-hosted (Docker/K8s)
   - Managed service option available
   - Credits program for early-stage startups
   - Horizontal scaling built-in

6. **Strong Python Ecosystem**:
   - Official `authzed-py` library
   - gRPC and HTTP/JSON APIs
   - FastAPI integration examples
   - Active community support

7. **Operational Excellence**:
   - Prometheus metrics out-of-box
   - OpenTelemetry tracing
   - Multiple storage backends (PostgreSQL, CockroachDB, MySQL)
   - High availability clustering

### Negative

1. **Learning Curve**:
   - Zanzibar concepts (relationships, caveats)
   - Different paradigm from policy-based systems
   - **Mitigation**: Comprehensive onboarding docs, start with simple RBAC

2. **No Direct SQLAlchemy Integration**:
   - Can't filter at ORM level like Oso Cloud
   - Must build authorization service layer
   - **Mitigation**: Pre-filter IDs via SpiceDB, fetch via SQLAlchemy

3. **Relationship Synchronization**:
   - Must keep SpiceDB relationships in sync with PostgreSQL
   - **Mitigation**: Database triggers, event-driven architecture (Supabase triggers)

4. **Managed Service Cost**:
   - $2/hr (~$1,440/month) if using managed service
   - **Mitigation**: Self-host in dev/staging, apply for credits, evaluate cost vs. ops

5. **Migration Effort**:
   - Must translate Oso `.polar` to SpiceDB `.zed`
   - Replace all inline permission checks
   - **Mitigation**: Phased migration, similar concepts make translation straightforward

### Neutral

1. **Multiple Deployment Options**:
   - Flexibility is good, but requires operational decisions
   - **Plan**: Start self-hosted, migrate to managed if needed

2. **Graph-Based Model**:
   - Different from policy-based systems
   - **Impact**: Requires mental model shift, but more powerful for relationships

## Implementation Plan

### Phase 1: Foundation (3 points)

**Goal**: SpiceDB integration, schema design

- Install SpiceDB (Docker Compose for development)
- Design `.zed` schema for organizations, spaces, documents
- Create Python authorization service wrapper
- Write helper functions for common patterns

**Deliverables**:

- `docker-compose.yml` with SpiceDB service
- `apps/api/app/policies/olympus.zed` schema file
- `apps/api/app/services/spicedb_service.py` integration layer

### Phase 2: Relationship Management (4 points)

**Goal**: Sync relationships with PostgreSQL

- Database triggers for automatic relationship writes
- Event handlers for entity creation (org, space, document)
- Relationship cleanup on entity deletion
- Migration script for existing data

**Deliverables**:

- Supabase triggers for relationship sync
- Migration script: `sync_existing_entities_to_spicedb.py`

### Phase 3: Replace Inline Checks (4 points)

**Goal**: Migrate all permission checks to SpiceDB

- Replace organization permission checks
- Replace space permission checks
- Replace document permission checks
- Update invitation system with pre-authorization

**Deliverables**:

- No inline SQL permission checks remaining
- All GraphQL mutations use SpiceDB authorization

### Phase 4: Advanced Features (2 points)

**Goal**: Implement time-based access and subscription tiers

- Caveats for subscription tier checks
- Relationship expiration for temporary access
- Invitation pre-authorization patterns

**Deliverables**:

- Subscription tier enforcement via caveats
- Temporary support access implementation
- Invitation flow with SpiceDB

**Total Effort**: 13 points (~15-18 hours)

## Rollback Strategy

If SpiceDB proves unsuitable:

1. **Oso Cloud Fallback**:
   - Excellent SQLAlchemy integration
   - Accept vendor lock-in trade-off
   - Migration: Similar concepts (authorization queries)

2. **Cerbos Fallback**:
   - Policy-based approach (easier learning curve)
   - Better for RBAC-heavy scenarios
   - Migration: Translate `.zed` to YAML policies

3. **Full Rollback**:
   - Keep inline SQL checks as backup
   - Introduce abstraction layer to swap implementations
   - **Prevention**: Implement authorization service interface

## Monitoring and Success Criteria

### Performance Metrics

- Authorization check latency p95 < 10ms
- Authorization check latency p99 < 50ms
- Throughput > 1000 checks/second

### Operational Metrics

- Relationship sync lag < 1 second
- SpiceDB uptime > 99.9%
- Zero authorization bypass incidents

### Developer Experience Metrics

- Policy changes deployed < 5 minutes
- New permission rules < 30 minutes to implement
- Team confidence score > 8/10 after 1 month

## References

### Research Documents

- [Authorization Solutions Research 2025](../research/authorization-solutions-2025.md) - Full analysis
- [SpiceDB Documentation](https://authzed.com/docs/spicedb/getting-started/discovering-spicedb)
- [Zanzibar Paper](https://research.google/pubs/pub48190/) - Google's consistency model

### Related ADRs

- [ADR-001: State Management](./001-state-management.md) - React Query for server state
- [ADR-002: AI Orchestration](./002-ai-orchestration.md) - LangChain/LangGraph patterns

### Linear Tickets

- [LOG-246](https://linear.app/logarithmic/issue/LOG-246) - Oso Implementation (UPDATE NEEDED)
- [LOG-245](https://linear.app/logarithmic/issue/LOG-245) - Organization Invitations
- [LOG-218](https://linear.app/logarithmic/issue/LOG-218) - Access Control Parent Epic

## Approval

**Proposed By**: Engineering Team
**Date**: 2025-12-25
**Status**: Awaiting approval

**Approvers**:

- [ ] Technical Lead
- [ ] Product Manager
- [ ] Engineering Team (consensus)

## Updates

- **2025-12-25**: Initial draft after Oso deprecation discovery
- _Future updates will be appended here_
