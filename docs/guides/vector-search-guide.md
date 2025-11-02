# Vector Search Architecture Guide

> **Last Updated**: 2025-11-02
>
> **Status**: Production-ready (LOG-178 complete - RAG pipeline with confidence scoring)

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Usage Patterns](#usage-patterns)
5. [Performance Tuning](#performance-tuning)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)

---

## Overview

### What is Vector Search?

Vector search (semantic search) enables finding relevant documents based on **meaning**, not just keyword matching. It works by converting text into high-dimensional vectors (embeddings) and measuring similarity in vector space.

**Example:**

- Query: "What is AI?"
- Traditional keyword search: Matches documents containing "AI", "What", "is"
- Vector search: Matches documents about artificial intelligence, machine learning, neural networks, etc.

### Why pgvector?

We use [pgvector](https://github.com/pgvector/pgvector) for vector storage and similarity search because:

- Native PostgreSQL extension (no additional infrastructure)
- Efficient similarity search with indexing (IVFFlat, HNSW)
- Supports multiple distance metrics (cosine, L2, inner product)
- Integrates seamlessly with existing SQLAlchemy models

### Key Metrics

- **Embedding Model**: `text-embedding-3-small` (OpenAI)
- **Vector Dimensions**: 1536
- **Chunk Size**: 750 tokens (target)
- **Chunk Overlap**: 100 tokens
- **Default Top-K**: 10 results
- **Similarity Threshold**: 0.3 (configurable)
- **Target Latency**: <500ms per query

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Document Upload                          │
│  User uploads PDF/TXT → Document Processor Service          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 Text Extraction (Phase 1)                   │
│  PyPDF2/Mammoth → Extracted text stored in Document model   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 Chunking Service (Phase 2)                  │
│  - Splits text into ~750 token chunks                       │
│  - Preserves sentence boundaries (NLTK)                     │
│  - 100 token overlap between chunks                         │
│  - Stores in DocumentChunk table                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Embedding Service (Phase 3)                    │
│  - Generates embeddings via OpenAI API                      │
│  - Batch processing (100 chunks per call)                   │
│  - Retry logic for rate limits (3 attempts, exp backoff)    │
│  - Stores vector(1536) in pgvector column                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Vector Index (pgvector)                   │
│  IVFFlat index on embedding column (lists=100)              │
│  Cosine distance operator for similarity search             │
└─────────────────────────────────────────────────────────────┘


                    ┌─── Query Flow ───┐

┌─────────────────────────────────────────────────────────────┐
│                    User Query (Threads)                     │
│  "What is artificial intelligence?"                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            Query Agent (LangGraph RAG Pipeline)             │
│  Step 1: retrieve_context()                                 │
│    - Calls VectorSearchService.search_similar_chunks()      │
│    - Filters by space_id (optional)                         │
│    - Returns top-5 most relevant chunks                     │
│                                                              │
│  Step 2: generate_response()                                │
│    - Builds prompt with numbered context chunks             │
│    - LLM generates response with [N] citations              │
│                                                              │
│  Step 3: add_citations()                                    │
│    - Extracts citation numbers from response                │
│    - Enriches with document metadata (title, page, etc.)    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Streaming Response (SSE)                  │
│  - Real-time token streaming to frontend                    │
│  - Citations displayed inline with response                 │
│  - Source badges (Document type, page numbers)              │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Document Chunks Table (holds text chunks with embeddings)
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,              -- Order within document
    token_count INTEGER NOT NULL,              -- For token budget management
    start_char BIGINT NOT NULL,                -- Character position in original
    end_char BIGINT NOT NULL,
    chunk_metadata JSONB,                      -- Flexible metadata (page_num, etc.)
    embedding vector(1536),                    -- OpenAI text-embedding-3-small
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_chunk_index ON document_chunks(chunk_index);

-- Vector similarity index (IVFFlat with 100 lists)
CREATE INDEX idx_document_chunks_embedding_cosine
    ON document_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

**Index Types:**

- **IVFFlat** (current): Approximate nearest neighbor, good balance of speed/accuracy, requires `lists` parameter tuning
- **HNSW** (future): Higher accuracy, slightly slower build time, better for large-scale deployments

---

## Components

### 1. ChunkingService (`apps/api/app/services/chunking_service.py`)

**Responsibilities:**

- Split documents into semantically meaningful chunks
- Preserve sentence boundaries (NLTK punkt tokenizer)
- Manage token counts (tiktoken with gpt-4 encoding)
- Handle chunk overlap to avoid context loss

**Configuration:**

```python
TARGET_CHUNK_SIZE = 750     # Target tokens per chunk
OVERLAP_SIZE = 100          # Tokens overlapping between chunks
MIN_CHUNK_SIZE = 500        # Minimum chunk size
MAX_CHUNK_SIZE = 1000       # Maximum chunk size
```

**Key Methods:**

- `chunk_document(document_id, db)` - Main entry point, chunks and persists to DB
- `create_chunks(text, metadata)` - Pure function for creating chunks
- `preserve_sentences(text, target_size)` - Ensures sentence boundaries

**Testing:**

- Unit tests: `tests/test_chunking_service.py`
- Edge cases: Empty documents, very long sentences, multi-language text

---

### 2. EmbeddingService (`apps/api/app/services/embedding_service.py`)

**Responsibilities:**

- Generate vector embeddings via OpenAI API
- Batch processing for cost/performance
- Retry logic for API failures
- Cost estimation utilities

**Configuration:**

```python
OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"  # 1536 dimensions
EMBEDDING_BATCH_SIZE = 100                         # Chunks per API call
MAX_RETRIES = 3                                    # Retry attempts
RATE_LIMIT_DELAY = 0.1                             # Seconds between batches
```

**Key Methods:**

- `generate_embedding(text)` - Single text → vector
- `generate_batch_embeddings(texts)` - Batch text → vectors (efficient)
- `embed_document_chunks(document_id, db)` - Full document embedding workflow
- `estimate_cost(num_tokens)` - Cost calculation for budgeting

**Retry Logic:**

```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type(RateLimitError),
    reraise=True,
)
```

**Cost Management:**

- `text-embedding-3-small`: ~$0.02 per 1M tokens
- Average cost per document: ~$0.001 - $0.01 (depends on size)
- Use `estimate_cost()` before batch operations

**Testing:**

- Unit tests: `tests/test_embedding_service.py`
- Mocked API responses for CI/CD
- Integration tests with real OpenAI API (manual)

---

### 3. VectorSearchService (`apps/api/app/services/vector_search_service.py`)

**Responsibilities:**

- Semantic similarity search using pgvector
- Query embedding generation
- Metadata filtering (space, documents)
- Similarity threshold enforcement

**Key Methods:**

```python
async def search_similar_chunks(
    query: str,
    db: AsyncSession,
    space_id: UUID | None = None,
    document_ids: list[UUID] | None = None,
    limit: int = 10,
    similarity_threshold: float = 0.0,
) -> list[SearchResult]:
    """
    Find similar document chunks using cosine similarity.

    Returns:
        List of SearchResult with:
        - chunk: DocumentChunk model
        - document: Document model
        - similarity_score: 1.0 (identical) to 0.0 (different)
        - distance: Cosine distance (lower is better)
    """
```

**Similarity Metrics:**

- **Cosine Distance**: `<=> operator` in pgvector
- **Similarity Score**: `1 - cosine_distance` (0.0 to 1.0)
- **Threshold Interpretation**:
  - `>= 0.8`: Excellent match (high confidence)
  - `0.6 - 0.8`: Good match (relevant)
  - `0.4 - 0.6`: Fair match (loosely related)
  - `< 0.4`: Low relevance (consider filtering)

**Performance:**

- IVFFlat index: ~10-50ms for top-10 search (10K chunks)
- Scales linearly with `limit` parameter
- Metadata filters have minimal overhead (indexed columns)

**Testing:**

- Unit tests: `tests/test_vector_search_service.py`
- Integration tests: `tests/test_vector_search_integration.py`

---

### 4. Query Agent (`apps/api/app/agents/query_agent.py`)

**Responsibilities:**

- RAG (Retrieval-Augmented Generation) pipeline
- Context retrieval via vector search
- Response generation with citations
- Citation extraction and enrichment

**LangGraph Workflow:**

```python
workflow:
    retrieve_context (VectorSearchService)
        ↓
    generate_response (LLM with context)
        ↓
    add_citations (Extract [N] markers)
        ↓
    END (Return response + citations)
```

**Context Window Management:**

```python
# Current settings
TOP_K_CHUNKS = 5                    # Retrieve top 5 chunks
SIMILARITY_THRESHOLD = 0.3          # Minimum relevance
```

**Citation Format:**

```python
# Response includes [N] markers
"According to [1], artificial intelligence is... [2] also mentions..."

# Citations array includes:
{
    "index": 1,
    "text": "chunk text...",
    "document_id": "uuid",
    "document_title": "AI Report.pdf",
    "chunk_index": 3,
    "similarity_score": 0.87,
    "page_number": 12,
    "start_char": 1500,
    "end_char": 2250,
}
```

---

### 5. GraphQL API (`apps/api/app/graphql/`)

**Query:**

```graphql
query SearchDocuments($input: SearchDocumentsInput!) {
  searchDocuments(input: $input) {
    chunk {
      id
      chunkText
      chunkIndex
      tokenCount
      startChar
      endChar
      chunkMetadata
    }
    document {
      id
      name
      fileType
      spaceId
    }
    similarityScore
    distance
  }
}
```

**Input:**

```graphql
input SearchDocumentsInput {
  query: String! # Search query text
  limit: Int = 10 # Max results (1-100)
  similarityThreshold: Float = 0.0 # Min similarity (0.0-1.0)
  spaceId: ID # Optional space filter
  documentIds: [ID!] # Optional doc filter
}
```

**Frontend Hook:**

```typescript
import { useSearchDocuments } from '@/hooks/useVectorSearch';

const { results, isLoading, error } = useSearchDocuments({
  query: 'What is machine learning?',
  limit: 10,
  similarityThreshold: 0.6,
  spaceId: 'space-uuid',
});
```

---

## Usage Patterns

### 1. Basic Semantic Search (GraphQL)

```typescript
// Frontend: Use auto-generated React Query hook
import { useSearchDocuments } from '@/hooks/useVectorSearch';

const { results, isLoading } = useSearchDocuments({
  query: 'What are the revenue projections for Q4?',
  limit: 5,
});

// Results contain chunk + document + scores
results.forEach((result) => {
  console.log(result.document.name); // "Q4_Report.pdf"
  console.log(result.chunk.chunkText); // "Revenue projected at $2.5M..."
  console.log(result.similarityScore); // 0.87 (87% similarity)
});
```

### 2. RAG Pipeline (Backend)

```python
# Backend: Query agent automatically uses vector search
from app.agents.query_agent import create_query_agent

agent = create_query_agent()
result = await agent.ainvoke({
    "query": "Summarize the key findings in our research reports",
    "space_id": space_uuid,
    "db": db_session,
})

print(result["response"])    # LLM-generated answer
print(result["citations"])   # Source attributions with metadata
```

### 3. Direct Service Access (Advanced)

```python
# Direct VectorSearchService usage (for custom workflows)
from app.services.vector_search_service import get_vector_search_service

vector_search = get_vector_search_service()
results = await vector_search.search_similar_chunks(
    query="machine learning algorithms",
    db=db,
    space_id=space_id,
    limit=10,
    similarity_threshold=0.7,  # Only high-quality matches
)

for result in results:
    print(f"{result.document.name}: {result.similarity_score:.2%}")
```

### 4. Filtering by Document IDs

```python
# Search within specific documents only
results = await vector_search.search_similar_chunks(
    query="data privacy concerns",
    db=db,
    document_ids=[doc1_uuid, doc2_uuid],  # Limit to these docs
    limit=5,
)
```

---

## Prompt Engineering

The RAG pipeline's effectiveness heavily depends on well-crafted system prompts and query handling. This section documents the prompt engineering patterns used in the Query Agent.

### System Prompt Design

The agent uses a specialized system prompt (`app/agents/query_agent.py:SYSTEM_PROMPT`) that emphasizes:

**1. Accuracy First**

```
"Only provide information that is directly supported by the context"
```

- Prevents hallucination by constraining responses to source documents
- Agent refuses to speculate when context is insufficient
- Prioritizes correctness over completeness

**2. Citation Requirements**

```
"Always cite your sources using [N] notation (e.g., [1], [2])"
```

- Forces the agent to ground every claim in source documents
- Enables source attribution in the UI
- Citation format: `[1]`, `[2]`, etc. matching numbered context chunks

**3. Uncertainty Acknowledgment**

```
"If the context lacks sufficient information, clearly state this rather than speculating"
```

- Default fallback response: _"I don't have enough information in the provided documents to answer this question accurately."_
- Agent suggests what additional information would be needed
- Prevents low-quality responses

**4. Professional Tone**

```
"Use a professional, helpful tone suitable for business and research contexts"
```

- Clear, concise language
- No unnecessary elaboration
- Business-appropriate formality

### Few-Shot Examples

The agent includes few-shot examples (`app/agents/query_agent.py:FEW_SHOT_EXAMPLES`) to improve response quality:

**Example 1: Straightforward Answer with Citation**

```
Context: [1] The company's Q4 revenue was $2.5M, representing a 15% increase from Q3.
Question: What was the Q4 revenue?
Answer: The Q4 revenue was $2.5M, which was a 15% increase from Q3 [1].
```

**Example 2: Partial Information with Future Plans**

```
Context: [1] Our product supports PostgreSQL and MySQL databases.
         [2] MongoDB integration is planned for Q2 2024.
Question: Does the product support MongoDB?
Answer: MongoDB integration is not currently supported but is planned for Q2 2024 [2].
        The product currently supports PostgreSQL and MySQL [1].
```

**Example 3: Insufficient Information**

```
Context: [1] The user authentication system uses JWT tokens with a 24-hour expiration.
Question: What is the database backup schedule?
Answer: I don't have enough information in the provided documents to answer this question
        about database backup schedules. The available context only discusses user
        authentication [1].
```

### Context Formatting

Context chunks are formatted with numbered citations before being sent to the LLM:

```python
# Original chunks
["The company's revenue was $2.5M", "Market share increased by 10%"]

# Formatted for LLM
[1] The company's revenue was $2.5M

[2] Market share increased by 10%

Question: What was the revenue?
```

This numbering:

- Enables the LLM to use `[N]` citation markers
- Matches citations to source chunks in post-processing
- Preserves chunk order by relevance (highest similarity first)

### Token Budget Management

The agent implements strict token budget controls to prevent context overflow:

```python
# app/agents/query_agent.py
MAX_CONTEXT_WINDOW = 8000        # Total GPT-4 turbo window
MAX_RESPONSE_TOKENS = 2000       # Reserved for response
SYSTEM_PROMPT_OVERHEAD = 200     # System prompt tokens
FEW_SHOT_OVERHEAD = 400          # Few-shot examples
QUERY_OVERHEAD = 100             # User query tokens
SAFETY_MARGIN = 200              # Buffer for edge cases

# Available for context chunks
MAX_CONTEXT_TOKENS = 5100        # ~68% of window
```

**Adaptive Context Trimming:**

If retrieved chunks exceed the token budget, the agent:

1. Calculates total tokens using tiktoken
2. Sorts chunks by similarity score (highest first)
3. Takes chunks until budget is reached
4. Discards lowest-relevance chunks

**Example:**

```python
# Retrieved 10 chunks (8K tokens total) - exceeds 5.1K budget
# Agent keeps top 6 chunks (4.9K tokens) by relevance
# Logs: "Trimmed context from 10 to 6 chunks (8000 → 4900 tokens)"
```

This ensures:

- Most relevant context is always included
- Lower-quality context is sacrificed first
- Total prompt stays within model limits

### Prompt Iteration Best Practices

**Testing Prompt Changes:**

Use the RAG pipeline integration tests to validate prompt modifications:

```bash
# Run confidence scoring tests after prompt changes
poetry run pytest tests/test_rag_pipeline_integration.py::test_calculate_overall_confidence -v
```

**Key Metrics to Track:**

1. **Citation Rate**: % of responses with proper citations
2. **Hallucination Rate**: % of responses contradicting sources
3. **Confidence Scores**: Average confidence across test queries
4. **"I don't know" Rate**: % of queries triggering fallback

**Common Issues & Fixes:**

| Issue                             | Fix                                                        |
| --------------------------------- | ---------------------------------------------------------- |
| Agent doesn't cite sources        | Add more emphasis in system prompt + few-shot examples     |
| Agent speculates without evidence | Strengthen "accuracy first" directive                      |
| Citations don't match context     | Verify context numbering format                            |
| Responses too verbose             | Add "be concise" to system prompt                          |
| Low confidence scores             | Improve chunking strategy or increase similarity threshold |
| Too many "I don't know" responses | Lower similarity threshold or retrieve more chunks         |

---

## Performance Tuning

### 1. Index Optimization

**Current Index:**

```sql
CREATE INDEX idx_document_chunks_embedding_cosine
    ON document_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

**Tuning `lists` Parameter:**

- **Formula**: `lists ≈ sqrt(total_rows)`
- **10K chunks**: `lists = 100` (current)
- **100K chunks**: `lists = 316`
- **1M chunks**: `lists = 1000`

**Trade-offs:**

- Fewer lists: Faster index build, lower accuracy
- More lists: Slower index build, higher accuracy

**Rebuild Index:**

```sql
DROP INDEX idx_document_chunks_embedding_cosine;
CREATE INDEX idx_document_chunks_embedding_cosine
    ON document_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 316);  -- Adjust based on data size
```

### 2. Query Performance

**Factors affecting speed:**

- `limit` parameter (10 vs 100 results)
- Number of chunks in DB (indexed search scales well)
- Metadata filters (space_id is indexed)
- Embedding generation time (~50-100ms per query)

**Optimization tips:**

- Use `similarity_threshold` to reduce result set
- Filter by `space_id` to limit search scope
- Cache common queries (future: Redis caching)
- Batch queries when possible

### 3. Embedding Generation

**Batch Processing:**

```python
# Efficient batch embedding (100 chunks per call)
await embedding_service.embed_document_chunks(document_id, db)

# Cost: ~$0.001 per document (vs $0.01 for individual calls)
```

**Rate Limiting:**

- OpenAI Tier 1: 3,500 RPM, 1M TPM
- Current batch size: 100 chunks/call
- Rate limit delay: 0.1s between batches
- Retry on `RateLimitError` (exponential backoff)

### 4. Cost Management

**Embedding costs (text-embedding-3-small):**

- Rate: $0.020 per 1M tokens
- Average document: 5,000 tokens = $0.0001
- 10,000 documents: ~$1.00

**Cost estimation:**

```python
from app.services.embedding_service import get_embedding_service

service = get_embedding_service()
cost = service.estimate_cost(num_tokens=500000)  # $0.01
```

---

## Troubleshooting

### Empty Search Results

**Symptoms:**

- Query returns 0 results
- `similarityThreshold` too high

**Solutions:**

1. **Lower threshold**: Try `similarityThreshold = 0.0` first
2. **Check embeddings exist**:
   ```sql
   SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;
   ```
3. **Verify document processed**: Check `documents.status = 'PROCESSED'`
4. **Test with VectorSearchDebugger**: `/debug/vector-search` (dev only)

### Slow Queries (>500ms)

**Symptoms:**

- Search takes >1 second
- Frontend timeouts

**Solutions:**

1. **Check index exists**:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'document_chunks';
   ```
2. **Rebuild index** (if data size changed significantly)
3. **Reduce `limit`**: Try `limit = 5` instead of `limit = 50`
4. **Add `space_id` filter**: Narrows search scope

### Embedding Failures

**Symptoms:**

- `Document.status = 'FAILED'`
- `processing_error` mentions OpenAI API

**Common causes:**

1. **Missing API key**: Check `OPENAI_API_KEY` in `.env`
2. **Rate limit**: Wait and retry (automatic retry in service)
3. **Invalid text**: Empty or malformed chunks
4. **Network issues**: Check logs for connection errors

**Debug:**

```python
# Check which chunks failed to embed
SELECT dc.id, dc.chunk_text, d.name
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE dc.embedding IS NULL;
```

### Citation Extraction Issues

**Symptoms:**

- Response has no citations
- Citation numbers don't match chunks

**Debug:**

```python
# Check agent state
from app.agents.query_agent import extract_citations

citations = extract_citations(
    response="According to [1]...",
    context=["chunk 1 text", "chunk 2 text"],
    search_results=results,
)

print(citations)  # Should show matched citations
```

**Common issues:**

- LLM didn't use `[N]` format (improve prompt)
- Context array empty (check `retrieve_context` step)
- Citation number out of range (LLM hallucination)

### Low Confidence Scores

**Symptoms:**

- Queries consistently score below 0.7 confidence
- Many queries trigger "I don't know" fallback
- Citation quality seems poor despite relevant results

**Root Causes & Solutions:**

1. **Poor Semantic Match**
   - **Cause**: Query uses different terminology than documents
   - **Solution**: Improve chunking to preserve more context, or use query rewriting
   - **Check**: Review similarity scores in search results

2. **Insufficient Context**
   - **Cause**: Retrieved chunks don't contain enough information
   - **Solution**: Increase `limit` parameter (default: 5 → try 10)
   - **Check**: Verify `retrieve_context` step retrieves relevant chunks

3. **Threshold Too High**
   - **Cause**: `similarity_threshold` filters out relevant chunks
   - **Solution**: Lower threshold from 0.3 → 0.0 to see all matches
   - **Check**: Compare results with different thresholds

4. **Chunking Issues**
   - **Cause**: Chunks are too small/large or split poorly
   - **Solution**: Adjust chunking parameters (750 tokens default)
   - **Check**: Review chunk boundaries in database

**Configuration:**

```python
# app/services/citation_service.py
HIGH_CONFIDENCE_THRESHOLD = 0.7  # Return response normally
LOW_CONFIDENCE_THRESHOLD = 0.5   # Trigger fallback warning
```

**Debug Confidence Calculation:**

```python
from app.services.citation_service import CitationService

service = CitationService()

# Test with your search results
confidence = service.calculate_overall_confidence(
    search_results=results,
    num_citations_used=2,
)

print(f"Confidence: {confidence:.2%}")

# Check individual chunk scores
for result in results:
    print(f"{result.document.name}: {result.similarity_score:.2%}")
```

### Hallucination Detection Failures

**Symptoms:**

- Agent makes claims not supported by source documents
- Citations reference incorrect information
- Validation shows `is_valid = False`

**Solutions:**

1. **Strengthen System Prompt**:
   - Emphasize "accuracy first" directive
   - Add more "I don't know" examples
   - Reduce creative freedom in prompt

2. **Increase Citation Requirements**:
   - Require citations for every claim
   - Penalize responses without proper attribution
   - Use stricter hallucination detection threshold

3. **Review Context Quality**:
   - Check if retrieved chunks actually contain relevant info
   - Verify similarity scores are high enough (>0.5)
   - Ensure chunks aren't truncated mid-sentence

**Test Hallucination Detection:**

```python
from app.services.citation_service import CitationService

service = CitationService()

response = "The Q4 revenue was $3M [1]"  # Claiming $3M
context_chunks = ["The Q4 revenue was $2.5M"]  # Actually says $2.5M

validation = service.detect_hallucinations(
    response=response,
    context_chunks=context_chunks,
    citations=[{"index": 1, "text": context_chunks[0]}],
)

print(validation)
# {
#     "is_valid": False,  # Hallucination detected
#     "quality_score": 0.3,
#     "issues": ["Response contradicts source document"],
# }
```

### SSE Streaming Timeouts

**Symptoms:**

- Queries timeout after 120 seconds
- Frontend shows "Query processing timed out" error
- No response tokens received

**Root Causes:**

1. **Slow Vector Search**:
   - **Check**: Query latency in logs
   - **Solution**: Optimize index, add filters (space_id, document_ids)

2. **Large Context**:
   - **Check**: Number of chunks retrieved and token count
   - **Solution**: Reduce `limit` or implement better context trimming

3. **LLM API Delays**:
   - **Check**: OpenAI API status and rate limits
   - **Solution**: Implement retry logic, use shorter max_tokens

**Configuration:**

```python
# app/routes/query_stream.py
QUERY_TIMEOUT_SECONDS = 120  # Adjust if needed (current: 2 minutes)
```

**Test Timeout Handling:**

```bash
# Run timeout test
poetry run pytest tests/test_query_stream_endpoint.py::test_query_timeout_handling -v
```

### Document Processing Stuck

**Symptoms:**

- Document status remains `PROCESSING` indefinitely
- No chunks created in `document_chunks` table
- Processing doesn't fail or complete

**Debug Steps:**

1. **Check Processing Status**:

   ```sql
   SELECT id, name, status, processing_error, updated_at
   FROM documents
   WHERE status = 'PROCESSING'
   ORDER BY updated_at DESC;
   ```

2. **Check Background Tasks**:

   ```bash
   # View API logs for processing errors
   docker compose logs -f api | grep "document_processor"
   ```

3. **Manual Reprocessing**:

   ```python
   from app.services.document_processor import get_document_processor

   processor = get_document_processor()
   await processor.process_document(document_id=uuid, db=session)
   ```

4. **Common Issues**:
   - File not accessible (check storage path)
   - Text extraction failed (check PyMuPDF/docx compatibility)
   - Chunking service error (check NLTK data downloaded)
   - Embedding service timeout (check OpenAI API key)

---

## API Reference

### Python Services

#### ChunkingService

```python
from app.services.chunking_service import chunk_document

# Chunk and persist document
chunks = await chunk_document(document_id=uuid, db=session)

# Returns: list[DocumentChunk] models
```

#### EmbeddingService

```python
from app.services.embedding_service import get_embedding_service

service = get_embedding_service()

# Single embedding
vector = await service.generate_embedding("Hello world")
# Returns: list[float] (1536 dimensions)

# Batch embeddings
vectors = await service.generate_batch_embeddings(["text1", "text2"])
# Returns: list[list[float]]

# Full document workflow
await service.embed_document_chunks(document_id=uuid, db=session)
```

#### VectorSearchService

```python
from app.services.vector_search_service import get_vector_search_service

service = get_vector_search_service()

results = await service.search_similar_chunks(
    query="machine learning",
    db=session,
    space_id=uuid,            # Optional
    document_ids=[uuid1],     # Optional
    limit=10,                 # Default: 10
    similarity_threshold=0.7, # Default: 0.0
)

# Returns: list[SearchResult]
# SearchResult(chunk, document, similarity_score, distance)
```

### TypeScript Hooks

#### useSearchDocuments

```typescript
import { useSearchDocuments } from '@/hooks/useVectorSearch';

const {
  results, // SearchResult[]
  isLoading, // boolean
  error, // Error | null
  refetch, // () => void
  query, // Raw React Query object
} = useSearchDocuments({
  query: 'What is AI?',
  limit: 10,
  similarityThreshold: 0.6,
  spaceId: 'uuid',
  documentIds: ['uuid1', 'uuid2'],
});
```

### GraphQL Schema

```graphql
type Query {
  searchDocuments(input: SearchDocumentsInput!): [SearchResult!]!
}

input SearchDocumentsInput {
  query: String!
  limit: Int
  similarityThreshold: Float
  spaceId: ID
  documentIds: [ID!]
}

type SearchResult {
  chunk: DocumentChunk!
  document: Document!
  similarityScore: Float!
  distance: Float!
}

type DocumentChunk {
  id: ID!
  documentId: ID!
  chunkText: String!
  chunkIndex: Int!
  tokenCount: Int!
  startChar: Int!
  endChar: Int!
  chunkMetadata: JSON!
  createdAt: DateTime!
}
```

---

## Future Enhancements

### Phase 2 (Hybrid Agent)

- [ ] Integrate with SQL agent for hybrid queries
- [ ] Query router (classify: SQL vs Document vs Hybrid)
- [ ] Unified citation format (SQL + Document sources)

### Phase 3 (Advanced Search)

- [ ] Hybrid search (vector + keyword BM25)
- [ ] Re-ranking with cross-encoder models
- [ ] Query expansion (synonyms, related terms)
- [ ] Metadata boosting (prioritize recent docs, etc.)
- [ ] Search result caching (Redis)

### Performance

- [ ] Switch to HNSW index for better accuracy
- [ ] Implement embedding caching
- [ ] Add search analytics (query latency, result quality)
- [ ] Cost monitoring dashboard

---

## Related Documentation

- [Backend Guide](./backend-guide.md) - FastAPI patterns, services
- [Frontend Guide](./frontend-guide.md) - React Query, GraphQL
- [Hybrid Architecture](../HYBRID_ARCHITECTURE.md) - SQL + Document integration
- [ADR-002: AI Orchestration](../adr/002-ai-agent-orchestration.md) - LangGraph + CrewAI

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review backend logs: `docker compose logs api`
3. Use VectorSearchDebugger: `/debug/vector-search` (dev only)
4. Create Linear ticket in Olympus MVP project
