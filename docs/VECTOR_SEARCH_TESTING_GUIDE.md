# Vector Search Testing Guide

## Overview

This guide helps you establish realistic baseline scores for vector search in your Olympus deployment. The test examples in the codebase use dummy data with **unrealistically high scores** (0.80-0.90+). Real-world OpenAI embeddings typically produce **lower scores** (0.50-0.80 for good matches).

## Important Context

### Test Code vs Reality

The unit tests (`test_vector_search_service.py`) use **fake embeddings**:

```python
# ❌ NOT REALISTIC - just for unit testing
mock_embedding = [0.1] * 1536
```

These produce artificially high similarity scores:

- Distance 0.1 → Similarity 0.9 (90%) ❌ Too optimistic
- Distance 0.2 → Similarity 0.8 (80%) ❌ Too optimistic

### Real-World Expectations

With **actual OpenAI embeddings** (`text-embedding-3-small`):

| Similarity Score | Cosine Distance | Meaning             | Example Query                     |
| ---------------- | --------------- | ------------------- | --------------------------------- |
| **0.90-0.98**    | 0.02-0.10       | Nearly identical    | Exact quote from document         |
| **0.80-0.90**    | 0.10-0.20       | Highly relevant     | Same topic, close paraphrase      |
| **0.70-0.80**    | 0.20-0.30       | Moderately relevant | Related concepts, similar wording |
| **0.60-0.70**    | 0.30-0.40       | Somewhat relevant   | Tangentially related topics       |
| **0.50-0.60**    | 0.40-0.50       | Weakly relevant     | Broad topic match                 |
| **<0.50**        | >0.50           | Not very relevant   | Different topics entirely         |

### Typical Results for Good Queries

- **Top result**: 0.70-0.85 (70-85%)
- **Next 2-3 results**: 0.65-0.75 (65-75%)
- **Remaining results**: 0.55-0.65 (55-65%)

**Excellent results** (0.85-0.95) are **rare** - only when documents contain near-exact matches to your query.

---

## Testing Steps

### 1. Upload Test Documents

Create 3-5 sample documents with **known content** you can query against. Recommended types:

1. **Technical Document** (e.g., machine learning guide)
   - Known passage: "Machine learning algorithms include supervised learning, unsupervised learning, and reinforcement learning."

2. **Financial Report** (e.g., Q3 2024 earnings)
   - Known passage: "Revenue increased 23% year-over-year to $4.2 million in Q3 2024."

3. **Product Specification** (e.g., feature requirements)
   - Known passage: "The authentication system must support OAuth 2.0, SAML, and SSO integration."

4. **Meeting Notes** (e.g., team standup)
   - Known passage: "Action items: John to review PR #42, Sarah to deploy staging by Friday."

**Upload via**: Dashboard → Space → Upload Documents

### 2. Wait for Processing

Check document status:

- Navigate to `/debug/vector-search` (VectorSearchDebugger)
- Ensure all documents show `status: processed`
- Verify embeddings exist: Check "Available Documents" dropdown

### 3. Run Test Queries

Use the VectorSearchDebugger (`/debug/vector-search`) to test queries and record scores.

#### Query Type A: Exact Quote (Expected: 0.85-0.95)

**Query**: Copy exact sentence from document

```
Machine learning algorithms include supervised learning, unsupervised learning, and reinforcement learning.
```

**Expected**:

- Similarity: 0.90-0.95
- Should return the exact chunk containing this text

#### Query Type B: Close Paraphrase (Expected: 0.75-0.85)

**Query**: Rephrase the concept in similar words

```
What are the main types of ML algorithms?
```

**Expected**:

- Similarity: 0.75-0.85
- Should return chunks about ML algorithm categories

#### Query Type C: Related Concept (Expected: 0.65-0.75)

**Query**: Broader topic, different wording

```
How does AI training work?
```

**Expected**:

- Similarity: 0.65-0.75
- Should return chunks about training/learning processes

#### Query Type D: Tangentially Related (Expected: 0.55-0.65)

**Query**: Same domain, different specific topic

```
What is neural network architecture?
```

**Expected**:

- Similarity: 0.55-0.65
- May return ML-related chunks but not the exact passage

#### Query Type E: Unrelated (Expected: <0.55)

**Query**: Completely different topic

```
How do I bake chocolate chip cookies?
```

**Expected**:

- Similarity: <0.55
- Should return low scores or no results (if threshold is set)

### 4. Document Your Baseline Scores

Create a reference table:

