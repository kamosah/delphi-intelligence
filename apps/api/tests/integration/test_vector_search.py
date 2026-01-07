"""Integration tests for pgvector semantic search.

This module tests pgvector integration:
- Cosine similarity search
- Embedding determinism (same text → same vector)
- Document chunking and retrieval
- Similarity threshold filtering
- Top-k results limiting
- Space-scoped search
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.vector_search_service import VectorSearchService
from tests.factories import create_organization, create_space, create_user
from tests.fixtures.openai_mocks import MockEmbeddingService, MockOpenAIEmbeddings


@pytest.mark.integration
async def test_embedding_determinism(
    postgres_session: AsyncSession,
    mock_embeddings: MockOpenAIEmbeddings,
) -> None:
    """Test that embeddings are deterministic (same text → same vector)."""
    # Embed same text twice
    text = "Hello world"
    vector1 = await mock_embeddings.aembed_query(text)
    vector2 = await mock_embeddings.aembed_query(text)

    # Verify determinism
    assert vector1 == vector2
    assert len(vector1) == 1536  # OpenAI text-embedding-3-small dimensions

    # Embed different text
    vector3 = await mock_embeddings.aembed_query("Different text")
    assert vector1 != vector3


@pytest.mark.integration
async def test_vector_search_basic(
    postgres_session: AsyncSession,
    mock_embeddings: MockOpenAIEmbeddings,
    mock_embedding_service: MockEmbeddingService,
) -> None:
    """Test basic vector search with cosine similarity."""
    # Create test data
    user = await create_user(postgres_session, email="user@example.com", full_name="Test User")
    org = await create_organization(postgres_session, "Test Org")
    space = await create_space(postgres_session, "Test Space", org, user)
    await postgres_session.commit()

    # Create document
    document = Document(
        name="test.txt",
        file_type="text/plain",
        size_bytes=100,
        storage_path="/test/test.txt",
        space_id=space.id,
        uploaded_by=user.id,
    )
    postgres_session.add(document)
    await postgres_session.commit()

    # Create document chunks with embeddings
    chunk_texts = [
        "The quick brown fox jumps over the lazy dog",
        "Machine learning is a subset of artificial intelligence",
        "Python is a popular programming language",
    ]

    for i, text in enumerate(chunk_texts):
        embedding = await mock_embeddings.aembed_query(text)
        chunk = DocumentChunk(
            document_id=document.id,
            chunk_text=text,
            embedding=embedding,
            chunk_index=i,
            token_count=len(text.split()),
            start_char=0,
            end_char=len(text),
        )
        postgres_session.add(chunk)

    await postgres_session.commit()

    # Create vector search service with mock embedding service
    vector_search_service = VectorSearchService(
        embedding_service=mock_embedding_service  # type: ignore[arg-type]
    )

    # Search for similar chunks
    query = "Tell me about machine learning and AI"
    results = await vector_search_service.search_similar_chunks(
        query=query,
        db=postgres_session,
        space_id=space.id,  # type: ignore[arg-type]
        limit=10,
    )

    # Verify results
    assert len(results) > 0
    assert len(results) <= 3  # We only created 3 chunks

    # Verify SearchResult structure
    for result in results:
        assert result.chunk is not None
        assert result.document is not None
        assert 0.0 <= result.similarity_score <= 1.0
        assert 0.0 <= result.distance <= 2.0  # Cosine distance range
        assert result.chunk.chunk_text in chunk_texts
        assert result.document.id == document.id


@pytest.mark.integration
async def test_vector_search_similarity_threshold(
    postgres_session: AsyncSession,
    mock_embeddings: MockOpenAIEmbeddings,
    mock_embedding_service: MockEmbeddingService,
) -> None:
    """Test that similarity threshold filters out low-relevance results."""
    # Create test data
    user = await create_user(postgres_session, email="user@example.com", full_name="Test User")
    org = await create_organization(postgres_session, "Test Org")
    space = await create_space(postgres_session, "Test Space", org, user)
    await postgres_session.commit()

    # Create document
    document = Document(
        name="test.txt",
        file_type="text/plain",
        size_bytes=100,
        storage_path="/test/test.txt",
        space_id=space.id,
        uploaded_by=user.id,
    )
    postgres_session.add(document)
    await postgres_session.commit()

    # Create document chunks
    chunk_texts = [
        "Machine learning algorithms",
        "Deep neural networks",
        "Random unrelated text",
    ]

    for i, text in enumerate(chunk_texts):
        embedding = await mock_embeddings.aembed_query(text)
        chunk = DocumentChunk(
            document_id=document.id,
            chunk_text=text,
            embedding=embedding,
            chunk_index=i,
            token_count=len(text.split()),
            start_char=0,
            end_char=len(text),
        )
        postgres_session.add(chunk)

    await postgres_session.commit()

    # Create vector search service with mock embedding service
    vector_search_service = VectorSearchService(
        embedding_service=mock_embedding_service  # type: ignore[arg-type]
    )

    # Search with high similarity threshold (filters out low-relevance results)
    query = "Machine learning"
    results_with_threshold = await vector_search_service.search_similar_chunks(
        query=query,
        db=postgres_session,
        space_id=space.id,  # type: ignore[arg-type]
        limit=10,
        similarity_threshold=0.8,  # High threshold
    )

    # Search without threshold
    results_without_threshold = await vector_search_service.search_similar_chunks(
        query=query,
        db=postgres_session,
        space_id=space.id,  # type: ignore[arg-type]
        limit=10,
        similarity_threshold=0.0,  # No filtering
    )

    # Verify threshold filtering
    # With high threshold, we should get fewer or equal results
    assert len(results_with_threshold) <= len(results_without_threshold)

    # All results with threshold should have high similarity
    for result in results_with_threshold:
        assert result.similarity_score >= 0.8


@pytest.mark.integration
async def test_vector_search_top_k_limit(
    postgres_session: AsyncSession,
    mock_embeddings: MockOpenAIEmbeddings,
    mock_embedding_service: MockEmbeddingService,
) -> None:
    """Test that top-k limit restricts number of results."""
    # Create test data
    user = await create_user(postgres_session, email="user@example.com", full_name="Test User")
    org = await create_organization(postgres_session, "Test Org")
    space = await create_space(postgres_session, "Test Space", org, user)
    await postgres_session.commit()

    # Create document
    document = Document(
        name="test.txt",
        file_type="text/plain",
        size_bytes=100,
        storage_path="/test/test.txt",
        space_id=space.id,
        uploaded_by=user.id,
    )
    postgres_session.add(document)
    await postgres_session.commit()

    # Create 10 document chunks
    for i in range(10):
        text = f"Document chunk number {i}"
        embedding = await mock_embeddings.aembed_query(text)
        chunk = DocumentChunk(
            document_id=document.id,
            chunk_text=text,
            embedding=embedding,
            chunk_index=i,
            token_count=len(text.split()),
            start_char=0,
            end_char=len(text),
        )
        postgres_session.add(chunk)

    await postgres_session.commit()

    # Create vector search service with mock embedding service
    vector_search_service = VectorSearchService(
        embedding_service=mock_embedding_service  # type: ignore[arg-type]
    )

    # Search with limit=3
    query = "document chunk"
    results = await vector_search_service.search_similar_chunks(
        query=query,
        db=postgres_session,
        space_id=space.id,  # type: ignore[arg-type]
        limit=3,
    )

    # Verify limit respected
    assert len(results) <= 3


@pytest.mark.integration
async def test_vector_search_space_scoped(
    postgres_session: AsyncSession,
    mock_embeddings: MockOpenAIEmbeddings,
    mock_embedding_service: MockEmbeddingService,
) -> None:
    """Test that vector search is scoped to specific space."""
    # Create test data
    user = await create_user(postgres_session, email="user@example.com", full_name="Test User")
    org = await create_organization(postgres_session, "Test Org")
    space1 = await create_space(postgres_session, "Space 1", org, user)
    space2 = await create_space(postgres_session, "Space 2", org, user)
    await postgres_session.commit()

    # Create document in space1
    doc1 = Document(
        name="doc1.txt",
        file_type="text/plain",
        size_bytes=100,
        storage_path="/test/doc1.txt",
        space_id=space1.id,
        uploaded_by=user.id,
    )
    postgres_session.add(doc1)

    # Create document in space2
    doc2 = Document(
        name="doc2.txt",
        file_type="text/plain",
        size_bytes=100,
        storage_path="/test/doc2.txt",
        space_id=space2.id,
        uploaded_by=user.id,
    )
    postgres_session.add(doc2)
    await postgres_session.commit()

    # Create chunk in space1
    embedding1 = await mock_embeddings.aembed_query("Space 1 content")
    chunk1 = DocumentChunk(
        document_id=doc1.id,
        chunk_text="Space 1 content",
        embedding=embedding1,
        chunk_index=0,
        token_count=3,
        start_char=0,
        end_char=15,
    )
    postgres_session.add(chunk1)

    # Create chunk in space2
    embedding2 = await mock_embeddings.aembed_query("Space 2 content")
    chunk2 = DocumentChunk(
        document_id=doc2.id,
        chunk_text="Space 2 content",
        embedding=embedding2,
        chunk_index=0,
        token_count=3,
        start_char=0,
        end_char=15,
    )
    postgres_session.add(chunk2)
    await postgres_session.commit()

    # Create vector search service with mock embedding service
    vector_search_service = VectorSearchService(
        embedding_service=mock_embedding_service  # type: ignore[arg-type]
    )

    # Search in space1 only
    query = "content"
    results_space1 = await vector_search_service.search_similar_chunks(
        query=query,
        db=postgres_session,
        space_id=space1.id,  # type: ignore[arg-type]
        limit=10,
    )

    # Search in space2 only
    results_space2 = await vector_search_service.search_similar_chunks(
        query=query,
        db=postgres_session,
        space_id=space2.id,  # type: ignore[arg-type]
        limit=10,
    )

    # Verify space filtering
    assert len(results_space1) > 0
    assert len(results_space2) > 0

    # Verify results are scoped to correct space
    for result in results_space1:
        assert result.document.space_id == space1.id

    for result in results_space2:
        assert result.document.space_id == space2.id


@pytest.mark.integration
async def test_vector_search_empty_query(
    postgres_session: AsyncSession,
    mock_embeddings: MockOpenAIEmbeddings,
    mock_embedding_service: MockEmbeddingService,
) -> None:
    """Test that vector search raises ValueError for empty query."""
    # Create test data
    user = await create_user(postgres_session, email="user@example.com", full_name="Test User")
    org = await create_organization(postgres_session, "Test Org")
    space = await create_space(postgres_session, "Test Space", org, user)
    await postgres_session.commit()

    # Create vector search service with mock embedding service
    vector_search_service = VectorSearchService(
        embedding_service=mock_embedding_service  # type: ignore[arg-type]
    )

    # Search with empty query should raise ValueError
    with pytest.raises(ValueError, match="Query cannot be empty"):
        await vector_search_service.search_similar_chunks(
            query="",
            db=postgres_session,
            space_id=space.id,  # type: ignore[arg-type]
        )


@pytest.mark.integration
async def test_vector_search_invalid_limit(
    postgres_session: AsyncSession,
    mock_embeddings: MockOpenAIEmbeddings,
    mock_embedding_service: MockEmbeddingService,
) -> None:
    """Test that vector search raises ValueError for invalid limit."""
    # Create test data
    user = await create_user(postgres_session, email="user@example.com", full_name="Test User")
    org = await create_organization(postgres_session, "Test Org")
    space = await create_space(postgres_session, "Test Space", org, user)
    await postgres_session.commit()

    # Create vector search service with mock embedding service
    vector_search_service = VectorSearchService(
        embedding_service=mock_embedding_service  # type: ignore[arg-type]
    )

    # Search with limit=0 should raise ValueError
    with pytest.raises(ValueError, match="Limit must be between 1 and 100"):
        await vector_search_service.search_similar_chunks(
            query="test",
            db=postgres_session,
            space_id=space.id,  # type: ignore[arg-type]
            limit=0,
        )

    # Search with limit>100 should raise ValueError
    with pytest.raises(ValueError, match="Limit must be between 1 and 100"):
        await vector_search_service.search_similar_chunks(
            query="test",
            db=postgres_session,
            space_id=space.id,  # type: ignore[arg-type]
            limit=101,
        )


@pytest.mark.integration
async def test_vector_search_cosine_similarity_calculation(
    postgres_session: AsyncSession,
    mock_embeddings: MockOpenAIEmbeddings,
    mock_embedding_service: MockEmbeddingService,
) -> None:
    """Test that cosine similarity is calculated correctly (1.0 - distance)."""
    # Create test data
    user = await create_user(postgres_session, email="user@example.com", full_name="Test User")
    org = await create_organization(postgres_session, "Test Org")
    space = await create_space(postgres_session, "Test Space", org, user)
    await postgres_session.commit()

    # Create document
    document = Document(
        name="test.txt",
        file_type="text/plain",
        size_bytes=100,
        storage_path="/test/test.txt",
        space_id=space.id,
        uploaded_by=user.id,
    )
    postgres_session.add(document)
    await postgres_session.commit()

    # Create chunk
    text = "Sample text for testing"
    embedding = await mock_embeddings.aembed_query(text)
    chunk = DocumentChunk(
        document_id=document.id,
        chunk_text=text,
        embedding=embedding,
        chunk_index=0,
        token_count=len(text.split()),
        start_char=0,
        end_char=len(text),
    )
    postgres_session.add(chunk)
    await postgres_session.commit()

    # Create vector search service with mock embedding service
    vector_search_service = VectorSearchService(
        embedding_service=mock_embedding_service  # type: ignore[arg-type]
    )

    # Search for exact match
    query = text  # Same text as chunk
    results = await vector_search_service.search_similar_chunks(
        query=query,
        db=postgres_session,
        space_id=space.id,  # type: ignore[arg-type]
        limit=10,
    )

    # Verify results
    assert len(results) > 0

    # Verify similarity score calculation
    for result in results:
        # similarity_score = 1.0 - distance
        expected_similarity = 1.0 - result.distance
        assert (
            abs(result.similarity_score - expected_similarity) < 0.0001
        )  # Floating point tolerance
        assert 0.0 <= result.similarity_score <= 1.0
