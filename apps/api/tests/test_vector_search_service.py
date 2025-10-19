"""
Tests for vector search service.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.vector_search_service import SearchResult, VectorSearchService


class TestVectorSearchService:
    """Test cases for vector search service."""

    @pytest.fixture()
    def mock_embedding_service(self):
        """Create a mock embedding service."""
        service = AsyncMock()
        # Mock embedding generation to return a 1536-dimensional vector
        service.generate_embedding = AsyncMock(
            return_value=[0.1] * 1536  # Dummy embedding vector
        )
        return service

    @pytest.fixture()
    def vector_search_service(self, mock_embedding_service):
        """Create a vector search service instance with mocked embedding service."""
        return VectorSearchService(embedding_service=mock_embedding_service)

    @pytest.fixture()
    def mock_document(self):
        """Create a mock document for testing."""
        document = Document()
        document.id = uuid4()
        document.space_id = uuid4()
        document.name = "test_document.pdf"
        document.file_type = "application/pdf"
        document.file_path = "test/path/doc.pdf"
        document.size_bytes = 1024000
        document.status = "processed"
        document.uploaded_by = uuid4()
        return document

    @pytest.fixture()
    def mock_chunk(self, mock_document):
        """Create a mock document chunk for testing."""
        chunk = DocumentChunk()
        chunk.id = uuid4()
        chunk.document_id = mock_document.id
        chunk.chunk_text = "This is a test chunk with some content about machine learning."
        chunk.chunk_index = 0
        chunk.token_count = 10
        chunk.embedding = [0.1] * 1536  # Dummy embedding
        chunk.chunk_metadata = {"page_num": 1}
        chunk.start_char = 0
        chunk.end_char = 100
        return chunk

    @pytest.mark.asyncio
    async def test_search_similar_chunks_success(
        self, vector_search_service, mock_embedding_service, mock_document, mock_chunk
    ):
        """Test successful semantic search."""
        # Mock database session
        mock_db = AsyncMock()

        # Mock database query result
        mock_result = MagicMock()
        # Simulate query result: (chunk, document, distance)
        mock_result.all = MagicMock(return_value=[(mock_chunk, mock_document, 0.2)])
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Perform search
        results = await vector_search_service.search_similar_chunks(
            query="What is machine learning?",
            db=mock_db,
            limit=10,
        )

        # Verify results
        assert len(results) == 1
        assert isinstance(results[0], SearchResult)
        assert results[0].chunk.id == mock_chunk.id
        assert results[0].document.id == mock_document.id
        assert results[0].similarity_score == 0.8  # 1 - 0.2
        assert results[0].distance == 0.2

        # Verify embedding service was called
        mock_embedding_service.generate_embedding.assert_called_once_with(
            "What is machine learning?"
        )

        # Verify database was queried
        mock_db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_similar_chunks_with_space_filter(
        self, vector_search_service, mock_document, mock_chunk
    ):
        """Test search with space_id filter."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.all = MagicMock(return_value=[(mock_chunk, mock_document, 0.15)])
        mock_db.execute = AsyncMock(return_value=mock_result)

        space_id = uuid4()

        results = await vector_search_service.search_similar_chunks(
            query="test query",
            db=mock_db,
            space_id=space_id,
            limit=5,
        )

        assert len(results) == 1
        assert results[0].similarity_score == 0.85  # 1 - 0.15
        mock_db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_similar_chunks_with_document_filter(
        self, vector_search_service, mock_document, mock_chunk
    ):
        """Test search with document_ids filter."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.all = MagicMock(return_value=[(mock_chunk, mock_document, 0.1)])
        mock_db.execute = AsyncMock(return_value=mock_result)

        doc_ids = [uuid4(), uuid4()]

        results = await vector_search_service.search_similar_chunks(
            query="test query",
            db=mock_db,
            document_ids=doc_ids,
            limit=10,
        )

        assert len(results) == 1
        assert results[0].similarity_score == 0.9  # 1 - 0.1
        mock_db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_similar_chunks_with_similarity_threshold(
        self, vector_search_service, mock_document, mock_chunk
    ):
        """Test search with similarity threshold filtering."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        # Return two results: one above threshold, one below
        chunk2 = DocumentChunk()
        chunk2.id = uuid4()
        chunk2.document_id = mock_document.id
        chunk2.chunk_text = "Another chunk"
        chunk2.chunk_index = 1
        chunk2.token_count = 5
        chunk2.embedding = [0.2] * 1536
        chunk2.chunk_metadata = {}
        chunk2.start_char = 100
        chunk2.end_char = 150

        mock_result.all = MagicMock(
            return_value=[
                (mock_chunk, mock_document, 0.1),  # similarity = 0.9 (above threshold)
                (chunk2, mock_document, 0.6),  # similarity = 0.4 (below threshold)
            ]
        )
        mock_db.execute = AsyncMock(return_value=mock_result)

        results = await vector_search_service.search_similar_chunks(
            query="test query",
            db=mock_db,
            limit=10,
            similarity_threshold=0.7,  # Only first result should pass
        )

        # Only one result should pass the threshold
        assert len(results) == 1
        assert results[0].chunk.id == mock_chunk.id
        assert results[0].similarity_score == 0.9

    @pytest.mark.asyncio
    async def test_search_similar_chunks_empty_query(self, vector_search_service):
        """Test search with empty query raises error."""
        mock_db = AsyncMock()

        with pytest.raises(ValueError, match="Query cannot be empty"):
            await vector_search_service.search_similar_chunks(query="", db=mock_db)

        with pytest.raises(ValueError, match="Query cannot be empty"):
            await vector_search_service.search_similar_chunks(query="   ", db=mock_db)

    @pytest.mark.asyncio
    async def test_search_similar_chunks_invalid_limit(self, vector_search_service):
        """Test search with invalid limit raises error."""
        mock_db = AsyncMock()

        with pytest.raises(ValueError, match="Limit must be between 1 and 100"):
            await vector_search_service.search_similar_chunks(query="test", db=mock_db, limit=0)

        with pytest.raises(ValueError, match="Limit must be between 1 and 100"):
            await vector_search_service.search_similar_chunks(query="test", db=mock_db, limit=101)

    @pytest.mark.asyncio
    async def test_search_similar_chunks_invalid_threshold(self, vector_search_service):
        """Test search with invalid similarity threshold raises error."""
        mock_db = AsyncMock()

        with pytest.raises(ValueError, match="Similarity threshold must be between 0.0 and 1.0"):
            await vector_search_service.search_similar_chunks(
                query="test", db=mock_db, similarity_threshold=-0.1
            )

        with pytest.raises(ValueError, match="Similarity threshold must be between 0.0 and 1.0"):
            await vector_search_service.search_similar_chunks(
                query="test", db=mock_db, similarity_threshold=1.5
            )

    @pytest.mark.asyncio
    async def test_search_similar_chunks_no_results(self, vector_search_service):
        """Test search with no results."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.all = MagicMock(return_value=[])
        mock_db.execute = AsyncMock(return_value=mock_result)

        results = await vector_search_service.search_similar_chunks(query="test query", db=mock_db)

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_search_similar_chunks_embedding_error(
        self, vector_search_service, mock_embedding_service
    ):
        """Test search when embedding generation fails."""
        mock_db = AsyncMock()
        mock_embedding_service.generate_embedding = AsyncMock(side_effect=Exception("API error"))

        with pytest.raises(Exception, match="API error"):
            await vector_search_service.search_similar_chunks(query="test query", db=mock_db)

    @pytest.mark.asyncio
    async def test_search_similar_chunks_database_error(
        self, vector_search_service, mock_embedding_service
    ):
        """Test search when database query fails."""
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(side_effect=Exception("Database error"))

        with pytest.raises(Exception, match="Database error"):
            await vector_search_service.search_similar_chunks(query="test query", db=mock_db)

    @pytest.mark.asyncio
    async def test_search_by_embedding_success(
        self, vector_search_service, mock_document, mock_chunk
    ):
        """Test search with pre-computed embedding."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.all = MagicMock(return_value=[(mock_chunk, mock_document, 0.25)])
        mock_db.execute = AsyncMock(return_value=mock_result)

        query_embedding = [0.5] * 1536

        results = await vector_search_service.search_by_embedding(
            query_embedding=query_embedding,
            db=mock_db,
            limit=10,
        )

        assert len(results) == 1
        assert results[0].similarity_score == 0.75  # 1 - 0.25
        mock_db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_by_embedding_invalid_dimensions(self, vector_search_service):
        """Test search with invalid embedding dimensions."""
        mock_db = AsyncMock()

        # Wrong number of dimensions
        with pytest.raises(ValueError, match="Query embedding must be a 1536-dimensional vector"):
            await vector_search_service.search_by_embedding(
                query_embedding=[0.1] * 100,  # Wrong size
                db=mock_db,
            )

        # Empty embedding
        with pytest.raises(ValueError, match="Query embedding must be a 1536-dimensional vector"):
            await vector_search_service.search_by_embedding(
                query_embedding=[],
                db=mock_db,
            )

    def test_get_vector_search_service(self):
        """Test global service instance getter."""
        from app.services.vector_search_service import get_vector_search_service

        # Mock the settings to provide an API key
        with patch("app.services.embedding_service.settings") as mock_settings:
            mock_settings.openai_api_key = "test-api-key"
            mock_settings.openai_embedding_model = "text-embedding-3-small"
            mock_settings.openai_embedding_batch_size = 100
            mock_settings.openai_max_retries = 3

            service1 = get_vector_search_service()
            service2 = get_vector_search_service()

            # Should return the same instance (singleton pattern)
            assert service1 is service2
            assert isinstance(service1, VectorSearchService)