```markdown
## Vector Search Baseline Scores - [Your Corpus Name]

Date: [Today's Date]
Embedding Model: text-embedding-3-small (1536 dimensions)
Chunk Size: ~750 tokens
Documents Tested: [List documents]

| Query Type  | Query                                       | Document     | Top Score | Rating    | Notes                        |
| ----------- | ------------------------------------------- | ------------ | --------- | --------- | ---------------------------- |
| Exact Quote | "Machine learning algorithms include..."    | ml-guide.pdf | 0.92      | Excellent | Perfect match                |
| Paraphrase  | "What are the main types of ML algorithms?" | ml-guide.pdf | 0.81      | High      | Close semantic match         |
| Related     | "How does AI training work?"                | ml-guide.pdf | 0.71      | Moderate  | Broader concept              |
| Tangential  | "What is neural network architecture?"      | ml-guide.pdf | 0.58      | Weak      | Same domain, different topic |
| Unrelated   | "How do I bake chocolate chip cookies?"     | ml-guide.pdf | 0.23      | Poor      | No relation                  |
```

Save this to: `docs/vector-search-baseline-[YYYY-MM-DD].md`

### 5. Adjust Similarity Thresholds

Based on your baseline scores, set appropriate thresholds:

**General Search** (most common):

```python
similarity_threshold=0.60  # 60% - Captures somewhat relevant results
```

**High Precision** (strict matching):

```python
similarity_threshold=0.75  # 75% - Only highly relevant results
```

**Exploratory Search** (cast wide net):

```python
similarity_threshold=0.50  # 50% - Includes tangentially related content
```

**Update in**:

- `apps/api/app/graphql/query.py` (default for GraphQL queries)
- `apps/web/src/components/debug/VectorSearchDebugger.tsx` (UI default)

---

## Common Issues & Troubleshooting

### Issue: All scores are very low (<0.50)

**Possible causes**:

1. **Embeddings not generated** - Check `document_chunks` table:
   ```sql
   SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;
   ```
2. **Wrong query phrasing** - Try rephrasing your query to match document language
3. **Document chunking too small/large** - Check chunk sizes in database
4. **Poor text extraction** - Verify `extracted_text` field has clean content

**Fixes**:

- Re-upload documents if extraction failed
- Adjust chunking parameters if needed
- Try more specific queries that match document vocabulary

### Issue: Scores vary wildly (0.30 to 0.95)

**This is normal!** Vector search scores depend heavily on:

- Query phrasing
- Document writing style
- Chunk boundaries
- Topic specificity

**Best practice**: Focus on **relative ranking** (is the top result correct?) rather than absolute scores.

### Issue: Irrelevant results scoring high (>0.70)

**Possible causes**:

1. **Query too broad** - Make query more specific
2. **Documents have similar general language** - Common in technical docs
3. **Chunk overlap** - Similar chunks from same section

**Fixes**:

- Add more context to your query
- Filter by `document_ids` or `space_id` to narrow search scope
- Increase chunk size to capture more context

---

## Recommended Thresholds by Use Case

### Thread/Chat Q&A (User-facing)

```python
similarity_threshold=0.65
limit=5
```

**Reasoning**: Balance relevance and recall. Users expect top 5 results to be useful.

### Document Retrieval (RAG pipeline)

```python
similarity_threshold=0.70
limit=3
```

**Reasoning**: Feed only high-quality context to LLM to reduce hallucinations.

### Autocomplete/Suggestions (UI helper)

```python
similarity_threshold=0.55
limit=10
```

**Reasoning**: More permissive to surface possibilities user might not think of.

### Admin/Debug Interface

```python
similarity_threshold=0.50
limit=20
```

**Reasoning**: Show everything potentially relevant for troubleshooting.

---

## Performance Notes

### Expected Latency

- Query embedding generation: 50-150ms (OpenAI API)
- Database vector search: 50-200ms (pgvector IVFFlat index)
- **Total**: <500ms per query (target)

### Cost Estimates

- Embedding generation: ~$0.02 per 1M tokens
- Typical document (10 pages): ~$0.0002 per document
- Typical query: ~$0.000001 per search (negligible)

**Bottom line**: Vector search is **very cheap** at MVP scale.

---

## Next Steps After Baseline Testing

1. **Document your findings** in a baseline file
2. **Set default threshold** in GraphQL resolver (currently 0.0, should be 0.60-0.65)
3. **Update VectorSearchDebugger UI** default slider value
4. **Create monitoring** for search quality over time
5. **Consider A/B testing** different thresholds with users

---

## References

- OpenAI Embeddings Docs: https://platform.openai.com/docs/guides/embeddings
- pgvector Performance: https://github.com/pgvector/pgvector#performance
- Internal: `docs/guides/vector-search-guide.md` (complete architecture)
