# Olympus API

FastAPI backend for Olympus - an AI-native document intelligence platform inspired by [Athena Intelligence](https://www.athenaintel.com/).

**Core Features**:

- Document processing pipeline (PDF, DOCX extraction)
- AI-powered querying with LangChain + LangGraph
- Natural language interface with source citations and confidence scoring
- Real-time streaming responses via Server-Sent Events (SSE)
- Intelligent fallback for low-confidence responses
- GraphQL API for frontend integration
- Workspace management and collaboration

**Tech Stack**: FastAPI, Strawberry GraphQL, SQLAlchemy, LangChain, LangGraph, pgvector, Supabase PostgreSQL

See [../../docs/PRODUCT_REQUIREMENTS.md](../../docs/PRODUCT_REQUIREMENTS.md) for full feature specifications.

## Features

- **FastAPI** - Modern, fast web framework for building APIs
- **GraphQL** - Strawberry GraphQL with interactive playground
- **Database** - SQLAlchemy with async PostgreSQL support
- **Authentication** - JWT-based authentication system
- **Migrations** - Alembic database migrations
- **Testing** - Comprehensive test suite with pytest

## Quick Start

### Option 1: Docker Development (Recommended)

The fastest way to get started is using Docker, which provides a complete development environment:

```bash
# Start all services (PostgreSQL, Redis, API)
docker compose up -d

# View logs
docker compose logs -f api

# Access the API
open http://localhost:8000
```

🔗 **For detailed Docker setup instructions, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)**

### Option 2: Local Development

### Prerequisites

- Python 3.11+
- Poetry for dependency management
- PostgreSQL database (local or Supabase)
- Redis server (optional, for session management)

### Installation

1. **Clone the repository and navigate to the API directory:**

   ```bash
   cd apps/api
   ```

2. **Install dependencies:**

   ```bash
   poetry install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations:**

   ```bash
   poetry run alembic upgrade head
   ```

5. **Start the development server:**
   ```bash
   poetry run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

## API Endpoints

### REST API

- **Base URL**: http://127.0.0.1:8000
- **Documentation**: http://127.0.0.1:8000/docs (Swagger UI)
- **Alternative Docs**: http://127.0.0.1:8000/redoc

### GraphQL API

- **Endpoint**: http://127.0.0.1:8000/graphql
- **Playground**: http://127.0.0.1:8000/graphql (Interactive GraphiQL interface)

#### Available GraphQL Operations

**Queries:**

```graphql
# Get user by ID
query GetUser($id: ID!) {
  user(id: $id) {
    id
    email
    fullName
    avatarUrl
    bio
    createdAt
    updatedAt
  }
}

# Get paginated users
query GetUsers($limit: Int, $offset: Int) {
  users(limit: $limit, offset: $offset) {
    id
    email
    fullName
    avatarUrl
    bio
  }
}

# Get user by email
query GetUserByEmail($email: String!) {
  userByEmail(email: $email) {
    id
    email
    fullName
  }
}

# Health check
query HealthCheck {
  health
}
```

**Mutations:**

```graphql
# Create a new user
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    fullName
    avatarUrl
    bio
    createdAt
  }
}

# Update existing user
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    email
    fullName
    avatarUrl
    bio
    updatedAt
  }
}

# Delete user
mutation DeleteUser($id: ID!) {
  deleteUser(id: $id)
}

# Create a query (AI-powered Q&A)
mutation CreateQuery($input: CreateQueryInput!) {
  createQuery(input: $input) {
    id
    queryText
    responseText
    confidenceScore
    status
    citations {
      index
      text
      documentId
      documentTitle
      chunkIndex
      similarityScore
      pageNumber
    }
    createdAt
  }
}

# Update query status or response
mutation UpdateQuery($id: ID!, $input: UpdateQueryInput!) {
  updateQuery(id: $id, input: $input) {
    id
    status
    responseText
    confidenceScore
    updatedAt
  }
}
```

### Query API (SSE Streaming)

The Query API provides real-time streaming of AI-generated responses using Server-Sent Events (SSE). This enables progressive display of responses in the UI as they are generated.

**Endpoint**: `GET /api/query/stream`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Natural language question to process |
| `space_id` | UUID | No | Space ID to filter document search results |
| `user_id` | UUID | Conditional | User ID for query attribution (required if `save_to_db=true`) |
| `save_to_db` | boolean | No | Whether to save query and results to database (default: `false`) |

**Event Types:**

The endpoint streams JSON events in SSE format (`data: {...}\n\n`):

