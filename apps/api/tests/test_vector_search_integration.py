"""
Integration test for vector search with GraphQL.

This test requires:
- API server running
- Database with pgvector extension enabled
- Test data with embedded chunks

Run with: pytest tests/test_vector_search_integration.py -v -s
"""

import pytest

# Mark as integration test and skip by default (run manually when needed)
pytestmark = pytest.mark.skip(
    reason="Integration test - run manually with real database and embeddings"
)


@pytest.mark.asyncio
async def test_graphql_search_documents_integration():
    """
    Integration test for searchDocuments GraphQL query.

    Prerequisites:
    1. API server running at http://localhost:8000
    2. Database with test data (documents with embeddings)
    3. OPENAI_API_KEY configured

    Test flow:
    1. Query searchDocuments via GraphQL
    2. Verify results contain expected fields
    3. Verify similarity scores are calculated correctly
    """
    import httpx

    graphql_url = "http://localhost:8000/graphql"

    # GraphQL query
    query = """
    query SearchDocuments($input: SearchDocumentsInput!) {
        searchDocuments(input: $input) {
            chunk {
                id
                chunkText
                chunkIndex
                tokenCount
            }
            document {
                id
                name
                fileType
            }
            similarityScore
            distance
        }
    }
    """

    # Query variables
    variables = {
        "input": {
            "query": "What is machine learning?",
            "limit": 5,
            "similarityThreshold": 0.5,
        }
    }

    # Make GraphQL request
    async with httpx.AsyncClient() as client:
        response = await client.post(
            graphql_url,
            json={"query": query, "variables": variables},
            timeout=30.0,
        )

    # Verify response
    assert response.status_code == 200, f"GraphQL request failed: {response.text}"

    data = response.json()
    assert "data" in data, f"No data in response: {data}"
    assert "searchDocuments" in data["data"], f"No searchDocuments in response: {data}"

    results = data["data"]["searchDocuments"]

    # Verify results structure
    if len(results) > 0:
        result = results[0]

        # Verify chunk fields
        assert "chunk" in result
        assert "id" in result["chunk"]
        assert "chunkText" in result["chunk"]
        assert "chunkIndex" in result["chunk"]
        assert "tokenCount" in result["chunk"]

        # Verify document fields
        assert "document" in result
        assert "id" in result["document"]
        assert "name" in result["document"]
        assert "fileType" in result["document"]

        # Verify similarity fields
        assert "similarityScore" in result
        assert "distance" in result

        # Verify similarity score is valid (0.0-1.0)
        assert 0.0 <= result["similarityScore"] <= 1.0

        # Verify distance is valid (0.0-2.0 for cosine distance)
        assert 0.0 <= result["distance"] <= 2.0

        # Verify similarity and distance relationship
        # similarity = 1 - distance
        expected_similarity = 1.0 - result["distance"]
        assert abs(result["similarityScore"] - expected_similarity) < 0.001

        print(f"\n✅ Search found {len(results)} results")
        print(f"Top result: {result['chunk']['chunkText'][:100]}...")
        print(f"Similarity: {result['similarityScore']:.4f}")
        print(f"Document: {result['document']['name']}")
    else:
        print("\n⚠️  No results found - this is normal if no documents have embeddings yet")


if __name__ == "__main__":
    """
    Manual test runner for quick verification.

    Usage:
        python tests/test_vector_search_integration.py
    """
    import asyncio
    import sys

    print("🧪 Running vector search integration test...")
    print("📋 Prerequisites:")
    print("  - API server running at http://localhost:8000")
    print("  - Database with test documents and embeddings")
    print("  - OPENAI_API_KEY configured")
    print()

    try:
        asyncio.run(test_graphql_search_documents_integration())
        print("\n✅ Integration test passed!")
    except AssertionError as e:
        print(f"\n❌ Integration test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
