# Database Integration & Connector Roadmap

> **Purpose**: Define the database connector architecture and implementation roadmap for Olympus MVP
>
> **Last Updated**: 2025-10-25
>
> **Related Docs**: [HYBRID_ARCHITECTURE.md](HYBRID_ARCHITECTURE.md), [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Connector Roadmap](#connector-roadmap)
3. [Technical Architecture](#technical-architecture)
4. [Connection Management](#connection-management)
5. [Text-to-SQL Pipeline](#text-to-sql-pipeline)
6. [Query Execution](#query-execution)
7. [Security & Authentication](#security--authentication)
8. [Error Handling](#error-handling)
9. [Testing Strategy](#testing-strategy)
10. [Implementation Guide](#implementation-guide)

---

## Overview

### Platform Vision

Olympus MVP is evolving from a document-only intelligence platform to a **hybrid analytics platform** that combines:

- **Structured Data**: SQL databases (PostgreSQL, Snowflake, BigQuery, Redshift)
- **Unstructured Data**: Documents (PDFs, spreadsheets, reports)

### Database Integration Goals

1. **Unified Query Interface**: Single conversational UI for SQL + document queries
2. **Multi-Warehouse Support**: Connect to multiple database types simultaneously
3. **Intelligent Routing**: Automatically route queries to appropriate data sources
4. **Source Transparency**: Clear attribution showing which results came from SQL vs documents
5. **Enterprise Security**: Secure credential management and query isolation

### Architecture Principles

- **Abstraction Layer**: Unified database connector interface for all warehouse types
- **Async-First**: Non-blocking query execution using SQLAlchemy async
- **Connection Pooling**: Efficient connection reuse with configurable limits
- **Schema Caching**: Cache table metadata to reduce warehouse load
- **LLM Integration**: LangChain SQL agent for natural language queries

---

## Connector Roadmap

### Phase 1: Foundation (MVP - Current Sprint)

**Goal**: Establish core database integration using existing PostgreSQL/Supabase connection

**Scope**:

- ✅ PostgreSQL/Supabase connector (leverage existing `apps/api/app/db/session.py`)
- ✅ Basic connection management (reuse existing connection logic)
- 🔄 Connection UI in frontend (new Space creation with DB selection)
- 🔄 Text-to-SQL pipeline with LangChain
- 🔄 GraphQL mutations for database queries
- 🔄 Source-type badges in Threads chat UI

**Timeline**: Current sprint (2 weeks)

**Deliverables**:

- `DatabaseConnection` model (GraphQL schema + SQLAlchemy)
- `TextToSQLAgent` service (LangChain SQL agent)
- `executeDatabaseQuery` GraphQL mutation
- Database connection UI component
- Source badge component for SQL results

### Phase 2: Cloud Warehouses (Post-MVP)

**Goal**: Expand to enterprise cloud data warehouses

**Scope**:

- 🔴 Snowflake connector (`snowflake-sqlalchemy`)
- 🔴 BigQuery connector (`sqlalchemy-bigquery`)
- 🔴 Redshift connector (PostgreSQL-compatible, use `psycopg2`)
- 🔴 Multi-connection support (multiple DBs per Space)
- 🔴 Connection testing and validation
- 🔴 Credential encryption (AWS Secrets Manager or HashiCorp Vault)

**Timeline**: 4-6 weeks post-MVP

**Deliverables**:

- Warehouse-specific connector classes
- Connection wizard UI (multi-step form)
- Connection card components (status, test, edit)
- Encrypted credential storage
- Connection health monitoring

### Phase 3: Advanced Features (Future)

**Goal**: Enterprise-grade database analytics capabilities

**Scope**:

- 🔴 Semantic modeling (Hex-style semantic layer)
- 🔴 Query optimization hints
- 🔴 Result caching (Redis)
- 🔴 Query history and versioning
- 🔴 Scheduled queries
- 🔴 Data lineage tracking
- 🔴 Role-based access control per connection

**Timeline**: 8-12 weeks post-MVP

**Deliverables**:

- Semantic model builder UI
- Query optimization service
- Redis-based result cache
- Query scheduler (Celery)
- Data lineage graph UI

---

## Technical Architecture

### Connector Interface

**Design Pattern**: Abstract base class with warehouse-specific implementations

```python
# apps/api/app/services/database/base_connector.py

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool, QueuePool

class DatabaseConnector(ABC):
    """Abstract base class for database connectors."""

    def __init__(
        self,
        connection_id: str,
        connection_string: str,
        pool_size: int = 5,
        max_overflow: int = 10,
    ):
        self.connection_id = connection_id
        self.connection_string = connection_string
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self._engine: Optional[AsyncEngine] = None

    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the database."""
        pass

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test if connection is valid and return metadata."""
        pass

    @abstractmethod
    async def execute_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Execute SQL query and return results as list of dicts."""
        pass

    @abstractmethod
    async def get_schema(self, schema_name: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve database schema (tables, columns, types)."""
        pass

    async def disconnect(self) -> None:
        """Close database connection."""
        if self._engine:
            await self._engine.dispose()
            self._engine = None
```

### PostgreSQL Connector (Phase 1)

**File**: `apps/api/app/services/database/postgres_connector.py`

```python
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import QueuePool
from .base_connector import DatabaseConnector

class PostgreSQLConnector(DatabaseConnector):
    """PostgreSQL/Supabase connector implementation."""

    async def connect(self) -> None:
        """Create async engine with connection pooling."""
        self._engine = create_async_engine(
            self.connection_string,
            poolclass=QueuePool,
            pool_size=self.pool_size,
            max_overflow=self.max_overflow,
            pool_pre_ping=True,  # Verify connections before use
            echo=False,  # Set to True for SQL logging
        )

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection and return database metadata."""
        if not self._engine:
            await self.connect()

        async with self._engine.connect() as conn:
            # Test query
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()

            # Get database name
            result = await conn.execute(text("SELECT current_database()"))
            db_name = result.scalar()

            return {
                "status": "connected",
                "database": db_name,
                "version": version,
                "connector_type": "postgresql",
            }

    async def execute_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Execute query and return rows as dicts."""
        if not self._engine:
            await self.connect()

        async with self._engine.connect() as conn:
            result = await conn.execute(text(query), params or {})

            # Convert rows to dicts
            columns = result.keys()
            rows = [dict(zip(columns, row)) for row in result.fetchall()]

            return rows

    async def get_schema(self, schema_name: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve PostgreSQL schema information."""
        if not self._engine:
            await self.connect()

        schema_filter = schema_name or 'public'

        query = """
        SELECT
            table_schema,
            table_name,
            column_name,
            data_type,
            is_nullable
        FROM information_schema.columns
        WHERE table_schema = :schema_name
        ORDER BY table_name, ordinal_position
        """

        async with self._engine.connect() as conn:
            result = await conn.execute(text(query), {"schema_name": schema_filter})
            columns = result.fetchall()

        # Group by table
        schema = {}
        for row in columns:
            table = row.table_name
            if table not in schema:
                schema[table] = {
                    "schema": row.table_schema,
                    "columns": [],
                }
            schema[table]["columns"].append({
                "name": row.column_name,
                "type": row.data_type,
                "nullable": row.is_nullable == "YES",
            })

        return schema
```

### Snowflake Connector (Phase 2)

**File**: `apps/api/app/services/database/snowflake_connector.py`

```python
from snowflake.sqlalchemy import URL
from sqlalchemy.ext.asyncio import create_async_engine
from .base_connector import DatabaseConnector

class SnowflakeConnector(DatabaseConnector):
    """Snowflake connector implementation."""

    def __init__(
        self,
        connection_id: str,
        account: str,
        user: str,
        password: str,
        warehouse: str,
        database: str,
        schema: str = "PUBLIC",
        role: Optional[str] = None,
        **kwargs,
    ):
        self.account = account
        self.user = user
        self.password = password
        self.warehouse = warehouse
        self.database = database
        self.schema = schema
        self.role = role

        # Build Snowflake connection URL
        connection_string = URL(
            account=account,
            user=user,
            password=password,
            database=database,
            schema=schema,
            warehouse=warehouse,
            role=role,
        )

        super().__init__(connection_id, str(connection_string), **kwargs)

    async def connect(self) -> None:
        """Create async engine for Snowflake."""
        self._engine = create_async_engine(
            self.connection_string,
            pool_pre_ping=True,
            echo=False,
        )

    async def test_connection(self) -> Dict[str, Any]:
        """Test Snowflake connection."""
        if not self._engine:
            await self.connect()

        async with self._engine.connect() as conn:
            result = await conn.execute(text("SELECT CURRENT_VERSION()"))
            version = result.scalar()

            result = await conn.execute(text("SELECT CURRENT_WAREHOUSE()"))
            warehouse = result.scalar()

            return {
                "status": "connected",
                "database": self.database,
                "warehouse": warehouse,
                "version": version,
                "connector_type": "snowflake",
            }

    # execute_query() and get_schema() similar to PostgreSQL
    # with Snowflake-specific SQL for schema introspection
```

### BigQuery Connector (Phase 2)

**File**: `apps/api/app/services/database/bigquery_connector.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine
from .base_connector import DatabaseConnector

class BigQueryConnector(DatabaseConnector):
    """Google BigQuery connector implementation."""

    def __init__(
        self,
        connection_id: str,
        project_id: str,
        credentials_path: str,
        dataset: Optional[str] = None,
        **kwargs,
    ):
        self.project_id = project_id
        self.credentials_path = credentials_path
        self.dataset = dataset

        # Build BigQuery connection URL
        connection_string = f"bigquery://{project_id}"
        if dataset:
            connection_string += f"/{dataset}"

        super().__init__(connection_id, connection_string, **kwargs)

    async def connect(self) -> None:
        """Create async engine for BigQuery."""
        self._engine = create_async_engine(
            self.connection_string,
            connect_args={"credentials_path": self.credentials_path},
            pool_pre_ping=True,
            echo=False,
        )

    async def test_connection(self) -> Dict[str, Any]:
        """Test BigQuery connection."""
        if not self._engine:
            await self.connect()

        async with self._engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))

            return {
                "status": "connected",
                "project": self.project_id,
                "dataset": self.dataset,
                "connector_type": "bigquery",
            }

    # execute_query() and get_schema() with BigQuery-specific SQL
```

---

## Connection Management

### Database Models

**File**: `apps/api/app/models/database_connection.py`

```python
from sqlalchemy import Column, String, JSON, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base

class DatabaseConnection(Base):
    """Model for database connections (Snowflake, BigQuery, etc.)."""

    __tablename__ = "database_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    connector_type = Column(String(50), nullable=False)  # 'postgresql', 'snowflake', 'bigquery', 'redshift'

    # Encrypted credentials (JSON field)
    credentials = Column(JSON, nullable=False)  # Encrypted before storage

    # Connection metadata
    metadata = Column(JSON, nullable=True)  # Database name, warehouse, project, etc.

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    last_tested_at = Column(DateTime(timezone=True), nullable=True)
    last_test_status = Column(String(50), nullable=True)  # 'success', 'failed'

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    space = relationship("Space", back_populates="database_connections")
    queries = relationship("Query", back_populates="database_connection", cascade="all, delete-orphan")
```

### GraphQL Schema

**File**: `apps/api/app/graphql/types/database_connection.py`

```python
import strawberry
from typing import Optional, List
from datetime import datetime

@strawberry.type
class DatabaseConnection:
    id: strawberry.ID
    space_id: strawberry.ID
    name: str
    connector_type: str
    metadata: Optional[str]  # JSON string
    is_active: bool
    last_tested_at: Optional[datetime]
    last_test_status: Optional[str]
    created_at: datetime
    updated_at: datetime

@strawberry.input
class CreateDatabaseConnectionInput:
    space_id: strawberry.ID
    name: str
    connector_type: str  # 'postgresql' | 'snowflake' | 'bigquery' | 'redshift'
    credentials: str  # JSON string (will be encrypted)
    metadata: Optional[str] = None

@strawberry.input
class UpdateDatabaseConnectionInput:
    id: strawberry.ID
    name: Optional[str] = None
    credentials: Optional[str] = None
    is_active: Optional[bool] = None

@strawberry.type
class DatabaseConnectionMutations:
    @strawberry.mutation
    async def create_database_connection(
        self,
        info: Info,
        input: CreateDatabaseConnectionInput,
    ) -> DatabaseConnection:
        """Create a new database connection."""
        # Implementation in resolver
        pass

    @strawberry.mutation
    async def update_database_connection(
        self,
        info: Info,
        input: UpdateDatabaseConnectionInput,
    ) -> DatabaseConnection:
        """Update an existing database connection."""
        pass

    @strawberry.mutation
    async def delete_database_connection(
        self,
        info: Info,
        id: strawberry.ID,
    ) -> bool:
        """Delete a database connection."""
        pass

    @strawberry.mutation
    async def test_database_connection(
        self,
        info: Info,
        id: strawberry.ID,
    ) -> str:  # JSON string with test results
        """Test database connection and return status."""
        pass
```

### Connection Factory

**File**: `apps/api/app/services/database/connector_factory.py`

```python
from typing import Dict, Any
from .base_connector import DatabaseConnector
from .postgres_connector import PostgreSQLConnector
from .snowflake_connector import SnowflakeConnector
from .bigquery_connector import BigQueryConnector

class ConnectorFactory:
    """Factory for creating database connectors."""

    @staticmethod
    def create_connector(
        connection_id: str,
        connector_type: str,
        credentials: Dict[str, Any],
    ) -> DatabaseConnector:
        """Create a connector instance based on type."""

        if connector_type == "postgresql":
            return PostgreSQLConnector(
                connection_id=connection_id,
                connection_string=credentials["connection_string"],
            )

        elif connector_type == "snowflake":
            return SnowflakeConnector(
                connection_id=connection_id,
                account=credentials["account"],
                user=credentials["user"],
                password=credentials["password"],
                warehouse=credentials["warehouse"],
                database=credentials["database"],
                schema=credentials.get("schema", "PUBLIC"),
                role=credentials.get("role"),
            )

        elif connector_type == "bigquery":
            return BigQueryConnector(
                connection_id=connection_id,
                project_id=credentials["project_id"],
                credentials_path=credentials["credentials_path"],
                dataset=credentials.get("dataset"),
            )

        elif connector_type == "redshift":
            # Redshift is PostgreSQL-compatible
            return PostgreSQLConnector(
                connection_id=connection_id,
                connection_string=credentials["connection_string"],
            )

        else:
            raise ValueError(f"Unsupported connector type: {connector_type}")
```

### Connection Pool Manager

**File**: `apps/api/app/services/database/connection_pool.py`

```python
from typing import Dict, Optional
from .base_connector import DatabaseConnector
from .connector_factory import ConnectorFactory
import logging

logger = logging.getLogger(__name__)

class ConnectionPoolManager:
    """Manage database connection pools across multiple connections."""

    def __init__(self):
        self._connections: Dict[str, DatabaseConnector] = {}

    async def get_connector(
        self,
        connection_id: str,
        connector_type: str,
        credentials: Dict[str, Any],
    ) -> DatabaseConnector:
        """Get or create a connector for the given connection ID."""

        # Return existing connector if available
        if connection_id in self._connections:
            return self._connections[connection_id]

        # Create new connector
        connector = ConnectorFactory.create_connector(
            connection_id=connection_id,
            connector_type=connector_type,
            credentials=credentials,
        )

        # Connect and cache
        await connector.connect()
        self._connections[connection_id] = connector

        logger.info(f"Created new connector: {connection_id} ({connector_type})")

        return connector

    async def remove_connector(self, connection_id: str) -> None:
        """Remove and disconnect a connector."""
        if connection_id in self._connections:
            connector = self._connections.pop(connection_id)
            await connector.disconnect()
            logger.info(f"Removed connector: {connection_id}")

    async def disconnect_all(self) -> None:
        """Disconnect all connectors."""
        for connection_id, connector in self._connections.items():
            await connector.disconnect()
            logger.info(f"Disconnected: {connection_id}")
        self._connections.clear()

# Global connection pool manager
connection_pool = ConnectionPoolManager()
```

---

## Text-to-SQL Pipeline

### LangChain SQL Agent

**File**: `apps/api/app/services/agents/text_to_sql_agent.py`

```python
from langchain_openai import ChatOpenAI
from langchain_community.agent_toolkits import create_sql_agent
from langchain_community.utilities import SQLDatabase
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class TextToSQLAgent:
    """LangChain agent for natural language to SQL queries."""

    def __init__(
        self,
        connector: DatabaseConnector,
        llm_model: str = "gpt-4o-mini",
        temperature: float = 0.0,
    ):
        self.connector = connector
        self.llm = ChatOpenAI(model=llm_model, temperature=temperature)
        self._agent = None

    async def initialize(self) -> None:
        """Initialize the SQL agent with database schema."""
        # Create SQLAlchemy database wrapper
        db = SQLDatabase.from_uri(self.connector.connection_string)

        # Create SQL agent
        self._agent = create_sql_agent(
            llm=self.llm,
            db=db,
            agent_type="openai-tools",
            verbose=True,
        )

        logger.info(f"Initialized TextToSQLAgent for {self.connector.connection_id}")

    async def query(
        self,
        natural_language_query: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Convert natural language to SQL and execute."""

        if not self._agent:
            await self.initialize()

        # Add context to query if provided
        enhanced_query = natural_language_query
        if context:
            enhanced_query = f"""
            Context: {context}

            User Question: {natural_language_query}
            """

        try:
            # Run agent
            result = await self._agent.ainvoke({"input": enhanced_query})

            return {
                "status": "success",
                "sql_query": result.get("intermediate_steps", []),
                "result": result["output"],
                "source_type": "sql",
            }

        except Exception as e:
            logger.error(f"TextToSQLAgent error: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "source_type": "sql",
            }
```

### SQL Query Service

**File**: `apps/api/app/services/database/sql_query_service.py`

```python
from typing import Dict, Any, List, Optional
from .connection_pool import connection_pool
from ..agents.text_to_sql_agent import TextToSQLAgent
from app.models.database_connection import DatabaseConnection
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)

class SQLQueryService:
    """Service for executing SQL queries via natural language or direct SQL."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute_natural_language_query(
        self,
        connection_id: str,
        query: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Execute a natural language query against a database connection."""

        # Get connection from database
        result = await self.db.execute(
            select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
        )
        db_connection = result.scalar_one_or_none()

        if not db_connection:
            return {"status": "error", "error": "Connection not found"}

        if not db_connection.is_active:
            return {"status": "error", "error": "Connection is inactive"}

        # Get connector from pool
        connector = await connection_pool.get_connector(
            connection_id=str(db_connection.id),
            connector_type=db_connection.connector_type,
            credentials=db_connection.credentials,  # Decrypted in resolver
        )

        # Create text-to-SQL agent
        agent = TextToSQLAgent(connector=connector)

        # Execute query
        result = await agent.query(query, context=context)

        return result

    async def execute_direct_sql(
        self,
        connection_id: str,
        sql: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Execute a direct SQL query (for advanced users)."""

        # Get connection from database
        result = await self.db.execute(
            select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
        )
        db_connection = result.scalar_one_or_none()

        if not db_connection:
            return {"status": "error", "error": "Connection not found"}

        # Get connector from pool
        connector = await connection_pool.get_connector(
            connection_id=str(db_connection.id),
            connector_type=db_connection.connector_type,
            credentials=db_connection.credentials,
        )

        try:
            # Execute SQL
            rows = await connector.execute_query(sql, params)

            return {
                "status": "success",
                "rows": rows,
                "row_count": len(rows),
                "source_type": "sql",
            }

        except Exception as e:
            logger.error(f"Direct SQL execution error: {str(e)}")
            return {"status": "error", "error": str(e)}
```

---

## Query Execution

### GraphQL Mutations

**File**: `apps/api/app/graphql/mutations/database_query.py`

```python
import strawberry
from strawberry.types import Info
from typing import Optional
from app.services.database.sql_query_service import SQLQueryService
from app.db.session import get_db

@strawberry.input
class ExecuteDatabaseQueryInput:
    connection_id: strawberry.ID
    query: str  # Natural language or SQL
    query_type: str = "natural_language"  # 'natural_language' | 'sql'
    context: Optional[str] = None  # JSON string

@strawberry.type
class DatabaseQueryResult:
    status: str
    result: Optional[str]  # JSON string
    error: Optional[str]
    source_type: str = "sql"

@strawberry.type
class DatabaseQueryMutations:
    @strawberry.mutation
    async def execute_database_query(
        self,
        info: Info,
        input: ExecuteDatabaseQueryInput,
    ) -> DatabaseQueryResult:
        """Execute a database query (natural language or SQL)."""

        db = info.context["db"]
        service = SQLQueryService(db)

        if input.query_type == "natural_language":
            result = await service.execute_natural_language_query(
                connection_id=input.connection_id,
                query=input.query,
                context=json.loads(input.context) if input.context else None,
            )
        else:
            result = await service.execute_direct_sql(
                connection_id=input.connection_id,
                sql=input.query,
            )

        return DatabaseQueryResult(
            status=result["status"],
            result=json.dumps(result.get("result") or result.get("rows")),
            error=result.get("error"),
            source_type="sql",
        )
```

### Query History

**File**: `apps/api/app/models/query.py` (Update)

```python
# Add database_connection_id to existing Query model

class Query(Base):
    __tablename__ = "queries"

    # ... existing fields ...

    # Add optional database connection reference
    database_connection_id = Column(
        UUID(as_uuid=True),
        ForeignKey("database_connections.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Update source_type enum to include 'sql'
    source_type = Column(String(50), nullable=False)  # 'document', 'sql', 'hybrid'

    # SQL-specific metadata
    sql_query = Column(String, nullable=True)  # Generated SQL query
    row_count = Column(Integer, nullable=True)  # Number of rows returned

    # Relationships
    database_connection = relationship("DatabaseConnection", back_populates="queries")
```

---

## Security & Authentication

### Credential Encryption

**File**: `apps/api/app/services/security/credential_encryption.py`

```python
from cryptography.fernet import Fernet
from app.config import settings
import base64
import json
import logging

logger = logging.getLogger(__name__)

class CredentialEncryption:
    """Service for encrypting/decrypting database credentials."""

    def __init__(self):
        # Use environment variable for encryption key
        # In production, use AWS Secrets Manager or HashiCorp Vault
        key = settings.CREDENTIAL_ENCRYPTION_KEY.encode()
        self.cipher = Fernet(base64.urlsafe_b64encode(key.ljust(32)[:32]))

    def encrypt(self, credentials: dict) -> str:
        """Encrypt credentials dictionary to string."""
        json_str = json.dumps(credentials)
        encrypted = self.cipher.encrypt(json_str.encode())
        return encrypted.decode()

    def decrypt(self, encrypted_credentials: str) -> dict:
        """Decrypt credentials string to dictionary."""
        decrypted = self.cipher.decrypt(encrypted_credentials.encode())
        return json.loads(decrypted.decode())

# Global encryption service
credential_encryption = CredentialEncryption()
```

**Environment Variable** (`apps/api/.env`):

```bash
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
CREDENTIAL_ENCRYPTION_KEY=your-generated-key-here
```

### Connection Isolation

**Implementation**:

1. **Space-scoped connections**: Each `DatabaseConnection` belongs to one `Space`
2. **User authorization**: Verify user has access to Space before executing queries
3. **Query logging**: Log all queries with user ID, connection ID, timestamp
4. **Rate limiting**: Prevent abuse (e.g., max 100 queries/hour per user)

**Middleware** (`apps/api/app/middleware/database_auth.py`):

```python
from fastapi import Request, HTTPException
from app.models.space import Space
from app.models.database_connection import DatabaseConnection
from sqlalchemy import select

async def verify_connection_access(
    request: Request,
    connection_id: str,
) -> DatabaseConnection:
    """Verify user has access to database connection via Space membership."""

    db = request.state.db
    user = request.state.user

    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Get connection
    result = await db.execute(
        select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
    )
    connection = result.scalar_one_or_none()

    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Verify user has access to Space
    result = await db.execute(
        select(Space)
        .join(Space.members)
        .where(Space.id == connection.space_id)
        .where(Space.members.any(id=user.id))
    )
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=403, detail="Access denied")

    return connection
```

---

## Error Handling

### Error Types

**File**: `apps/api/app/services/database/exceptions.py`

```python
class DatabaseConnectionError(Exception):
    """Raised when database connection fails."""
    pass

class QueryExecutionError(Exception):
    """Raised when SQL query execution fails."""
    pass

class SchemaRetrievalError(Exception):
    """Raised when schema introspection fails."""
    pass

class TextToSQLError(Exception):
    """Raised when LLM fails to generate valid SQL."""
    pass

class UnsupportedConnectorError(Exception):
    """Raised when connector type is not supported."""
    pass
```

### Error Handling in Connectors

```python
# In execute_query()
async def execute_query(self, query: str, params=None) -> List[Dict]:
    try:
        # ... execute query ...
    except SQLAlchemyError as e:
        logger.error(f"SQL execution failed: {str(e)}")
        raise QueryExecutionError(f"Query failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise QueryExecutionError(f"Unexpected error: {str(e)}")
```

### User-Friendly Error Messages

**Frontend** (`apps/web/src/components/database/QueryErrorDisplay.tsx`):

```typescript
type QueryError = {
  type: 'connection' | 'execution' | 'syntax' | 'permission' | 'unknown';
  message: string;
  sqlQuery?: string;
  suggestion?: string;
};

export function QueryErrorDisplay({ error }: { error: QueryError }) {
  const errorConfig = {
    connection: {
      icon: '🔌',
      title: 'Connection Failed',
      color: 'text-red-600',
    },
    execution: {
      icon: '⚠️',
      title: 'Query Execution Error',
      color: 'text-orange-600',
    },
    syntax: {
      icon: '📝',
      title: 'SQL Syntax Error',
      color: 'text-yellow-600',
    },
    permission: {
      icon: '🔒',
      title: 'Permission Denied',
      color: 'text-red-600',
    },
    unknown: {
      icon: '❌',
      title: 'Unexpected Error',
      color: 'text-gray-600',
    },
  };

  const config = errorConfig[error.type];

  return (
    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <h4 className={`font-semibold ${config.color}`}>{config.title}</h4>
          <p className="text-sm text-gray-700 mt-1">{error.message}</p>
          {error.suggestion && (
            <p className="text-sm text-gray-600 mt-2">
              💡 <strong>Suggestion:</strong> {error.suggestion}
            </p>
          )}
          {error.sqlQuery && (
            <details className="mt-2">
              <summary className="text-sm text-gray-500 cursor-pointer">
                View generated SQL
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {error.sqlQuery}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

**File**: `apps/api/tests/services/database/test_postgres_connector.py`

```python
import pytest
from app.services.database.postgres_connector import PostgreSQLConnector

@pytest.mark.asyncio
async def test_postgres_connection():
    """Test PostgreSQL connection establishment."""
    connector = PostgreSQLConnector(
        connection_id="test-conn",
        connection_string="postgresql+asyncpg://user:pass@localhost:5432/testdb",
    )

    await connector.connect()
    assert connector._engine is not None

    await connector.disconnect()
    assert connector._engine is None

@pytest.mark.asyncio
async def test_postgres_test_connection():
    """Test connection validation."""
    connector = PostgreSQLConnector(
        connection_id="test-conn",
        connection_string=os.getenv("TEST_DB_URL"),
    )

    result = await connector.test_connection()

    assert result["status"] == "connected"
    assert result["connector_type"] == "postgresql"
    assert "version" in result

@pytest.mark.asyncio
async def test_postgres_execute_query():
    """Test query execution."""
    connector = PostgreSQLConnector(
        connection_id="test-conn",
        connection_string=os.getenv("TEST_DB_URL"),
    )

    rows = await connector.execute_query("SELECT 1 as num")

    assert len(rows) == 1
    assert rows[0]["num"] == 1

@pytest.mark.asyncio
async def test_postgres_get_schema():
    """Test schema retrieval."""
    connector = PostgreSQLConnector(
        connection_id="test-conn",
        connection_string=os.getenv("TEST_DB_URL"),
    )

    schema = await connector.get_schema("public")

    assert isinstance(schema, dict)
    assert len(schema) > 0  # At least one table
```

### Integration Tests

**File**: `apps/api/tests/integration/test_database_queries.py`

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_database_connection(async_client: AsyncClient, auth_headers):
    """Test creating a database connection."""
    mutation = """
    mutation CreateConnection($input: CreateDatabaseConnectionInput!) {
      createDatabaseConnection(input: $input) {
        id
        name
        connectorType
        isActive
      }
    }
    """

    variables = {
        "input": {
            "spaceId": "test-space-id",
            "name": "Test PostgreSQL",
            "connectorType": "postgresql",
            "credentials": json.dumps({
                "connection_string": os.getenv("TEST_DB_URL"),
            }),
        }
    }

    response = await async_client.post(
        "/graphql",
        json={"query": mutation, "variables": variables},
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert "errors" not in data
    assert data["data"]["createDatabaseConnection"]["name"] == "Test PostgreSQL"

@pytest.mark.asyncio
async def test_execute_natural_language_query(async_client: AsyncClient, auth_headers):
    """Test executing a natural language query."""
    mutation = """
    mutation ExecuteQuery($input: ExecuteDatabaseQueryInput!) {
      executeDatabaseQuery(input: $input) {
        status
        result
        sourceType
      }
    }
    """

    variables = {
        "input": {
            "connectionId": "test-connection-id",
            "query": "How many users are in the database?",
            "queryType": "natural_language",
        }
    }

    response = await async_client.post(
        "/graphql",
        json={"query": mutation, "variables": variables},
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["executeDatabaseQuery"]["status"] == "success"
    assert data["data"]["executeDatabaseQuery"]["sourceType"] == "sql"
```

### E2E Tests

**File**: `apps/web/e2e/database-connections.spec.ts` (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Database Connections', () => {
  test('should create a new PostgreSQL connection', async ({ page }) => {
    // Navigate to Space settings
    await page.goto('/spaces/test-space/settings');

    // Click "Add Connection"
    await page.click('text=Add Connection');

    // Select PostgreSQL
    await page.selectOption('select[name="connectorType"]', 'postgresql');

    // Fill in credentials
    await page.fill('input[name="name"]', 'Test DB');
    await page.fill('input[name="connectionString"]', 'postgresql://...');

    // Test connection
    await page.click('text=Test Connection');
    await expect(page.locator('text=Connection successful')).toBeVisible();

    // Save
    await page.click('text=Save Connection');
    await expect(page.locator('text=Test DB')).toBeVisible();
  });

  test('should execute a natural language query', async ({ page }) => {
    await page.goto('/spaces/test-space/chat');

    // Type query
    await page.fill(
      'textarea[placeholder="Ask a question..."]',
      'How many active users are there?'
    );

    // Send
    await page.click('button[type="submit"]');

    // Wait for response
    await expect(page.locator('[data-testid="sql-badge"]')).toBeVisible();
    await expect(page.locator('text=rows')).toBeVisible();
  });
});
```

---

## Implementation Guide

### Phase 1 Checklist (PostgreSQL/Supabase - Current Sprint)

**Backend**:

- [ ] Create `DatabaseConnection` model and migration
- [ ] Create `DatabaseConnector` abstract base class
- [ ] Implement `PostgreSQLConnector`
- [ ] Create `ConnectorFactory` and `ConnectionPoolManager`
- [ ] Implement `CredentialEncryption` service
- [ ] Create `TextToSQLAgent` using LangChain
- [ ] Create `SQLQueryService`
- [ ] Add GraphQL schema for database connections
- [ ] Add GraphQL mutations for connection CRUD
- [ ] Add GraphQL mutation for query execution
- [ ] Update `Query` model to include `database_connection_id` and `sql_query`
- [ ] Add connection authorization middleware
- [ ] Write unit tests for PostgreSQL connector
- [ ] Write integration tests for GraphQL mutations

**Frontend**:

- [ ] Create `DatabaseConnection` type (from GraphQL codegen)
- [ ] Create `useDatabaseConnections` React Query hook
- [ ] Create `useCreateDatabaseConnection` mutation hook
- [ ] Create `useExecuteDatabaseQuery` mutation hook
- [ ] Build `DatabaseConnectionForm` component
- [ ] Build `DatabaseConnectionCard` component
- [ ] Build `DatabaseConnectionList` component
- [ ] Build `QueryResultsTable` component for SQL results
- [ ] Build `SourceBadge` component (SQL vs Document)
- [ ] Update `ChatInput` to support database queries
- [ ] Update `ChatMessage` to display SQL results
- [ ] Add database connection UI to Space settings
- [ ] Write Storybook stories for new components
- [ ] Write E2E tests for database connection flow

**Environment Setup**:

- [ ] Add `CREDENTIAL_ENCRYPTION_KEY` to `.env`
- [ ] Add LangChain OpenAI API key to `.env`
- [ ] Update Docker Compose with test database service

### Phase 2 Checklist (Cloud Warehouses - Post-MVP)

**Backend**:

- [ ] Install `snowflake-sqlalchemy`, `sqlalchemy-bigquery`
- [ ] Implement `SnowflakeConnector`
- [ ] Implement `BigQueryConnector`
- [ ] Implement `RedshiftConnector` (reuse PostgreSQL)
- [ ] Update `ConnectorFactory` with new connector types
- [ ] Add credential validation for each connector type
- [ ] Integrate AWS Secrets Manager or HashiCorp Vault
- [ ] Add connection health monitoring (background task)
- [ ] Write connector-specific tests

**Frontend**:

- [ ] Build multi-step connection wizard UI
- [ ] Add connector-specific credential forms
- [ ] Add connection status indicators
- [ ] Build connection testing UI with progress feedback
- [ ] Add connection editing UI
- [ ] Support multiple connections per Space

### Phase 3 Checklist (Advanced Features - Future)

- [ ] Build semantic modeling UI
- [ ] Implement query result caching (Redis)
- [ ] Add query optimization hints
- [ ] Build query history and versioning UI
- [ ] Implement scheduled queries (Celery)
- [ ] Add data lineage tracking
- [ ] Implement role-based access control per connection
- [ ] Build query performance analytics dashboard

---

## Dependencies

### Backend Dependencies (Add to `pyproject.toml`)

```toml
[tool.poetry.dependencies]
# Database connectors
sqlalchemy = "^2.0.0"
asyncpg = "^0.29.0"  # PostgreSQL async driver
snowflake-sqlalchemy = "^1.5.0"  # Snowflake (Phase 2)
sqlalchemy-bigquery = "^1.9.0"  # BigQuery (Phase 2)
psycopg2-binary = "^2.9.0"  # Redshift (PostgreSQL-compatible)

# LangChain for text-to-SQL
langchain = "^0.1.0"
langchain-openai = "^0.0.5"
langchain-community = "^0.0.20"

# Security
cryptography = "^41.0.0"
```

### Frontend Dependencies (Add to `package.json`)

```json
{
  "dependencies": {
    "@tanstack/react-table": "^8.11.0",
    "react-syntax-highlighter": "^15.5.0"
  },
  "devDependencies": {
    "@types/react-syntax-highlighter": "^15.5.0"
  }
}
```

---

## Migration Plan

### Database Migration

```bash
# Create migration
cd apps/api
docker compose exec api poetry run alembic revision --autogenerate -m "Add database_connections table"

# Review migration file
# apps/api/alembic/versions/XXXX_add_database_connections_table.py

# Apply migration
docker compose exec api poetry run alembic upgrade head
```

### Supabase Migration (if using Supabase MCP)

```bash
# Use Supabase MCP server to apply migration
# See apps/api/MIGRATION_AUTOMATION.md for details
```

---

## Related Documentation

- [HYBRID_ARCHITECTURE.md](HYBRID_ARCHITECTURE.md) - Hybrid agent system design
- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) - Product requirements with database features
- [FEATURE_ALIGNMENT.md](FEATURE_ALIGNMENT.md) - 3-way feature comparison
- [HEX_DESIGN_SYSTEM.md](HEX_DESIGN_SYSTEM.md) - UI/UX reference for database connection UI
- [apps/api/DEVELOPMENT_WORKFLOW.md](../apps/api/DEVELOPMENT_WORKFLOW.md) - Backend development guide
- [docs/guides/backend-guide.md](guides/backend-guide.md) - Backend architecture patterns

---

**Last Updated**: 2025-10-25
**Maintainer**: Development Team
**Status**: Implementation roadmap - Phase 1 in progress