1. **`token`** - Individual response tokens as they are generated
   ```json
   {"type": "token", "content": "The answer is"}
   ```

2. **`citations`** - Source citations with document metadata and confidence scores
   ```json
   {
     "type": "citations",
     "sources": [
       {
         "index": 1,
         "text": "The key risks include market volatility...",
         "document_id": "123e4567-e89b-12d3-a456-426614174000",
         "document_title": "Risk Assessment Report",
         "chunk_index": 0,
         "similarity_score": 0.85,
         "page_number": 5,
         "start_char": 0,
         "end_char": 100
       }
     ],
     "confidence_score": 0.85
   }
   ```

3. **`done`** - Completion signal with overall confidence and query ID
   ```json
   {
     "type": "done",
     "confidence_score": 0.85,
     "query_id": "456e7890-e89b-12d3-a456-426614174001"
   }
   ```

4. **`error`** - Error information if processing fails
   ```json
   {
     "type": "error",
     "message": "Query processing timed out after 120 seconds",
     "error_code": "TIMEOUT"
   }
   ```

**Error Codes:**

- `TIMEOUT` - Query processing exceeded 120 second timeout
- `RATE_LIMIT` - OpenAI API rate limit exceeded
- `API_ERROR` - AI service temporarily unavailable
- `DATABASE_ERROR` - Database connection error
- `UNKNOWN` - Unexpected error occurred

**Example Usage (JavaScript/TypeScript):**

```javascript
const params = new URLSearchParams({
  query: "What are the key risks mentioned in the Q4 report?",
  space_id: "123e4567-e89b-12d3-a456-426614174000",
  user_id: "456e7890-e89b-12d3-a456-426614174001",
  save_to_db: "true"
});

const eventSource = new EventSource(`/api/query/stream?${params}`);

let responseText = "";

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.type) {
    case 'token':
      // Append token to response display
      responseText += data.content;
      updateUI(responseText);
      break;

    case 'citations':
      // Display source citations with confidence
      renderCitations(data.sources, data.confidence_score);
      break;

    case 'done':
      // Display final confidence and close connection
      console.log('Confidence:', data.confidence_score);
      console.log('Query ID:', data.query_id);
      eventSource.close();
      break;

    case 'error':
      console.error('Error:', data.message, data.error_code);
      handleError(data.error_code, data.message);
      eventSource.close();
      break;
  }
};

eventSource.onerror = () => {
  console.error('Connection lost');
  eventSource.close();
};
```

**Example Usage (Python):**

```python
import httpx
import json

params = {
    "query": "What are the key risks?",
    "space_id": "123e4567-e89b-12d3-a456-426614174000",
    "save_to_db": True,
}

async with httpx.AsyncClient() as client:
    async with client.stream("GET", "/api/query/stream", params=params) as response:
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                event_data = json.loads(line[6:])

                if event_data["type"] == "token":
                    print(event_data["content"], end="", flush=True)
                elif event_data["type"] == "citations":
                    print(f"\n\nSources: {len(event_data['sources'])}")
                    print(f"Confidence: {event_data['confidence_score']}")
                elif event_data["type"] == "done":
                    print(f"\n\nQuery ID: {event_data['query_id']}")
                elif event_data["type"] == "error":
                    print(f"\n\nError: {event_data['message']}")
```

**Confidence Scoring & Fallback Behavior:**

The Query API includes intelligent confidence scoring to assess response quality:

- **High Confidence (≥0.7)**: Response returned normally
- **Medium Confidence (0.5-0.7)**: Response with quality warning
- **Low Confidence (<0.5)**: Triggers fallback to broader web search (planned feature)

Confidence is calculated based on:
- Semantic similarity scores of retrieved chunks
- Number and quality of citations used
- Hallucination detection (validates response against source documents)

See `app/services/citation_service.py` for implementation details.

## Project Structure

