# Supabase Usage in Olympus API

## Overview

Olympus uses **only 3 of 11 Supabase services**:

1. **PostgreSQL** - Primary database with pgvector
2. **GoTrue Auth** - JWT-based authentication
3. **Storage** - S3-compatible file storage

**Unused Services** (can be disabled):

- ❌ PostgREST - Auto-generated REST API (we use FastAPI instead)
- ❌ Realtime - WebSocket subscriptions (not implemented yet)
- ❌ Edge Functions - Serverless Deno functions (not used)
- ❌ Analytics - Usage tracking (not needed for development)
- ❌ Inbucket - Email testing (can be optional)
- ❌ Studio - Web UI (optional, can access via cloud)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Olympus API (FastAPI)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │   Auth Service   │  │ Storage Service  │  │ SQLAlchemy│ │
│  │                  │  │                  │  │   Models  │ │
│  └────────┬─────────┘  └────────┬─────────┘  └─────┬─────┘ │
│           │                     │                   │       │
│           ↓                     ↓                   ↓       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              SUPABASE (3 Services)                  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 1. GoTrue Auth    (port: internal)                  │   │
│  │ 2. PostgreSQL     (port: 54322)                     │   │
│  │ 3. Storage        (port: internal via Kong)         │   │
│  │                                                      │   │
│  │ Kong Gateway      (port: 54321) ← All requests      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Service 1: GoTrue Auth (Authentication)

### Purpose

JWT-based user authentication and session management.

### Files Using Auth

- `app/auth/service.py` - Main auth logic
- `app/routes/auth.py` - REST endpoints
- `app/middleware/auth.py` - JWT validation
- `app/supabase_client.py` - Client initialization

### Code Examples

#### Initialize Supabase Client

```python
# app/supabase_client.py
from supabase import Client, create_client
from app.config import settings

def get_admin_client() -> Client:
    """Admin client for user management operations"""
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,  # Has admin privileges
    )

def get_user_client() -> Client:
    """User client for public auth operations"""
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,  # Limited to auth operations
    )
```

#### User Registration

```python
# app/auth/service.py (lines 35-95)
async def register_user(self, email: str, password: str, full_name: str | None = None) -> UserProfile:
    """Register new user with Supabase Auth"""

    # Check if user already exists
    users_response = self.admin_client.auth.admin.list_users()
    users_list = users_response if isinstance(users_response, list) else users_response.data

    if users_list:
        for user in users_list:
            if user.email == email:
                raise HTTPException(
                    status_code=400,
                    detail="User with this email already exists"
                )

    # Create user with Supabase Auth
    user_client = get_user_client()
    response = user_client.auth.sign_up({
        "email": email,
        "password": password,
        "options": {"data": {"full_name": full_name} if full_name else {}},
    })

    if not response.user:
        raise HTTPException(status_code=400, detail="Failed to create user")

    return UserProfile(
        id=response.user.id,
        email=response.user.email or email,
        full_name=full_name,
        role="member",
        is_active=True,
        email_confirmed=response.user.email_confirmed_at is not None,
    )
```

#### User Login

```python
# app/auth/service.py (lines 111-200)
async def login_user(self, email: str, password: str) -> TokenResponse:
    """Authenticate user and return JWT tokens"""

    # Authenticate with Supabase
    user_client = get_user_client()
    response = user_client.auth.sign_in_with_password({
        "email": email,
        "password": password,
    })

    if not response.user or not response.session:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    user = response.user
    session = response.session

    # Create Olympus JWT tokens (embeds Supabase token)
    token_data = {
        "sub": user.id,
        "email": user.email,
        "role": user.user_metadata.get("role", "member"),
        "supabase_token": session.access_token,  # For RLS policies
    }

    access_token = jwt_manager.create_access_token(token_data)
    refresh_token = jwt_manager.create_refresh_token({"sub": user.id})

    # Store in Redis
    await redis_manager.store_refresh_token(user.id, refresh_token, ttl_timedelta)
    await redis_manager.set_session(f"session:{user.id}", {...})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600 * 24,  # 24 hours
    )
```

#### Token Exchange (Supabase → Olympus JWT)

