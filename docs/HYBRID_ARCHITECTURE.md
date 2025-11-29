# Hybrid Platform Architecture

> **Purpose**: Technical architecture for Olympus hybrid intelligence platform
>
> **Last Updated**: 2025-10-25
>
> **Status**: Design Document - Pre-Implementation

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Hybrid Agent System](#hybrid-agent-system)
3. [Query Routing Strategy](#query-routing-strategy)
4. [Database Integration](#database-integration)
5. [Document Intelligence Pipeline](#document-intelligence-pipeline)
6. [Response Synthesis](#response-synthesis)
7. [Data Models](#data-models)
8. [API Architecture](#api-architecture)
9. [Frontend Architecture](#frontend-architecture)
10. [Performance & Scalability](#performance--scalability)

---

## Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Olympus Hybrid Platform                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Frontend (Next.js 14 + Hex UI Aesthetic)         │  │
│  │  - Threads Chat Interface                                │  │
│  │  - Source-Type Badges (SQL vs Document)                  │  │
│  │  - @Mentions for Data Sources                            │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              GraphQL API (Strawberry)                    │  │
│  │  - Query Mutations                                       │  │
│  │  - SSE Subscriptions for Streaming                       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Hybrid AI Agent (LangGraph)                   │  │
│  │                                                          │  │
│  │  ┌────────────────┐      ┌──────────────────┐          │  │
│  │  │ Query Router   │──────│ Intent Classifier│          │  │
│  │  └────────┬───────┘      └──────────────────┘          │  │
│  │           │                                             │  │
│  │           ├─────── SQL Query? ────────┐                │  │
│  │           │                            │                │  │
│  │           ├─── Document Query? ───┐   │                │  │
│  │           │                        │   │                │  │
│  │           └──── Hybrid Query? ────┼───┤                │  │
│  │                                    │   │                │  │
│  │  ┌─────────────────────────────┐  │   │                │  │
│  │  │   SQL Agent (Text-to-SQL)   │◄─┘   │                │  │
│  │  └──────────┬──────────────────┘      │                │  │
│  │             │                          │                │  │
│  │  ┌─────────────────────────────┐      │                │  │
│  │  │ Document RAG Agent          │◄─────┘                │  │
│  │  └──────────┬──────────────────┘                       │  │
│  │             │                                           │  │
│  │  ┌─────────────────────────────┐                       │  │
│  │  │   Response Synthesizer      │                       │  │
│  │  │   (Combine SQL + Docs)      │                       │  │
│  │  └─────────────────────────────┘                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                       │                                         │
│          ┌────────────┴───────────────┐                        │
│          ▼                            ▼                        │
│  ┌───────────────────┐      ┌──────────────────────┐          │
│  │ Database Layer    │      │ Document Storage     │          │
│  │                   │      │                      │          │
│  │ - PostgreSQL      │      │ - Supabase Storage   │          │
│  │ - Snowflake       │      │ - Vector DB (pgvect) │          │
│  │ - BigQuery        │      │ - Chunk Index        │          │
│  │ - Redshift        │      │ - Embeddings         │          │
│  └───────────────────┘      └──────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**

- Framework: Next.js 14 (App Router)
- UI Components: Shadcn-ui (`@olympus/ui`) with Hex aesthetic
- State: React Query (server state) + Zustand (client state)
- Styling: Tailwind CSS
- Real-time: SSE for streaming responses

**Backend**

- Framework: FastAPI (Python 3.11+)
- API: Strawberry GraphQL + REST endpoints
- Database: Supabase PostgreSQL (or Docker PostgreSQL)
- Cache/Sessions: Redis
- Auth: JWT tokens

**AI/ML Layer**

- Foundation: LangChain
- Agent Framework: LangGraph (simple queries), CrewAI (complex multi-agent)
- LLM Providers: OpenAI GPT-4, Anthropic Claude
- Vector DB: pgvector (PostgreSQL extension)
- Observability: LangSmith

**Database Connectors**

- PostgreSQL: psycopg3
- Snowflake: snowflake-connector-python
- BigQuery: google-cloud-bigquery
- Redshift: redshift-connector

---

## Hybrid Agent System

### Agent Architecture (LangGraph)

The hybrid agent uses a **tool-based architecture** where SQL and document retrieval are treated as tools the agent can invoke.

```python
# apps/api/app/ai/hybrid_agent.py

from langgraph.graph import StateGraph, END
from langchain.tools import Tool

class HybridAgentState(TypedDict):
    query: str
    intent: str  # 'sql', 'document', 'hybrid'
    sql_results: Optional[List[Dict]]
    document_chunks: Optional[List[Dict]]
    final_response: str
    citations: List[Dict]

def create_hybrid_agent() -> StateGraph:
    """Create LangGraph state machine for hybrid queries."""

    workflow = StateGraph(HybridAgentState)

    # Node 1: Classify intent
    workflow.add_node("classify_intent", classify_query_intent)

    # Node 2: Execute SQL (if needed)
    workflow.add_node("execute_sql", sql_query_executor)

    # Node 3: Retrieve documents (if needed)
    workflow.add_node("retrieve_docs", document_retriever)

    # Node 4: Synthesize response
    workflow.add_node("synthesize", response_synthesizer)

    # Define edges based on intent
    workflow.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "sql_only": "execute_sql",
            "document_only": "retrieve_docs",
            "hybrid": "execute_sql"  # Start with SQL for hybrid
        }
    )

    workflow.add_edge("execute_sql", "retrieve_docs")
    workflow.add_edge("retrieve_docs", "synthesize")
    workflow.add_edge("synthesize", END)

    workflow.set_entry_point("classify_intent")

    return workflow.compile()
```

### Tools Available to Agent

1. **SQL Executor Tool**
   - Generates SQL from natural language
   - Validates and executes SQL
   - Returns formatted results

2. **Document Retrieval Tool**
   - Performs vector similarity search
   - Retrieves relevant document chunks
   - Returns chunks with metadata

3. **Web Search Tool** (Future)
   - Searches external sources
   - Supplements internal data

---

## Query Routing Strategy

### Intent Classification

The system uses an LLM-based classifier to determine query intent:

```python
# apps/api/app/ai/query_router.py

async def classify_query_intent(query: str) -> str:
    """
    Classify user query into one of three intents:
    - 'sql': Query requires database access
    - 'document': Query requires document analysis
    - 'hybrid': Query requires both

    Returns:
        Intent classification
    """

    classification_prompt = f"""
    Analyze this user query and classify its intent:

    Query: "{query}"

    Intent types:
    - SQL: Query asks for structured data, metrics, counts, aggregations, or specific database records
      Examples: "What's our revenue?", "List top customers", "Show sales by region"

    - DOCUMENT: Query asks for information from documents, reports, or unstructured text
      Examples: "What risks are mentioned in the 10-K?", "Summarize competitor strategy"

    - HYBRID: Query requires combining database data with document insights
      Examples: "Compare our revenue to analyst forecasts", "How do our metrics match industry reports?"

    Respond with only: SQL, DOCUMENT, or HYBRID
    """

    response = await llm.ainvoke(classification_prompt)
    return response.content.strip().lower()
```

### Routing Decision Tree

```
User Query
    │
    ▼
┌──────────────────┐
│ Intent Classifier│
└────────┬─────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
 Contains     Contains
 SQL          Document
 Keywords?    Keywords?
    │            │
    ▼            ▼
┌────────┐  ┌──────────┐
│  SQL   │  │ DOCUMENT │
└────────┘  └──────────┘
    │            │
    └────┬───────┘
         │
      Both?
         │
         ▼
    ┌────────┐
    │ HYBRID │
    └────────┘
```

### Query Examples by Intent

**SQL Intent**:

- "What's our total revenue for Q4 2024?"
- "List customers with >$100k contracts"
- "Show sales by region and product category"

**Document Intent**:

- "What are the key risks mentioned in the SEC filing?"
- "Summarize competitor strategy from these reports"
- "Extract financial guidance from earnings transcript"

**Hybrid Intent**:

- "How does our Q4 revenue compare to analyst forecasts in these reports?"
- "Compare our NPS scores to industry benchmarks in the Gartner report"
- "Show customers at risk based on competitor wins mentioned in their filings"

---

## Database Integration

### Connection Management

```python
# apps/api/app/db/connections.py

from typing import Dict, Any
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from snowflake.sqlalchemy import URL as SnowflakeURL

class DatabaseConnectionManager:
    """Manage connections to multiple databases."""

    def __init__(self):
        self._connections: Dict[str, AsyncSession] = {}

    async def connect_postgres(self, config: Dict[str, Any]) -> AsyncSession:
        """Connect to PostgreSQL/Supabase."""
        engine = create_async_engine(
            f"postgresql+asyncpg://{config['user']}:{config['password']}@{config['host']}/{config['database']}"
        )
        return AsyncSession(engine)

    async def connect_snowflake(self, config: Dict[str, Any]) -> AsyncSession:
        """Connect to Snowflake data warehouse."""
        url = SnowflakeURL(
            account=config['account'],
            user=config['user'],
            password=config['password'],
            database=config['database'],
            warehouse=config['warehouse']
        )
        engine = create_async_engine(url)
        return AsyncSession(engine)

    async def execute_query(
        self,
        connection_id: str,
        sql: str
    ) -> List[Dict]:
        """Execute SQL and return results as list of dicts."""
        session = self._connections.get(connection_id)
        if not session:
            raise ValueError(f"Connection {connection_id} not found")

        result = await session.execute(sql)
        rows = result.fetchall()

        # Convert to list of dicts
        columns = result.keys()
        return [dict(zip(columns, row)) for row in rows]
```

### Text-to-SQL Generation

```python
# apps/api/app/ai/text_to_sql.py

async def generate_sql(
    query: str,
    schema: Dict[str, Any],
    connection_type: str
) -> str:
    """
    Generate SQL from natural language query.

    Args:
        query: Natural language question
        schema: Database schema metadata
        connection_type: 'postgresql', 'snowflake', 'bigquery'

    Returns:
        SQL query string
    """

    prompt = f"""
    You are an expert SQL query generator for {connection_type}.

    Database Schema:
    {json.dumps(schema, indent=2)}

    User Question: "{query}"

    Generate a SQL query to answer the question. Follow these rules:
    1. Use {connection_type} syntax
    2. Return ONLY the SQL query, no explanations
    3. Use appropriate JOINs if multiple tables needed
    4. Add LIMIT 100 unless user specifies otherwise
    5. Use CTEs for complex queries

    SQL Query:
    """

    response = await llm.ainvoke(prompt)
    sql = response.content.strip()

    # Validate SQL (basic checks)
    validate_sql(sql)

    return sql
```

---

## Document Intelligence Pipeline

### Document Processing Flow

```
Upload Document
     │
     ▼
┌─────────────────┐
│ Text Extraction │ (PyMuPDF, python-docx)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Chunking     │ (500-1000 token chunks)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Embedding     │ (OpenAI text-embedding-3-small)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store in Vector │ (pgvector)
│   Database      │
└─────────────────┘
```

### Document Retrieval (RAG)

```python
# apps/api/app/ai/document_retrieval.py

async def retrieve_relevant_chunks(
    query: str,
    space_id: str,
    top_k: int = 5
) -> List[Dict]:
    """
    Retrieve relevant document chunks using vector similarity.

    Args:
        query: User's natural language query
        space_id: Limit search to specific workspace
        top_k: Number of chunks to retrieve

    Returns:
        List of relevant chunks with metadata
    """

    # Generate query embedding
    query_embedding = await generate_embedding(query)

    # Vector similarity search using pgvector
    sql = """
        SELECT
            dc.id,
            dc.chunk_text,
            dc.chunk_index,
            dc.metadata,
            d.name as document_name,
            d.id as document_id,
            1 - (dc.embedding <=> $1::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE d.space_id = $2
        ORDER BY dc.embedding <=> $1::vector
        LIMIT $3
    """

    chunks = await db.fetch_all(sql, query_embedding, space_id, top_k)

    return [
        {
            "chunk_id": chunk["id"],
            "text": chunk["chunk_text"],
            "document_name": chunk["document_name"],
            "document_id": chunk["document_id"],
            "similarity": chunk["similarity"],
            "metadata": chunk["metadata"]
        }
        for chunk in chunks
    ]
```

---

## Response Synthesis

### Unified Response Format

```python
# apps/api/app/ai/response_synthesizer.py

class HybridResponse(BaseModel):
    """Unified response format for hybrid queries."""

    answer: str  # Natural language answer
    sources: List[Source]  # All sources (SQL + documents)
    sql_query: Optional[str] = None  # Generated SQL (if applicable)
    confidence: float  # 0.0 to 1.0


class Source(BaseModel):
    """Source citation (SQL or document)."""

    type: Literal["sql", "document"]
    content: str  # SQL result or document chunk
    metadata: Dict[str, Any]
    badge_color: str  # For UI rendering


async def synthesize_response(
    query: str,
    sql_results: Optional[List[Dict]],
    document_chunks: Optional[List[Dict]]
) -> HybridResponse:
    """
    Combine SQL results and document chunks into cohesive response.

    Args:
        query: Original user query
        sql_results: Results from SQL execution
        document_chunks: Retrieved document chunks

    Returns:
        Synthesized response with citations
    """

    synthesis_prompt = f"""
    You are synthesizing an answer from multiple data sources.

    User Query: "{query}"

    SQL Results:
    {json.dumps(sql_results, indent=2) if sql_results else "No SQL data"}

    Document Excerpts:
    {json.dumps(document_chunks, indent=2) if document_chunks else "No document data"}

    Instructions:
    1. Provide a natural language answer combining both sources
    2. Cite SQL results with [SQL: table_name] format
    3. Cite documents with [Doc: document_name, pg X] format
    4. If sources conflict, acknowledge both perspectives
    5. Be concise but thorough

    Response:
    """

    response = await llm.ainvoke(synthesis_prompt)

    # Build source list
    sources = []

    if sql_results:
        sources.append(Source(
            type="sql",
            content=json.dumps(sql_results),
            metadata={"rows": len(sql_results)},
            badge_color="blue"
        ))

    if document_chunks:
        for chunk in document_chunks:
            sources.append(Source(
                type="document",
                content=chunk["text"],
                metadata={
                    "document_name": chunk["document_name"],
                    "similarity": chunk["similarity"]
                },
                badge_color="green"
            ))

    return HybridResponse(
        answer=response.content,
        sources=sources,
        confidence=calculate_confidence(sql_results, document_chunks)
    )
```

---

## Data Models

### New Models for Hybrid Platform

```python
# apps/api/app/models/database_connection.py

class DatabaseConnection(Base):
    """User-created database connections."""

    __tablename__ = "database_connections"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    space_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("spaces.id"))
    name: Mapped[str]  # User-friendly name
    type: Mapped[str]  # 'postgresql', 'snowflake', 'bigquery', 'redshift'

    # Encrypted credentials
    credentials: Mapped[dict] = mapped_column(JSONB)

    # Connection metadata
    schema_cache: Mapped[Optional[dict]] = mapped_column(JSONB)
    last_tested: Mapped[Optional[datetime]]
    is_active: Mapped[bool] = mapped_column(default=True)

    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]


# apps/api/app/models/query.py (updated)

class Query(Base):
    """User queries with hybrid support."""

    __tablename__ = "queries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    space_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("spaces.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    # Query details
    query_text: Mapped[str]
    intent: Mapped[str]  # 'sql', 'document', 'hybrid'

    # Results
    response_text: Mapped[Optional[str]]
    sql_query: Mapped[Optional[str]]  # Generated SQL (if applicable)
    sql_results: Mapped[Optional[dict]] = mapped_column(JSONB)
    document_chunks: Mapped[Optional[list]] = mapped_column(JSONB)

    # Metadata
    sources: Mapped[list] = mapped_column(JSONB)  # Source citations
    confidence: Mapped[Optional[float]]
    execution_time_ms: Mapped[Optional[int]]

    created_at: Mapped[datetime]
    completed_at: Mapped[Optional[datetime]]
```

---

## API Architecture

### GraphQL Schema Updates

```graphql
# apps/api/app/graphql/schema.py

type Query {
  # Existing queries...
  spaces: [Space!]!
  documents(spaceId: ID!): [Document!]!

  # New hybrid queries
  databaseConnections(spaceId: ID!): [DatabaseConnection!]!
  queryHistory(spaceId: ID!, intent: QueryIntent): [QueryResult!]!
}

type Mutation {
  # Existing mutations...
  createSpace(input: CreateSpaceInput!): Space!
  uploadDocument(input: UploadDocumentInput!): Document!

  # New hybrid mutations
  createDatabaseConnection(input: CreateDBConnectionInput!): DatabaseConnection!
  testDatabaseConnection(connectionId: ID!): ConnectionTestResult!
  executeHybridQuery(input: HybridQueryInput!): QueryResult!
}

# New types
type DatabaseConnection {
  id: ID!
  name: String!
  type: DatabaseType!
  isActive: Boolean!
  lastTested: DateTime
  schemaPreview: [TableInfo!]
}

enum DatabaseType {
  POSTGRESQL
  SNOWFLAKE
  BIGQUERY
  REDSHIFT
}

input HybridQueryInput {
  spaceId: ID!
  query: String!
  dataSources: [ID!] # Optional: specific DB connections or documents
}

type QueryResult {
  id: ID!
  query: String!
  intent: QueryIntent!
  answer: String!
  sources: [Source!]!
  sqlQuery: String
  confidence: Float!
  executionTimeMs: Int!
}

enum QueryIntent {
  SQL
  DOCUMENT
  HYBRID
}

type Source {
  type: SourceType!
  content: String!
  metadata: JSON!
  badgeColor: String!
}

enum SourceType {
  SQL
  DOCUMENT
}
```

### SSE Streaming for Hybrid Responses

```python
# apps/api/app/routes/query.py

@router.post("/query/stream")
async def stream_hybrid_query(
    query_input: HybridQueryInput,
    user: User = Depends(get_current_user)
):
    """Stream hybrid query response using SSE."""

    async def event_generator():
        # Step 1: Classify intent
        yield f"data: {json.dumps({'step': 'classifying', 'message': 'Analyzing query...'})}\n\n"

        intent = await classify_query_intent(query_input.query)
        yield f"data: {json.dumps({'step': 'intent', 'intent': intent})}\n\n"

        # Step 2: Execute SQL (if needed)
        if intent in ['sql', 'hybrid']:
            yield f"data: {json.dumps({'step': 'sql', 'message': 'Generating SQL...'})}\n\n"

            sql = await generate_sql(query_input.query, schema)
            yield f"data: {json.dumps({'step': 'sql_query', 'sql': sql})}\n\n"

            sql_results = await execute_sql(sql)
            yield f"data: {json.dumps({'step': 'sql_results', 'rows': len(sql_results)})}\n\n"

        # Step 3: Retrieve documents (if needed)
        if intent in ['document', 'hybrid']:
            yield f"data: {json.dumps({'step': 'documents', 'message': 'Searching documents...'})}\n\n"

            chunks = await retrieve_relevant_chunks(query_input.query)
            yield f"data: {json.dumps({'step': 'doc_results', 'chunks': len(chunks)})}\n\n"

        # Step 4: Synthesize response
        yield f"data: {json.dumps({'step': 'synthesizing', 'message': 'Generating answer...'})}\n\n"

        response = await synthesize_response(query_input.query, sql_results, chunks)

        # Stream answer token by token (ChatGPT-style)
        for token in response.answer.split():
            yield f"data: {json.dumps({'step': 'token', 'token': token + ' '})}\n\n"
            await asyncio.sleep(0.05)  # Simulate streaming

        # Send final result
        yield f"data: {json.dumps({'step': 'complete', 'result': response.dict()})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

---

## Frontend Architecture

### Unified Chat Interface (Hex Threads-Style)

```typescript
// apps/web/src/components/chat/HybridChatInterface.tsx

import { useHybridQuery } from '@/hooks/queries/useHybridQuery';
import { SourceBadge } from './SourceBadge';

export function HybridChatInterface({ spaceId }: { spaceId: string }) {
  const [input, setInput] = useState('');
  const { mutate: sendQuery, data: response, isLoading } = useHybridQuery();

  const handleSubmit = () => {
    sendQuery({ spaceId, query: input });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {response?.messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' ? (
              <UserMessage content={msg.content} />
            ) : (
              <AIMessage
                content={msg.content}
                sources={msg.sources}
                sqlQuery={msg.sqlQuery}
              />
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onMention={handleMention}  // @database or @document
          placeholder="Ask about your data or documents..."
        />
      </div>
    </div>
  );
}

function AIMessage({ content, sources, sqlQuery }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      {/* Main response */}
      <div className="prose">{content}</div>

      {/* SQL Query (if applicable) */}
      {sqlQuery && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600">
            View SQL Query
          </summary>
          <CodeBlock language="sql">{sqlQuery}</CodeBlock>
        </details>
      )}

      {/* Source badges */}
      <div className="flex flex-wrap gap-2 mt-3">
        {sources.map((source, idx) => (
          <SourceBadge key={idx} type={source.type} {...source.metadata} />
        ))}
      </div>
    </div>
  );
}
```

### Source-Type Badges

```typescript
// apps/web/src/components/chat/SourceBadge.tsx

type SourceBadgeProps = {
  type: 'sql' | 'document';
  metadata: Record<string, any>;
};

export function SourceBadge({ type, metadata }: SourceBadgeProps) {
  const config = {
    sql: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: '📊',
      label: `SQL Result (${metadata.rows} rows)`,
    },
    document: {
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: '📄',
      label: `${metadata.document_name}`,
    },
  };

  const { color, icon, label } = config[type];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
```

---

## Organization Context Management

### Server-Side Organization Tracking

**Architecture Decision (LOG-227)**: The platform uses **server-side organization tracking** via `user_preferences.current_organization_id` as the single source of truth for user's current organization context.

**Key Principles**:

1. **Backend is authoritative** - Organization context flows from database → middleware → resolvers
2. **No client-side tracking** - Removed `lastUsedOrganizationId` from Zustand auth store
3. **SSR compatibility** - Server and client use same organization ID for React Query hydration
4. **Security** - Organization membership verified in middleware and resolvers

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  Organization Context Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User authenticates (JWT token)                             │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  AuthenticationMiddleware (middleware/auth.py)           │  │
│  │  - Verifies JWT token                                    │  │
│  │  - Fetches user_preferences.current_organization_id      │  │
│  │  - Injects into request.state.current_organization_id    │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  GraphQL Resolvers (query.py, mutation.py)              │  │
│  │  - Use request.state.current_organization_id as default  │  │
│  │  - Verify organization membership                        │  │
│  │  - Filter queries by organization                        │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Frontend (Next.js SSR + Client)                         │  │
│  │  - SSR: getCurrentOrganizationId() for prefetch          │  │
│  │  - Client: useUserPreferences() for current org          │  │
│  │  - React Query: Consistent query keys (server + client) │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Details

#### Backend: Middleware Injection

```python
# apps/api/app/middleware/auth.py

class AuthenticationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # ... JWT verification ...

        user_id = UUID(payload.get("sub"))
        async with get_session_factory()() as db:
            # Fetch user
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()

            # Inject user into request state
            request.state.user = user

            # Fetch user preferences and inject current_organization_id
            user_preferences_result = await db.execute(
                select(UserPreferences).where(UserPreferences.user_id == user_id)
            )
            user_preferences = user_preferences_result.scalar_one_or_none()
            request.state.current_organization_id = (
                user_preferences.current_organization_id if user_preferences else None
            )

        return await call_next(request)
```

#### Backend: GraphQL Resolver Usage

```python
# apps/api/app/graphql/query.py

async def threads(
    self,
    info: strawberry.types.Info,
    organization_id: strawberry.ID | None = None,
    ...
) -> list[Thread]:
    """Get user's threads in current organization."""

    request = info.context["request"]
    user = getattr(request.state, "user", None)

    # Use explicit organization_id or fall back to user's current org from middleware
    org_uuid: UUID | None
    if organization_id:
        org_uuid = UUID(str(organization_id))
    else:
        # Fall back to user's current organization from middleware (user preferences)
        current_org_id = getattr(request.state, "current_organization_id", None)
        org_uuid = UUID(str(current_org_id)) if current_org_id else None

    if org_uuid:
        # Verify user is a member of the organization
        org_member_stmt = select(OrganizationMemberModel.id).where(
            (OrganizationMemberModel.organization_id == org_uuid)
            & (OrganizationMemberModel.user_id == user.id)
        )
        org_member_result = await session.execute(org_member_stmt)
        if not org_member_result.scalar_one_or_none():
            return []  # User not authorized

        # Return user's threads in this organization
        stmt = (
            select(ThreadModel)
            .where(ThreadModel.organization_id == org_uuid)
            .where(ThreadModel.created_by == user.id)
            .order_by(ThreadModel.created_at.desc())
        )
```

#### Frontend: Server-Side Fetcher (SSR)

```typescript
// apps/web/src/lib/api/server-fetchers/user-preferences.ts

export async function getCurrentOrganizationId(): Promise<string | null> {
  try {
    const graphqlClient = await getServerGraphQLClient();
    const { userPreferences } =
      await graphqlClient.request<UserPreferencesQuery>(
        UserPreferencesDocument
      );
    return userPreferences?.currentOrganizationId || null;
  } catch (error) {
    console.error('Failed to fetch current organization ID:', error);
    return null;
  }
}
```

#### Frontend: SSR Prefetch with Organization Context

```typescript
// apps/web/src/app/dashboard/page.tsx

export default async function DashboardPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Fetch current organization from user_preferences
  // Ensures server and client use the same organizationId for query keys
  const currentOrgId = await getCurrentOrganizationId();

  await Promise.all([
    // Prefetch dashboard stats with correct organizationId
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.stats(currentOrgId),
      queryFn: () =>
        fetchDashboardStats(graphqlClient, { organizationId: currentOrgId }),
    }),
    // ... other prefetches
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent />
    </HydrationBoundary>
  );
}
```

#### Frontend: Client-Side Organization Selection

```typescript
// apps/web/src/hooks/useUserPreferences.ts

export function useAutoSelectOrganization() {
  const queryClient = useQueryClient();
  const { setCurrentOrganization } = useAuthStore();
  const { userPreferences } = useUserPreferences();
  const { updateCurrentOrganization } = useUpdateCurrentOrganization();

  return async () => {
    const orgsData = await queryClient.fetchQuery<Organization[]>({
      queryKey: queryKeys.organizations.lists(),
      queryFn: async () => {
        const response = await graphqlClient.request<GetOrganizationsQuery>(
          GetOrganizationsDocument,
          { limit: 100 }
        );
        return (response.organizations || []) as Organization[];
      },
    });

    if (orgsData.length === 0) {
      setCurrentOrganization(null);
      return;
    }

    const preferredOrgId = userPreferences?.currentOrganizationId;
    const firstOrganization = orgsData[0];

    // Find preferred org or fall back to first
    const selectedOrg = preferredOrgId
      ? orgsData.find((org) => org.id === preferredOrgId) || firstOrganization
      : firstOrganization;

    // Update backend if no preference set or preferred org no longer exists
    const needsBackendSync =
      !preferredOrgId ||
      (preferredOrgId && !orgsData.find((org) => org.id === preferredOrgId));

    if (needsBackendSync) {
      await updateCurrentOrganization(selectedOrg.id);
    } else {
      setCurrentOrganization(selectedOrg);
    }
  };
}
```

### State Management Strategy

**Server State (React Query)**:

- `userPreferences.currentOrganizationId` - Authoritative organization context
- Organization list
- User profile

**Client State (Zustand)**:

- `currentOrganization` - **UI-only** cache of selected organization object
- **Removed**: `lastUsedOrganizationId` (deprecated in favor of backend tracking)

**Key Rule**: Never use client-side state for authoritative data. Always fetch from server.

### Benefits of Server-Side Tracking

1. **Cross-device consistency** - Organization selection persists across devices
2. **Security** - Organization access verified on server, not client
3. **SSR compatibility** - Server and client share same organization context
4. **Simplified state** - Single source of truth eliminates client-side sync issues
5. **Audit trail** - All organization changes tracked in database

### Migration Notes

**Deprecated**:

- ❌ `useAuthStore().lastUsedOrganizationId` (removed)
- ❌ Client-side organization persistence

**New Approach**:

- ✅ `user_preferences.current_organization_id` (database column)
- ✅ `request.state.current_organization_id` (middleware injection)
- ✅ `getCurrentOrganizationId()` (server-side fetcher)
- ✅ Organization membership verification in all resolvers

---

## Performance & Scalability

### Caching Strategy

1. **SQL Query Results**: Cache for 5 minutes (configurable)
2. **Document Embeddings**: Permanent (invalidate on document update)
3. **Schema Metadata**: Cache for 1 hour

### Query Optimization

- **Parallel Execution**: Run SQL and document retrieval in parallel for hybrid queries
- **Result Streaming**: Stream tokens as they're generated (improves perceived performance)
- **Connection Pooling**: Reuse database connections

### Scalability Considerations

- **Horizontal Scaling**: FastAPI workers can scale horizontally
- **Vector Search**: Consider migrating to Pinecone for >1M documents
- **LLM Rate Limits**: Implement request queuing and rate limiting

---

## Security Considerations

### Database Credentials

- Encrypt at rest using Fernet (symmetric encryption)
- Never log credentials
- Rotate encryption keys quarterly

### SQL Injection Prevention

- Parse and validate generated SQL
- Use parameterized queries
- Whitelist allowed SQL operations

### Access Control

- RLS policies ensure users only query their spaces
- Connection ownership verification
- Audit all database queries

---

## Next Steps

1. ✅ Architecture design complete
2. ⏳ Implement query router (Phase 2)
3. ⏳ Build database connection manager (Phase 2)
4. ⏳ Integrate text-to-SQL (Phase 2)
5. ⏳ Build response synthesizer (Phase 2)
6. ⏳ Create Threads-style UI (Phase 2)
7. ⏳ Add source-type badges (Phase 2)

---

**Related Documentation**:

- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) - Feature requirements
- [DATABASE_INTEGRATION.md](DATABASE_INTEGRATION.md) - Connector details
- [HEX_DESIGN_SYSTEM.md](HEX_DESIGN_SYSTEM.md) - UI/UX patterns

**Last Updated**: 2025-10-25