```
apps/api/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI application entry point
│   ├── config.py                    # Application configuration
│   ├── agents/
│   │   ├── __init__.py
│   │   └── query_agent.py           # LangGraph agent for RAG pipeline
│   ├── db/
│   │   ├── __init__.py
│   │   └── session.py               # Database session management
│   ├── graphql/
│   │   ├── __init__.py
│   │   ├── types.py                 # GraphQL type definitions
│   │   ├── query.py                 # GraphQL query resolvers
│   │   ├── mutation.py              # GraphQL mutation resolvers
│   │   └── schema.py                # Main GraphQL schema
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py                  # Base model class
│   │   ├── user.py                  # User model
│   │   ├── document.py              # Document model
│   │   ├── document_chunk.py        # Document chunk model (vector embeddings)
│   │   ├── query.py                 # Query model
│   │   ├── space.py                 # Space model
│   │   └── user_preferences.py      # User preferences model
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py                # Health check endpoints
│   │   └── query_stream.py          # SSE streaming query endpoint
│   └── services/
│       ├── __init__.py
│       ├── ai_agent.py              # AI agent orchestration service
│       ├── chunking_service.py      # Text chunking with overlap
│       ├── citation_service.py      # Citation extraction and confidence scoring
│       ├── document_processor.py    # Document upload and processing
│       ├── embedding_service.py     # OpenAI embedding generation
│       ├── langchain_config.py      # LangChain/LangGraph configuration
│       └── vector_search_service.py # Semantic search with pgvector
├── alembic/                         # Database migrations
├── database/
│   ├── schema.sql                   # Database schema
│   └── rls_policies.sql             # Row Level Security policies
├── scripts/
│   ├── migrate.py                   # Migration utilities
│   └── start_dev.sh                 # Development startup script
├── tests/
│   ├── __init__.py
│   ├── conftest.py                  # Pytest fixtures and configuration
│   ├── test_rag_pipeline_integration.py  # RAG pipeline integration tests
│   ├── test_query_stream_endpoint.py     # SSE streaming endpoint tests
│   ├── test_query_agent.py               # Query agent unit tests
│   └── test_citation_service.py          # Citation service unit tests
├── pyproject.toml                   # Poetry configuration
├── alembic.ini                      # Alembic configuration
└── .env                             # Environment variables
```

## Environment Configuration

The API supports two database configurations:

### Local PostgreSQL with Docker (Development)

```bash
# Use Docker containers for PostgreSQL and Redis
USE_LOCAL_DB=true
DATABASE_URL=postgresql+asyncpg://olympus:olympus_dev@postgres:5432/olympus_mvp
REDIS_URL=redis://redis:6379/0
```

### Supabase (Production/Cloud)

```bash
# Use Supabase hosted database
USE_LOCAL_DB=false
DATABASE_URL=postgresql+asyncpg://postgres.your-project:password@aws-0-region.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Complete Environment Variables

Create a `.env` file with the following variables:

```bash
# FastAPI Configuration
ENV=development
DEBUG=true
HOST=0.0.0.0
PORT=8000

# Database Configuration
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
USE_LOCAL_DB=false

# Supabase Configuration (if using Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql+asyncpg://postgres.your-project:password@aws-0-region.pooler.supabase.com:6543/postgres

# JWT Configuration
JWT_SECRET=your-jwt-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS Configuration
CORS_ORIGINS=["http://localhost:3000"]

# Redis Configuration
REDIS_URL=redis://localhost:6379

# OpenAI Configuration (for RAG pipeline)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo  # LLM for response generation
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Embedding model for vector search
```

## Development

### Running Tests

The API includes comprehensive test coverage for all core functionality including RAG pipeline, SSE streaming, confidence scoring, and GraphQL operations.

**Test Execution Modes:**

The test suite supports three execution modes:

1. **Local Host Execution** (Recommended for development)
   - Runs on your host machine
   - Uses testcontainers for PostgreSQL/Redis/SpiceDB
   - Requires Docker socket access

2. **Docker Container Execution** (For consistent environments)
   - Runs in Docker container with Docker socket mounted
   - Uses Docker Compose test services
   - Good for CI-like local testing

3. **CI Execution** (GitHub Actions)
   - Uses GitHub Actions service containers
   - No Docker socket needed

**Run Tests:**

```bash
cd apps/api

# Using Makefile (recommended)
make test-unit        # Unit tests only (fast, SQLite)
make test-integration # Integration tests (PostgreSQL + services)
make test-all         # All tests
make test-coverage    # With coverage report
make test-rls         # RLS policy tests only
make test             # Alias for test-all

# Or use pytest directly
poetry run pytest tests/ -v
```

**Docker-Based Testing:**

```bash
# Start test services (PostgreSQL, Redis, SpiceDB, MinIO)
docker compose -f docker-compose.test.yml up -d

# Run tests in Docker container
docker compose -f docker-compose.test.yml run --rm test-runner make test-all

# Or run specific test suite
docker compose -f docker-compose.test.yml run --rm test-runner make test-integration

