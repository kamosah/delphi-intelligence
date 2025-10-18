"""
Tests for vector embedding service
"""

import time
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from openai import RateLimitError

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.embedding_service import EmbeddingService, get_embedding_service


class TestEmbeddingService:
    """Test cases for embedding service"""

    @pytest.fixture()
    def mock_openai_client(self):
        """Create a mock OpenAI client"""
        client = AsyncMock()
        return client

    @pytest.fixture()
    def embedding_service(self, mock_openai_client):
        """Create an embedding service instance with mocked OpenAI client"""
        service = EmbeddingService(api_key="test-api-key")
        service.client = mock_openai_client
        return service

    @pytest.fixture()
    def mock_document(self):
        """Create a mock document for testing"""
        document = Document()
        document.id = uuid4()
        document.name = "test_document.pdf"
        document.file_type = "application/pdf"
        document.space_id = uuid4()
        document.extracted_text = "This is a test document with some content."
        document.doc_metadata = {"page_count": 1}
        return document

    def test_init_with_api_key(self):
        """Test initialization with API key"""
        service = EmbeddingService(api_key="test-key")

        assert service.api_key == "test-key"
        assert service.model == "text-embedding-3-small"
        assert service.batch_size == 100
        assert service.max_retries == 3
        assert service.client is not None

    def test_init_without_api_key(self):
        """Test initialization without API key raises error"""
        with patch("app.services.embedding_service.settings") as mock_settings:
            mock_settings.openai_api_key = ""

            with pytest.raises(ValueError, match="OpenAI API key is required"):
                EmbeddingService()

    def test_init_with_custom_settings(self):
        """Test initialization with custom settings"""
        service = EmbeddingService(
            api_key="custom-key",
            model="text-embedding-3-large",
            batch_size=50,
            max_retries=5,
        )

        assert service.api_key == "custom-key"
        assert service.model == "text-embedding-3-large"
        assert service.batch_size == 50
        assert service.max_retries == 5

    @pytest.mark.asyncio
    async def test_generate_embedding_success(self, embedding_service, mock_openai_client):
        """Test successful single embedding generation"""
        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1, 0.2, 0.3])]
        mock_openai_client.embeddings.create = AsyncMock(return_value=mock_response)

        # Generate embedding
        result = await embedding_service.generate_embedding("test text")

        # Verify result
        assert result == [0.1, 0.2, 0.3]
        mock_openai_client.embeddings.create.assert_called_once_with(
            input="test text", model="text-embedding-3-small"
        )

    @pytest.mark.asyncio
    async def test_generate_embedding_empty_text(self, embedding_service):
        """Test embedding generation with empty text raises error"""
        with pytest.raises(ValueError, match="Text cannot be empty"):
            await embedding_service.generate_embedding("")

        with pytest.raises(ValueError, match="Text cannot be empty"):
            await embedding_service.generate_embedding("   ")

    @pytest.mark.asyncio
    async def test_generate_embedding_rate_limit_retry(self, embedding_service, mock_openai_client):
        """Test retry logic for rate limit errors"""
        # Mock rate limit error on first call, success on second
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1, 0.2, 0.3])]

        # Create proper RateLimitError with required parameters
        mock_response_error = MagicMock()
        mock_response_error.status_code = 429
        rate_limit_error = RateLimitError(
            "Rate limit exceeded",
            response=mock_response_error,
            body={"error": {"message": "Rate limit exceeded"}},
        )

        mock_openai_client.embeddings.create = AsyncMock(
            side_effect=[rate_limit_error, mock_response]
        )

        # Generate embedding - should retry and succeed
        result = await embedding_service.generate_embedding("test text")

        # Verify result and retry
        assert result == [0.1, 0.2, 0.3]
        assert mock_openai_client.embeddings.create.call_count == 2

    @pytest.mark.asyncio
    async def test_generate_batch_embeddings_success(self, embedding_service, mock_openai_client):
        """Test successful batch embedding generation"""
        # Mock OpenAI response for batch
        mock_response = MagicMock()
        mock_response.data = [
            MagicMock(embedding=[0.1, 0.2, 0.3]),
            MagicMock(embedding=[0.4, 0.5, 0.6]),
            MagicMock(embedding=[0.7, 0.8, 0.9]),
        ]
        mock_openai_client.embeddings.create = AsyncMock(return_value=mock_response)

        # Generate batch embeddings
        texts = ["text 1", "text 2", "text 3"]
        results = await embedding_service.generate_batch_embeddings(texts)

        # Verify results
        assert len(results) == 3
        assert results[0] == [0.1, 0.2, 0.3]
        assert results[1] == [0.4, 0.5, 0.6]
        assert results[2] == [0.7, 0.8, 0.9]
        mock_openai_client.embeddings.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_batch_embeddings_empty_list(self, embedding_service):
        """Test batch embedding with empty list raises error"""
        with pytest.raises(ValueError, match="Texts list cannot be empty"):
            await embedding_service.generate_batch_embeddings([])

    @pytest.mark.asyncio
    async def test_generate_batch_embeddings_filters_empty_texts(
        self, embedding_service, mock_openai_client
    ):
        """Test that batch embedding filters out empty texts"""
        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.data = [
            MagicMock(embedding=[0.1, 0.2, 0.3]),
            MagicMock(embedding=[0.4, 0.5, 0.6]),
        ]
        mock_openai_client.embeddings.create = AsyncMock(return_value=mock_response)

        # Generate batch with some empty texts
        texts = ["text 1", "", "text 2", "   "]
        results = await embedding_service.generate_batch_embeddings(texts)

        # Verify only valid texts were processed
        assert len(results) == 2
        assert results[0] == [0.1, 0.2, 0.3]
        assert results[1] == [0.4, 0.5, 0.6]

    @pytest.mark.asyncio
    async def test_generate_batch_embeddings_large_batch(
        self, embedding_service, mock_openai_client
    ):
        """Test batch embedding with large batch (should split into multiple batches)"""
        # Set small batch size for testing
        embedding_service.batch_size = 2

        # Mock OpenAI responses for multiple batches
        mock_response_1 = MagicMock()
        mock_response_1.data = [
            MagicMock(embedding=[0.1, 0.2, 0.3]),
            MagicMock(embedding=[0.4, 0.5, 0.6]),
        ]

        mock_response_2 = MagicMock()
        mock_response_2.data = [MagicMock(embedding=[0.7, 0.8, 0.9])]

        mock_openai_client.embeddings.create = AsyncMock(
            side_effect=[mock_response_1, mock_response_2]
        )

        # Generate batch embeddings for 3 texts (should split into 2 batches)
        texts = ["text 1", "text 2", "text 3"]
        results = await embedding_service.generate_batch_embeddings(texts)

        # Verify results
        assert len(results) == 3
        assert results[0] == [0.1, 0.2, 0.3]
        assert results[1] == [0.4, 0.5, 0.6]
        assert results[2] == [0.7, 0.8, 0.9]

        # Verify multiple batches were called
        assert mock_openai_client.embeddings.create.call_count == 2

    @pytest.mark.asyncio
    async def test_get_embedding_dimensions(self, embedding_service, mock_openai_client):
        """Test getting embedding dimensions from model"""
        # Mock OpenAI response with 1536-dimensional embedding
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1] * 1536)]
        mock_openai_client.embeddings.create = AsyncMock(return_value=mock_response)

        # Get dimensions
        dimensions = await embedding_service.get_embedding_dimensions()

        # Verify dimensions
        assert dimensions == 1536

    def test_estimate_cost(self, embedding_service):
        """Test cost estimation for embeddings"""
        # Test with text-embedding-3-small (default)
        result = embedding_service.estimate_cost(1_000_000)

        assert result["model"] == "text-embedding-3-small"
        assert result["token_count"] == 1_000_000
        assert result["estimated_cost_usd"] == 0.02
        assert result["price_per_million_tokens"] == 0.02

        # Test with text-embedding-3-large
        result = embedding_service.estimate_cost(1_000_000, model="text-embedding-3-large")

        assert result["model"] == "text-embedding-3-large"
        assert result["estimated_cost_usd"] == 0.13

        # Test with smaller token count
        result = embedding_service.estimate_cost(100_000)

        assert result["estimated_cost_usd"] == 0.002  # $0.02 / 10

    @pytest.mark.benchmark
    @pytest.mark.asyncio
    async def test_generate_batch_embeddings_performance(
        self, embedding_service, mock_openai_client
    ):
        """Test performance of batch embedding generation"""
        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1] * 1536) for _ in range(100)]
        mock_openai_client.embeddings.create = AsyncMock(return_value=mock_response)

        # Generate 100 embeddings
        texts = [f"test text {i}" for i in range(100)]

        start_time = time.time()
        results = await embedding_service.generate_batch_embeddings(texts)
        elapsed_time = time.time() - start_time

        # Verify results
        assert len(results) == 100

        # Performance should be fast with mocking (< 1 second)
        assert elapsed_time < 1.0, f"Batch embedding took {elapsed_time:.2f}s, expected < 1s"

    def test_get_embedding_service_singleton(self):
        """Test that get_embedding_service returns singleton instance"""
        with patch("app.services.embedding_service.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.openai_embedding_model = "text-embedding-3-small"
            mock_settings.openai_embedding_batch_size = 100
            mock_settings.openai_max_retries = 3

            # Get service twice
            service1 = get_embedding_service()
            service2 = get_embedding_service()

            # Should be same instance
            assert service1 is service2


@pytest.mark.asyncio
class TestEmbeddingServiceDatabase:
    """Test cases for embedding service with database operations"""

    @pytest.fixture()
    def mock_db(self):
        """Create a mock database session"""
        return AsyncMock()

    @pytest.fixture()
    def mock_document(self):
        """Create a mock document"""
        document = Document()
        document.id = uuid4()
        document.name = "test.pdf"
        document.extracted_text = "Test content"
        return document

    @pytest.fixture()
    def mock_chunks(self, mock_document):
        """Create mock chunks for testing"""
        chunks = []
        for i in range(3):
            chunk = DocumentChunk()
            chunk.id = uuid4()
            chunk.document_id = mock_document.id
            chunk.chunk_text = f"Chunk {i} text content"
            chunk.chunk_index = i
            chunk.token_count = 100
            chunk.embedding = None  # No embedding yet
            chunk.chunk_metadata = {}
            chunk.start_char = i * 100
            chunk.end_char = (i + 1) * 100
            chunks.append(chunk)
        return chunks

    async def test_embed_document_chunks_success(self, mock_db, mock_document, mock_chunks):
        """Test successful embedding of document chunks"""
        # Skip - requires database integration testing
        pytest.skip("Requires database setup - integration test")

    async def test_embed_document_chunks_no_chunks(self, mock_db, mock_document):
        """Test error handling when document has no chunks"""
        # Skip - requires database integration testing
        pytest.skip("Requires database setup - integration test")

    async def test_embed_document_chunks_skip_existing(self, mock_db, mock_document, mock_chunks):
        """Test that chunks with existing embeddings are skipped"""
        # Skip - requires database integration testing
        pytest.skip("Requires database setup - integration test")

    async def test_embed_document_chunks_force_regenerate(
        self, mock_db, mock_document, mock_chunks
    ):
        """Test force regeneration of embeddings"""
        # Skip - requires database integration testing
        pytest.skip("Requires database setup - integration test")

    async def test_embed_document_convenience_function(self, mock_db, mock_document, mock_chunks):
        """Test convenience function for embedding documents"""
        # Skip - requires database integration testing
        pytest.skip("Requires database setup - integration test")