```python
# app/auth/service.py (lines 430-520)
async def exchange_supabase_token(self, supabase_access_token: str) -> TokenResponse:
    """Exchange Supabase session token for Olympus JWT"""

    # Verify Supabase token by fetching user
    admin_client = get_admin_client()
    user_response = admin_client.auth.get_user(supabase_access_token)

    if not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid Supabase token")

    user = user_response.user

    # Create Olympus JWT with embedded Supabase token
    token_data = {
        "sub": user.id,
        "email": user.email,
        "role": user.user_metadata.get("role", "member"),
        "supabase_token": supabase_access_token,  # Embed for RLS
    }

    access_token = jwt_manager.create_access_token(token_data)
    refresh_token = jwt_manager.create_refresh_token({"sub": user.id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
```

### Auth Endpoints

```python
# app/routes/auth.py
POST /auth/register       # Register new user
POST /auth/login          # Login with email/password
POST /auth/logout         # Invalidate session
POST /auth/refresh        # Refresh access token
POST /auth/exchange       # Exchange Supabase token → Olympus JWT
GET  /auth/me             # Get current user profile
POST /auth/sse-token      # Generate SSE streaming token
POST /auth/forgot-password
POST /auth/resend-verification
```

---

## Service 2: PostgreSQL Database

### Purpose

Primary database with Row Level Security (RLS) and pgvector extension for AI embeddings.

### Connection Details

```python
# app/config.py
DATABASE_URL = os.getenv("DATABASE_URL")

# Local:  postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres
# Cloud:  postgresql+asyncpg://postgres.[ref]:[password]@aws-region.pooler.supabase.com:5432/postgres
```

### Key Features Used

#### 1. SQLAlchemy ORM (Not PostgREST)

```python
# app/models/user.py
from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    auth_user_id = Column(UUID(as_uuid=True), unique=True)  # Links to Supabase Auth
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String)
    role = Column(String, default="member")
    is_active = Column(Boolean, default=True)
```

#### 2. Row Level Security (RLS)

```sql
-- Enables database-level authorization
-- Uses auth.uid() from JWT token

-- Example RLS policy (apps/api/alembic/versions/*_add_rls_policies.py)
CREATE POLICY personal_threads_policy ON threads
    FOR SELECT
    USING (
        visibility = 'PERSONAL'
        AND owner_user_id = auth.uid()::uuid
    );
```

#### 3. pgvector for Embeddings

```python
# app/models/document.py
from sqlalchemy import Column
from pgvector.sqlalchemy import Vector

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(1536))  # OpenAI text-embedding-3-small

    # Cosine similarity search
    @classmethod
    def search_similar(cls, query_embedding: list[float], limit: int = 10):
        return session.query(cls).order_by(
            cls.embedding.cosine_distance(query_embedding)
        ).limit(limit)
```

#### 4. Alembic Migrations (Not Supabase Migrations)

```python
# apps/api/alembic/env.py
# Uses SQLAlchemy Alembic, NOT Supabase migration system
# Migrations tracked in _internal.alembic_version table

# Create migration:
alembic revision --autogenerate -m "add users table"

# Apply migrations:
alembic upgrade head
```

### Database Operations

```python
# All database operations use SQLAlchemy, NOT PostgREST
from app.db.session import get_db
from sqlalchemy import select

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()
```

---

## Service 3: Storage (File Uploads)

### Purpose

S3-compatible object storage for documents and user avatars.

### Files Using Storage

- `app/services/storage_service.py` - Upload/delete files
- `app/routes/documents.py` - Document upload endpoint

### Code Examples

#### Initialize Storage Service

```python
# app/services/storage_service.py
from supabase import Client, create_client
from app.config import settings

class StorageService:
    BUCKET_NAME = "documents"
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
        "text/plain",
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # XLSX
    }

    def __init__(self):
        self._client: Client | None = None

    @property
    def client(self) -> Client:
        if self._client is None:
            self._client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
        return self._client
```

#### Upload File