# Stop test services
docker compose -f docker-compose.test.yml down
```

**Run Specific Test Suites:**

```bash
# RAG pipeline integration tests
poetry run pytest tests/test_rag_pipeline_integration.py -v

# SSE streaming endpoint tests
poetry run pytest tests/test_query_stream_endpoint.py -v

# Query agent unit tests
poetry run pytest tests/test_query_agent.py -v

# Citation service tests
poetry run pytest tests/test_citation_service.py -v

# Run tests matching a pattern
poetry run pytest -k "test_confidence" -v
```

**Test Organization:**

- **`test_rag_pipeline_integration.py`** - End-to-end RAG pipeline tests
  - Context retrieval with vector search
  - Response generation with LangGraph agent
  - Citation extraction and enrichment
  - Confidence score calculation
  - Hallucination detection
  - Database persistence with GraphQL mutations

- **`test_query_stream_endpoint.py`** - SSE streaming endpoint tests
  - SSE event formatting and delivery
  - Timeout handling (120 second limit)
  - Error categorization (TIMEOUT, RATE_LIMIT, API_ERROR, DATABASE_ERROR)
  - Query parameter validation
  - Space filtering
  - Database save functionality

- **`test_query_agent.py`** - Query agent workflow tests
  - Context retrieval step
  - Token budget management
  - Response streaming
  - Citation extraction

- **`test_citation_service.py`** - Citation service unit tests
  - Citation extraction from responses
  - Confidence score calculation
  - Hallucination detection logic
  - Source metadata enrichment

**Running Tests in Docker:**

```bash
# Run tests inside Docker container
docker compose exec api poetry run pytest -v

# Run specific test file
docker compose exec api poetry run pytest tests/test_rag_pipeline_integration.py -v

# Run with coverage
docker compose exec api poetry run pytest --cov=app tests/
```

**Test Fixtures:**

The test suite includes comprehensive fixtures for testing:

- `async_session` - Async database session with rollback
- `async_client` - HTTP client for API testing
- `test_user` - Test user fixture
- `test_space` - Test workspace fixture
- `test_documents` - Sample documents with chunks
- `graphql_client` - GraphQL client wrapper for mutations/queries

### Database Migrations

```bash
# Create a new migration
poetry run alembic revision --autogenerate -m "Description of changes"

# Apply migrations
poetry run alembic upgrade head

# Rollback migrations
poetry run alembic downgrade -1
```

### Code Quality

```bash
# Format code
poetry run ruff format

# Lint code
poetry run ruff check

# Type checking
poetry run mypy app/
```

## Technology Stack

- **FastAPI** - Web framework
- **Strawberry GraphQL** - GraphQL library with FastAPI integration
- **SQLAlchemy** - ORM with async support
- **Alembic** - Database migration tool
- **PostgreSQL** - Primary database with pgvector extension
- **Pydantic** - Data validation and settings management
- **LangChain** - LLM framework for RAG pipeline
- **LangGraph** - Stateful agent workflow orchestration
- **OpenAI** - LLM API (gpt-4, text-embedding-3-small)
- **Pytest** - Testing framework
- **Ruff** - Code formatting and linting
- **MyPy** - Static type checking

## AI & RAG Architecture

The API implements a sophisticated Retrieval-Augmented Generation (RAG) pipeline using LangChain and LangGraph for document-based question answering.

### RAG Pipeline Flow

```
User Query → Context Retrieval → Response Generation → Citation Extraction → Confidence Scoring
    ↓              ↓                     ↓                      ↓                    ↓
Query Agent    Vector Search      LangGraph Workflow    Citation Service    Hallucination Check
```

### Core Components

**1. Query Agent (`app/agents/query_agent.py`)**

LangGraph-based stateful agent that orchestrates the RAG workflow:

- **State Management**: Maintains query context, retrieved chunks, response, and citations
- **Workflow Steps**:
  1. `retrieve_context` - Semantic search for relevant document chunks
  2. `generate_response_streaming` - Stream LLM response with context
  3. `add_citations` - Extract and enrich citations with metadata
- **Token Budget Management**: Trims context to fit within 8K token window
- **Adaptive Context Selection**: Prioritizes highest-relevance chunks when over budget

**2. Vector Search Service (`app/services/vector_search_service.py`)**

Semantic document search using pgvector extension:

- **Embedding Model**: OpenAI text-embedding-3-small (1536 dimensions)
- **Similarity Metric**: Cosine distance
- **Index Type**: IVFFlat for fast approximate search
- **Filtering**: By space_id, document_ids, similarity threshold
- **Performance**: <500ms query latency for 10K+ chunks

**3. Citation Service (`app/services/citation_service.py`)**

Confidence scoring and hallucination detection:

- **Confidence Calculation**:
  - Weighted average of chunk similarity scores
  - Adjusted by number of citations used
  - Threshold: ≥0.7 for high confidence, <0.5 for fallback
- **Hallucination Detection**:
  - Validates response claims against source documents
  - Checks for contradictions or unsupported statements
  - Quality score based on citation density and relevance

**4. AI Agent Service (`app/services/ai_agent.py`)**

Orchestrates the full query processing pipeline:

- **SSE Streaming**: Real-time token delivery to frontend
- **Database Persistence**: Saves queries and results via GraphQL
- **Error Recovery**: Categorized error handling with user-friendly messages
- **Timeout Protection**: 120 second hard timeout for query processing

### Document Processing Pipeline

```
PDF/DOCX Upload → Text Extraction → Semantic Chunking → Embedding Generation → Vector Storage
       ↓                ↓                  ↓                    ↓                    ↓
