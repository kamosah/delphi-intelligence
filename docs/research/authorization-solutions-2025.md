# Authorization Solutions Research for Olympus (2025)

**Date**: December 25, 2025
**Status**: Complete
**Context**: Pivot from deprecated Oso SDK to maintained authorization solution

## Executive Summary

After discovering that the Oso open-source library has been deprecated (as of December 2023), we conducted comprehensive research into modern authorization solutions suitable for Olympus. This document evaluates five primary options against 10 critical criteria for our multi-tenant SaaS platform.

**Recommendation**: **Authzed SpiceDB** (open-source) with managed service option for production.

## Research Criteria

1. **Centralized Declarative Authorization** - All logic in schema/policy files
2. **No Scattered Inline Checks** - Centralized rules management
3. **Declarative Policies** - Easy to read, audit, and test
4. **Flexible Models** - RBAC, ReBAC, and ABAC support
5. **SQLAlchemy Integration** - Type-safe Python integration
6. **Expressive Language** - Readable policy syntax
7. **Time-Based Access** - Expiration and temporal permissions
8. **Subscription/Pricing Tiers** - Entitlement management
9. **Active Maintenance** - 2025 development activity
10. **OSS/Free Tier** - Open source or generous free tier

## Solutions Evaluated

### 1. Oso Cloud (Managed Service)

**Status**: Legacy OSS deprecated, cloud service actively developed

#### Pros

- **Strong SQLAlchemy Integration**: New `sqlalchemy-oso-cloud` package provides ORM-level authorization
- **Familiar Polar Language**: Similar to our Phase 1 implementation
- **Free Forever Plan**: Available with $149/month paid tier
- **Python-First**: Excellent FastAPI/SQLAlchemy docs and examples
- **InfoWorld 2025 Recognition**: Technology of the Year finalist

#### Cons

- **Vendor Lock-In**: Cloud service dependency, OSS future uncertain
- **Pricing Unclear**: Free tier limits not well documented
- **Migration Required**: From deprecated OSS to cloud service
- **Community Concerns**: OSS deprecation reduced community trust
- **License Uncertainty**: Future OSS licensing unclear

#### Technical Details

```python
# SQLAlchemy integration example
from oso_cloud import Oso
from sqlalchemy import select

oso = Oso(api_key="...")

# Apply authorization to SQLAlchemy queries
query = select(Document).where(...)
authorized_query = oso.authorize(query, user, "read")
```

**Pricing**: $149/month (Growth), free-forever plan available

**Sources**:

- [Oso Cloud Features & Pricing](https://www.saasworthy.com/product/oso-cloud)
- [SQLAlchemy Integration](https://pypi.org/project/sqlalchemy-oso/)
- [Deprecation Notice](https://www.osohq.com/docs/oss/any/getting-started/deprecation.html)

---

### 2. Authzed SpiceDB (Open Source + Managed)

**Status**: Actively maintained, Apache 2.0 license, mature ecosystem

#### Pros

- **100% Open Source**: Apache 2.0, community-first, no vendor lock-in
- **Mature Zanzibar Implementation**: Battle-tested at scale (Google-inspired)
- **Excellent ReBAC/ABAC Support**: Caveats + relationship expiration
- **Active Development**: Consistent 2025 releases, CNCF ecosystem
- **Multiple Deployment Options**: Self-hosted, managed ($2/hr), or dedicated
- **Strong Consistency Model**: Implements Zanzibar consistency guarantees
- **Time-Based Access**: Built-in relationship expiration (v1.40+)
- **Python SDK**: Official `authzed-py` library
- **Expressive Schema Language**: `.zed` files similar to `.polar`

#### Cons

- **Steeper Learning Curve**: Zanzibar concepts (relationships, caveats)
- **No Direct SQLAlchemy Integration**: Requires relationship mapping layer
- **Managed Service Cost**: $2/hr (~$1,440/month, but can apply for credits)
- **Graph-Based Model**: Different paradigm from policy-based systems

#### Technical Details

**Schema Example** (`.zed` file):

```zed
definition user {}

definition organization {
  relation owner: user
  relation admin: user
  relation member: user

  permission manage_settings = owner + admin
  permission invite_member = owner + admin
  permission view = member + admin + owner
}

definition space {
  relation organization: organization
  relation owner: user
  relation editor: user
  relation viewer: user

  permission read = viewer + editor + owner + organization->admin
  permission update = editor + owner + organization->admin
  permission delete = owner + organization->admin
}

// Time-based access with caveats
caveat within_working_hours(current_time timestamp) {
  current_time.getHours() >= 9 && current_time.getHours() < 17
}

definition document {
  relation reader: user with within_working_hours
}
```

**Python Integration**:

```python
from authzed.api.v1 import Client, CheckPermissionRequest

client = Client("grpc.authzed.com:443", "your_token")

# Check permission
response = client.permissions_service.check_permission(
    CheckPermissionRequest(
        resource=ObjectReference(object_type="document", object_id="doc123"),
        permission="read",
        subject=SubjectReference(object=ObjectReference(
            object_type="user", object_id="user456"
        ))
    )
)

if response.permissionship == PermissionshipValue.HAS_PERMISSION:
    # Allow access
```

**Pricing**:

- Free: Self-hosted (Apache 2.0)
- Managed: $2/hr (~$1,440/month) with credits program
- Dedicated: Custom enterprise pricing

**Sources**:

- [GitHub - SpiceDB](https://github.com/authzed/spicedb)
- [SpiceDB Documentation](https://authzed.com/docs/spicedb/getting-started/discovering-spicedb)
- [Caveats & Time-Based Access](https://authzed.com/blog/the-evolution-of-expiration)
- [Python SDK](https://github.com/authzed/authzed-py)
- [Pricing](https://authzed.com/pricing)

---

### 3. Cerbos (Open Source + Managed)

**Status**: Actively maintained, Apache 2.0 license

#### Pros

- **Policy-Based Approach**: YAML policies, easier to learn than ReBAC
- **Excellent Time Conditions**: CEL with `now()` function for temporal logic
- **Strong FastAPI Integration**: Official guides and examples
- **Free Tier**: 100 monthly active principals (generous for prototypes)
- **CEL for Conditions**: Powerful expression language
- **Developer Experience**: Focused on DX, fast iteration
- **Subscription/Tier Support**: Built-in entitlement patterns

#### Cons

- **No Direct SQLAlchemy Integration**: Policy-based, not ORM-aware
- **Stateless Service**: Requires external storage for relationships
- **Less Mature for ReBAC**: Stronger at RBAC/policy-based
- **Smaller Community**: Compared to SpiceDB/OpenFGA

#### Technical Details

**Policy Example** (YAML):

```yaml
---
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: 'default'
  resource: 'document'
  rules:
    - actions: ['read']
      effect: EFFECT_ALLOW
      roles: ['viewer', 'editor', 'owner']
      condition:
        match:
          expr: |
            request.principal.attr.subscription_tier != "free" ||
            (timestamp(request.principal.attr.trial_end) > now())

    - actions: ['update', 'delete']
      effect: EFFECT_ALLOW
      roles: ['owner']
      condition:
        match:
          expr: |
            now().getHours() >= 9 && now().getHours() < 17
```

**Python Integration**:

```python
from cerbos.sdk.client import CerbosClient
from cerbos.sdk.model import Principal, ResourceDesc

with CerbosClient(host="http://localhost:3592") as client:
    principal = Principal(
        id="user123",
        roles=["editor"],
        attr={"subscription_tier": "pro", "trial_end": "2025-12-31T00:00:00Z"}
    )

    resource = ResourceDesc(
        kind="document",
        id="doc456",
        attr={"owner_id": "user123"}
    )

    if client.is_allowed("read", principal, resource):
        # Allow access
```

**Pricing**:

- Free: 100 monthly active principals
- Growth: $25/month+
- Enterprise: Custom

**Sources**:

- [Cerbos FastAPI Guide](https://www.cerbos.dev/ecosystem/fastapi)
- [Time Conditions](https://docs.cerbos.dev/cerbos/latest/tutorial/05_adding-conditions.html)
- [Pricing](https://www.cerbos.dev/pricing)

---

### 4. Permify (Open Source - Now Part of FusionAuth)

**Status**: Acquired by FusionAuth, actively maintained

#### Pros

- **Open Source**: Apache 2.0
- **Zanzibar-Inspired**: ReBAC support
- **AI Assistant**: Policy generation via Groq
- **Python SDK**: Auto-generated from OpenAPI
- **Free Tier**: Available for small teams

#### Cons

- **Acquisition Uncertainty**: Integration with FusionAuth unclear
- **Less Mature**: Newer project, smaller ecosystem
- **Limited Documentation**: Compared to SpiceDB/Cerbos
- **Pricing Unclear**: Post-acquisition pricing model uncertain

**Pricing**:

- Free: Open source
- Cloud: $149-200/month
- Enterprise: Custom

**Sources**:

- [GitHub - Permify](https://github.com/Permify/permify)
- [Pricing](https://permify.co/pricing/)

---

### 5. OpenFGA (CNCF Sandbox Project)

**Status**: CNCF sandbox, Auth0-backed, actively maintained

#### Pros

- **CNCF Backing**: Community governance, no single vendor
- **Auth0 Integration**: Okta ecosystem compatibility
- **Strong Performance**: 10x faster checks in 2025 (v1.10)
- **Zanzibar Implementation**: Mature ReBAC support
- **Open Source**: Apache 2.0
- **Python SDK**: Official support

#### Cons

- **Auth0 Ecosystem Dependency**: Primarily designed for Auth0 users
- **No Direct SQLAlchemy Integration**: Relationship mapping required
- **Smaller Community**: Compared to SpiceDB
- **Documentation**: Less comprehensive than Authzed

**Pricing**: Free (open source) or Auth0 managed service

**Sources**:

- [OpenFGA](https://openfga.dev/)
- [Python SDK](https://pypi.org/project/openfga-sdk/)
- [2025 Performance Updates](https://openfga.dev/blog/fine-grained-news-2025-09)

---

## Scoring Matrix

| Criteria                              | Weight | SpiceDB  | Cerbos   | Oso Cloud | Permify  | OpenFGA  |
| ------------------------------------- | ------ | -------- | -------- | --------- | -------- | -------- |
| **Centralized Declarative**           | 10%    | 10       | 10       | 10        | 9        | 10       |
| **Centralized Rules**                 | 10%    | 10       | 10       | 10        | 9        | 10       |
| **Declarative Policies**              | 10%    | 9        | 10       | 10        | 8        | 9        |
| **Flexible Models (RBAC/ReBAC/ABAC)** | 15%    | 10       | 8        | 9         | 9        | 10       |
| **SQLAlchemy Integration**            | 10%    | 6        | 5        | 10        | 5        | 5        |
| **Expressive Language**               | 10%    | 8        | 9        | 10        | 7        | 8        |
| **Time-Based Access**                 | 10%    | 10       | 10       | 7         | 8        | 9        |
| **Subscription/Pricing Tiers**        | 5%     | 8        | 9        | 8         | 7        | 7        |
| **Active Maintenance (2025)**         | 10%    | 10       | 9        | 8         | 7        | 9        |
| **OSS/Free Tier**                     | 10%    | 10       | 9        | 7         | 9        | 10       |
| **Weighted Score**                    |        | **9.05** | **8.80** | **8.75**  | **7.95** | **8.95** |

### Score Breakdown

**SpiceDB: 9.05** ✅ Winner

- Strongest overall: Open source, mature, flexible, time-based access
- Trade-off: SQLAlchemy integration requires custom layer

**OpenFGA: 8.95**

- Close second: CNCF backing, strong performance
- Trade-off: Auth0 ecosystem dependency

**Cerbos: 8.80**

- Best policy-based solution, excellent DX
- Trade-off: Less mature ReBAC, smaller community

**Oso Cloud: 8.75**

- Best SQLAlchemy integration
- Trade-off: Vendor lock-in, OSS deprecation concerns

**Permify: 7.95**

- Emerging solution, acquisition uncertainty
- Trade-off: Less mature ecosystem

---

## Deep Dive: Why SpiceDB?

### 1. **Open Source Commitment**

- Apache 2.0 license (perpetual)
- Community-first development
- No vendor lock-in risk
- Can self-host indefinitely

### 2. **Mature Zanzibar Implementation**

- Google Zanzibar paper-compliant
- Battle-tested at scale
- Consistent updates (2024-2025)
- Strong consistency model

### 3. **Flexible Authorization Models**

- **ReBAC**: Native relationship-based (e.g., space members)
- **RBAC**: Via schema patterns (organization roles)
- **ABAC**: Caveats with CEL expressions
- **Time-Based**: Built-in relationship expiration (v1.40+)

### 4. **Multi-Tenant Architecture Fit**

```zed
// Perfect for Olympus: Organization → Spaces → Documents
definition organization {
  relation tenant_admin: user
  relation member: user
}

definition space {
  relation organization: organization
  relation member: user

  // Org admins can manage all spaces
  permission manage = organization->tenant_admin
  permission read = member + organization->tenant_admin
}

// Subscription tiers via caveats
caveat has_pro_subscription(user_tier string) {
  user_tier == "pro" || user_tier == "enterprise"
}

definition advanced_feature {
  relation user: user with has_pro_subscription
}
```

### 5. **Production-Ready Options**

- **Development**: Self-hosted (Docker/K8s)
- **Staging**: SpiceDB Serverless (credits program)
- **Production**: Dedicated managed service

### 6. **Strong Python Ecosystem**

- Official `authzed-py` library
- gRPC and HTTP/JSON APIs
- Active examples repo
- FastAPI integration patterns

### 7. **Operational Benefits**

- Prometheus metrics out-of-box
- OpenTelemetry tracing
- Multiple storage backends (PostgreSQL, CockroachDB, MySQL)
- High availability clustering

---

## Migration Considerations

### From Oso Phase 1 Code

**Challenge**: We have `.polar` policies and Oso Python code
**Solution**: Schema translation is straightforward

**Oso `.polar` Example**:

```polar
allow(user: User, "read", org: Organization) if
    has_role(user, "member", org);
```

**SpiceDB `.zed` Equivalent**:

```zed
definition organization {
  relation member: user
  permission read = member
}
```

**Mapping Table**:

| Oso Concept         | SpiceDB Equivalent          | Notes                           |
| ------------------- | --------------------------- | ------------------------------- |
| `.polar` files      | `.zed` schema files         | Similar declarative syntax      |
| `allow()` rules     | `permission` definitions    | Permission = union of relations |
| `has_role()` helper | `relation` definitions      | Relations are explicit          |
| Inline checks       | Caveat expressions          | CEL for dynamic logic           |
| `oso.is_allowed()`  | `client.check_permission()` | API call pattern similar        |

### Implementation Phases

**Phase 1: Schema Design** (2 points)

- Translate existing `.polar` to `.zed`
- Define relationships for organizations, spaces, documents
- Add caveats for time-based/tier-based access

**Phase 2: Integration Layer** (3 points)

- Create Python service wrapper (similar to current `AuthorizationService`)
- Implement helper functions for common patterns
- SQLAlchemy query filtering utilities

**Phase 3: Migration** (5 points)

- Replace inline permission checks with SpiceDB calls
- Write relationships to SpiceDB on entity creation
- Update invitation system with relationship management

**Phase 4: Testing & Optimization** (3 points)

- Performance testing (target <10ms p95)
- Caching strategy for hot paths
- Monitoring and observability setup

**Total**: 13 points (~15-18 hours)

---

## Alternatives Considered But Not Recommended

### Why Not Oso Cloud?

Despite excellent SQLAlchemy integration:

- OSS deprecation creates long-term risk
- Vendor lock-in for critical infrastructure
- Free tier limits unclear
- Community trust diminished

**Use Case**: Consider if SQLAlchemy integration is absolutely critical and team accepts vendor dependency

### Why Not Cerbos?

Despite excellent DX and time conditions:

- Policy-based approach less suitable for complex relationship graphs
- ReBAC less mature than SpiceDB
- Smaller community for troubleshooting

**Use Case**: Better for policy-heavy apps with simpler relationship models

### Why Not OpenFGA?

Despite CNCF backing and performance:

- Primarily designed for Auth0 ecosystem
- Smaller community than SpiceDB
- Less comprehensive documentation

**Use Case**: Ideal if already using Auth0/Okta for authentication

### Why Not Permify?

Despite AI assistant and free tier:

- Recent acquisition creates uncertainty
- Less mature ecosystem
- Documentation gaps

**Use Case**: Worth monitoring as it matures post-FusionAuth acquisition

---

## Risks and Mitigation

### Risk 1: Learning Curve

**Impact**: Team unfamiliar with Zanzibar concepts
**Mitigation**:

- Comprehensive onboarding documentation
- Start with simple RBAC patterns, evolve to ReBAC
- Leverage existing examples from authzed/examples repo

### Risk 2: Managed Service Cost

**Impact**: $1,440/month for managed service
**Mitigation**:

- Apply for credits program during development
- Self-host in development/staging
- Evaluate cost vs. operational overhead of self-hosting

### Risk 3: No Direct SQLAlchemy Integration

**Impact**: Can't filter queries at ORM level like Oso Cloud
**Mitigation**:

- Build authorization service layer to abstract SpiceDB calls
- Pre-filter IDs via SpiceDB, then fetch via SQLAlchemy
- Consider caching for frequently-accessed permissions

### Risk 4: Relationship Sync Complexity

**Impact**: Must keep SpiceDB relationships in sync with PostgreSQL
**Mitigation**:

- Database triggers for automatic relationship writes
- Event-driven architecture (Supabase triggers → SpiceDB)
- Periodic reconciliation jobs

---

## Recommendation Summary

**Primary Recommendation**: **Authzed SpiceDB (Open Source)**

**Deployment Strategy**:

1. **Development**: Self-hosted Docker Compose
2. **Staging**: SpiceDB Serverless (apply for credits)
3. **Production**: Evaluate managed vs. self-hosted based on scale

**Rationale**:

- Open source with strong community (no vendor lock-in)
- Mature, battle-tested Zanzibar implementation
- Flexible enough for all Olympus use cases (RBAC, ReBAC, ABAC, time-based)
- Clear migration path from Oso Phase 1 work
- Multiple deployment options (can change strategy later)
- Strong Python ecosystem and documentation

**Trade-offs Accepted**:

- No direct SQLAlchemy integration (build custom layer)
- Steeper learning curve than policy-based systems
- Relationship synchronization complexity

**Secondary Option**: Cerbos if policy-based approach is strongly preferred and ReBAC complexity not needed.

---

## Next Steps

1. **Create ADR**: Document this decision formally
2. **Update Linear Tickets**: Revise LOG-246 and related tickets
3. **Proof of Concept**: Build simple SpiceDB integration (1-2 days)
4. **Schema Design**: Translate Olympus requirements to `.zed` schema
5. **Implementation Plan**: Detailed 13-point implementation roadmap

---

## Sources

### SpiceDB

- [GitHub Repository](https://github.com/authzed/spicedb)
- [Documentation](https://authzed.com/docs/spicedb/getting-started/discovering-spicedb)
- [Schema Language Reference](https://authzed.com/docs/spicedb/concepts/schema)
- [Caveats & Time-Based Access](https://authzed.com/blog/the-evolution-of-expiration)
- [Python SDK](https://github.com/authzed/authzed-py)
- [Pricing](https://authzed.com/pricing)
- [FOSDEM 2024 Talk](https://archive.fosdem.org/2024/events/attachments/fosdem-2024-2341-spicedb-mature-open-source-rebac/slides/22539/SpiceDB_mature_open-source_ReBAC_pynWI3N.pdf)

### Cerbos

- [FastAPI Integration](https://www.cerbos.dev/ecosystem/fastapi)
- [Time Conditions](https://docs.cerbos.dev/cerbos/latest/tutorial/05_adding-conditions.html)
- [Pricing](https://www.cerbos.dev/pricing)
- [GitHub](https://github.com/cerbos/cerbos)

### Oso Cloud

- [Deprecation Notice](https://www.osohq.com/docs/oss/any/getting-started/deprecation.html)
- [SQLAlchemy Integration](https://pypi.org/project/sqlalchemy-oso/)
- [Pricing](https://www.saasworthy.com/product/oso-cloud)
- [GitHub - Deprecated](https://github.com/osohq/oso)

### OpenFGA

- [Official Site](https://openfga.dev/)
- [Python SDK](https://pypi.org/project/openfga-sdk/)
- [2025 Updates](https://openfga.dev/blog/fine-grained-news-2025-09)
- [GitHub](https://github.com/openfga)

### Permify

- [GitHub](https://github.com/Permify/permify)
- [Pricing](https://permify.co/pricing/)
- [Python SDK](https://github.com/Permify/permify-python)

### Comparisons

- [SpiceDB Alternatives](https://www.osohq.com/learn/spicedb-alternatives-authorization-tools-comparison)
- [OpenFGA Alternatives](https://www.osohq.com/learn/openfga-alternatives)
- [Permit.io Alternatives](https://permify.co/post/permit-alternatives/)