```python
# app/services/storage_service.py (lines 37-82)
async def upload_file(self, file: UploadFile, space_id: UUID, document_id: UUID) -> str:
    """Upload file to Supabase Storage"""

    # Validate file type and size
    self._validate_file(file)

    # Normalize filename to snake_case
    safe_filename = normalize_filename(file.filename or "untitled")

    # Generate path: {space_id}/{document_id}/{safe_filename}
    file_path = f"{space_id}/{document_id}/{safe_filename}"

    # Read file content
    content = await file.read()

    # Upload to Supabase Storage bucket
    self.client.storage.from_(self.BUCKET_NAME).upload(
        path=file_path,
        file=content,
        file_options={
            "content-type": file.content_type or "application/octet-stream",
            "cache-control": "3600",
            "upsert": "false",  # Don't overwrite
        },
    )

    return file_path
```

#### Delete File

```python
# app/services/storage_service.py (lines 84-97)
async def delete_file(self, file_path: str) -> None:
    """Delete file from Supabase Storage"""
    self.client.storage.from_(self.BUCKET_NAME).remove([file_path])
```

#### Get File URL

```python
# app/services/storage_service.py
def get_file_url(self, file_path: str) -> str:
    """Get public URL for file"""
    return self.client.storage.from_(self.BUCKET_NAME).get_public_url(file_path)
```

### Storage Endpoints

```python
# app/routes/documents.py
POST /documents/upload          # Upload document file
DELETE /documents/{id}          # Delete document (and file)
GET /documents/{id}/download    # Get signed download URL
```

### Storage Bucket Configuration

```python
# Bucket: "documents"
# Privacy: Private (requires authentication)
# RLS Enabled: Yes
# Max File Size: 50MB
# Allowed Types: PDF, DOCX, TXT, CSV, XLSX
```

---

## Services NOT Used (Can Disable)

### PostgREST

**What it is**: Auto-generated REST API from PostgreSQL schema
**Why we don't use it**: Olympus has custom FastAPI REST endpoints with business logic
**Disable**: ✅ Safe to disable

### Realtime

**What it is**: WebSocket subscriptions for live database changes
**Why we don't use it**: Not implemented yet (future feature)
**Disable**: ✅ Safe to disable for now

### Edge Functions

**What it is**: Serverless Deno functions
**Why we don't use it**: All serverless logic is in FastAPI
**Disable**: ✅ Safe to disable

### Analytics (Logflare)

**What it is**: Usage analytics and logging
**Why we don't use it**: Not needed for local development
**Disable**: ✅ Safe to disable

### Inbucket (Email)

**What it is**: Email testing server
**Why useful**: Catches emails sent by GoTrue (password reset, verification)
**Disable**: ⚠️ Optional (useful for auth email testing)

### Studio

**What it is**: Web UI for managing Supabase
**Why useful**: Can view database, auth users, storage files
**Disable**: ⚠️ Optional (can use cloud Studio instead)

---

## Configuration Summary

### Environment Variables

```bash
# Required for ALL environments
SUPABASE_URL=http://127.0.0.1:54321  # or https://[project].supabase.co
SUPABASE_ANON_KEY=eyJ...             # For client-side auth operations
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # For admin operations

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

### Supabase Services Ports

```
Kong Gateway:    54321  (Main API endpoint)
PostgreSQL:      54322  (Direct DB access)
Studio:          54323  (Web UI - optional)
Inbucket:        54324  (Email testing - optional)
Analytics:       54327  (Logflare - can disable)
```

---

## Testing with Supabase

### Integration Tests

```python
# tests/fixtures/supabase_local.py
import pytest
from supabase import Client, create_client

@pytest.fixture(scope="session")
def local_supabase_client() -> Client:
    """Real Supabase client for integration tests"""
    return create_client(
        os.getenv("SUPABASE_LOCAL_URL", "http://127.0.0.1:54321"),
        os.getenv("SUPABASE_LOCAL_ANON_KEY")
    )

# tests/integration/test_rest_auth.py
@pytest.mark.integration
async def test_login_success(local_supabase_client):
    # Create user in real Supabase Auth
    auth_result = local_supabase_client.auth.sign_up({
        "email": "test@example.com",
        "password": "password123"
    })

    # Test login via Olympus API
    response = await client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })

    assert response.status_code == 200
    assert "access_token" in response.json()
```

---

## Minimal Supabase Configuration

For development, you can run with just **3 services**:

1. PostgreSQL (database)
2. GoTrue Auth (authentication)
3. Storage (file uploads)

**Memory Usage**: ~600MB (vs 1.8GB with all services)

See `supabase/config.toml` (next section) for optimized configuration.