DocumentProcessor  PyMuPDF/docx    ChunkingService    EmbeddingService    document_chunks table
```

**Chunking Strategy:**

- **Target Size**: 750 tokens per chunk
- **Overlap**: 100 tokens between chunks (preserves context)
- **Sentence Boundary Preservation**: Uses NLTK for sentence detection
- **Metadata**: Stores page numbers, character offsets, chunk index

**Embedding Strategy:**

- **Batch Processing**: 100 chunks per API call
- **Retry Logic**: Exponential backoff for rate limits
- **Cost Optimization**: ~$0.02 per 1M tokens (text-embedding-3-small)

### Query Processing Configuration

Key parameters for tuning RAG performance:

```python
# Context Window Management (app/agents/query_agent.py)
MAX_CONTEXT_WINDOW = 8000        # Total token budget
MAX_RESPONSE_TOKENS = 2000       # Reserved for response
MAX_CONTEXT_TOKENS = 5100        # Available for retrieved chunks

# Vector Search (app/services/vector_search_service.py)
DEFAULT_LIMIT = 5                # Top-k chunks to retrieve
DEFAULT_SIMILARITY_THRESHOLD = 0.3  # Minimum relevance score

# Confidence Thresholds (app/services/citation_service.py)
HIGH_CONFIDENCE_THRESHOLD = 0.7  # Return response normally
LOW_CONFIDENCE_THRESHOLD = 0.5   # Trigger fallback (future)

# Timeout (app/routes/query_stream.py)
QUERY_TIMEOUT_SECONDS = 120      # Maximum query processing time
```

### LangGraph Workflow

The query agent uses a directed graph for stateful orchestration:

```mermaid
graph LR
    A[retrieve_context] --> B[generate_response]
    B --> C[add_citations]
    C --> D[END]
```

Each node is an async function that receives and returns the agent state:

```python
class AgentState(TypedDict):
    query: str                          # User question
    context: list[str]                  # Retrieved text chunks
    response: str | None                # Generated response
    citations: list[dict]               # Enriched citations
    db: AsyncSession | None             # Database session
    space_id: UUID | None               # Workspace filter
    search_results: list[SearchResult]  # Full search metadata
```

### Performance Characteristics

- **Query Latency**: ~2-5 seconds for typical queries
  - Vector search: <500ms
  - Context retrieval: <1s
  - LLM streaming: 1-3s (varies by response length)
- **Throughput**: Handles concurrent queries via FastAPI async workers
- **Token Efficiency**: ~5K tokens per query (including context and response)
- **Cost**: ~$0.01-0.02 per query (OpenAI API + embeddings)

### Testing Strategy

Comprehensive test coverage across all RAG components:

1. **Integration Tests** - Full pipeline with mocked LLM responses
2. **Unit Tests** - Individual service and agent functions
3. **E2E Tests** - SSE streaming with real HTTP clients
4. **Fixtures** - Reusable test data (users, spaces, documents, chunks)

See [Running Tests](#running-tests) section for test execution details.

## GraphQL Schema Details

The GraphQL implementation uses Strawberry GraphQL and provides:

- **Type-safe schema** with Python type annotations
- **Async resolvers** for database operations
- **Error handling** for invalid inputs and database constraints
- **Interactive playground** for development and testing
- **Automatic schema introspection**

## Contributing

1. Create a feature branch
2. Make your changes
3. Add/update tests
4. Run the test suite
5. Submit a pull request

## License

[Add your license information here]
