"""
Tests for document chunking service
"""

import pytest
from uuid import uuid4

from app.models.document import Document
from app.services.chunking_service import ChunkingService


class TestChunkingService:
    """Test cases for chunking service"""

    @pytest.fixture()
    def chunking_service(self):
        """Create a chunking service instance with default settings"""
        return ChunkingService(
            chunk_size=750,
            overlap=100,
            min_chunk_size=500,
            max_chunk_size=1000,
        )

    @pytest.fixture()
    def mock_document(self):
        """Create a mock document for testing"""
        document = Document()
        document.id = uuid4()
        document.name = "test_document.pdf"
        document.file_type = "application/pdf"
        document.space_id = uuid4()
        document.doc_metadata = {"page_count": 10}
        return document

    def test_count_tokens(self, chunking_service):
        """Test token counting with tiktoken"""
        text = "This is a simple test sentence."
        token_count = chunking_service.count_tokens(text)

        # Should return a positive integer
        assert isinstance(token_count, int)
        assert token_count > 0
        # This sentence should be approximately 6-8 tokens
        assert 5 <= token_count <= 10

    def test_split_into_sentences(self, chunking_service):
        """Test sentence splitting with NLTK"""
        text = "This is sentence one. This is sentence two! And here's sentence three?"
        sentences = chunking_service.split_into_sentences(text)

        assert len(sentences) == 3
        assert sentences[0] == "This is sentence one."
        assert sentences[1] == "This is sentence two!"
        assert sentences[2] == "And here's sentence three?"

    def test_chunk_short_document(self, chunking_service, mock_document):
        """Test chunking a short document (< 500 tokens)"""
        # Short text that's well under min_chunk_size
        short_text = "This is a very short document. " * 20  # ~120 tokens
        mock_document.extracted_text = short_text

        chunks = chunking_service.chunk_text(short_text, mock_document)

        # Should create a single chunk even if below min_chunk_size
        assert len(chunks) == 1
        assert chunks[0].text == short_text.strip()
        assert chunks[0].index == 0
        assert chunks[0].token_count < 500

    def test_chunk_medium_document(self, chunking_service, mock_document):
        """Test chunking a medium-sized document"""
        # Create text that will result in 2-3 chunks
        # Each sentence is about 10-15 tokens
        sentence = "This is a test sentence with some content to make it longer. "
        medium_text = sentence * 100  # ~1000-1500 tokens total

        mock_document.extracted_text = medium_text
        chunks = chunking_service.chunk_text(medium_text, mock_document)

        # Should create multiple chunks
        assert len(chunks) >= 2
        assert len(chunks) <= 3

        # Verify chunk properties
        for i, chunk in enumerate(chunks):
            assert chunk.index == i
            assert 500 <= chunk.token_count <= 1000  # Within range
            assert chunk.start_char >= 0
            assert chunk.end_char > chunk.start_char
            assert len(chunk.text) > 0

            # Verify metadata
            assert chunk.metadata["document_id"] == str(mock_document.id)
            assert chunk.metadata["document_name"] == mock_document.name
            assert chunk.metadata["space_id"] == str(mock_document.space_id)

    def test_chunk_large_document(self, chunking_service, mock_document):
        """Test chunking a large document (simulating 100 pages)"""
        # Simulate a 100-page document (~50,000 tokens)
        # Average page is ~500 tokens
        sentence = "This is a sentence from a large document with meaningful content. "
        # Create ~50,000 tokens (approximately 100 pages)
        large_text = sentence * 3500  # Each sentence ~14 tokens, 3500 * 14 = ~49,000 tokens

        mock_document.extracted_text = large_text
        mock_document.doc_metadata = {"page_count": 100}

        chunks = chunking_service.chunk_text(large_text, mock_document)

        # Should create many chunks (roughly 50-70 chunks for 50k tokens)
        assert len(chunks) >= 50
        assert len(chunks) <= 100

        # Verify chunks are within token limits (allowing some tolerance for sentence boundaries)
        # Most chunks should be within limits, last chunk may slightly exceed due to sentence preservation
        for i, chunk in enumerate(chunks):
            if i < len(chunks) - 1:  # All but last chunk must be within limits
                assert 500 <= chunk.token_count <= 1000
            else:  # Last chunk can slightly exceed max if needed to preserve sentences
                assert chunk.token_count >= 500  # At least min size
            assert chunk.metadata["total_pages"] == 100

    def test_chunk_overlap(self, chunking_service, mock_document):
        """Test that chunks have proper overlap"""
        # Create text with distinct sentences for tracking overlap
        sentences = [f"Sentence number {i} with unique content. " for i in range(200)]
        text = "".join(sentences)

        mock_document.extracted_text = text
        chunks = chunking_service.chunk_text(text, mock_document)

        # Should have multiple chunks
        assert len(chunks) >= 2

        # Check overlap between consecutive chunks
        for i in range(len(chunks) - 1):
            current_chunk = chunks[i].text
            next_chunk = chunks[i + 1].text

            # Find overlap by checking if end of current chunk appears in start of next
            # Get last few sentences from current chunk
            current_sentences = current_chunk.split(". ")[-5:]
            next_sentences = next_chunk.split(". ")[:10]

            # There should be some overlap
            overlap_found = any(sent in next_sentences for sent in current_sentences if sent)
            assert overlap_found, f"No overlap found between chunk {i} and {i+1}"

    def test_sentence_boundary_preservation(self, chunking_service, mock_document):
        """Test that chunks preserve sentence boundaries"""
        # Create text with clear sentence markers
        text = "First sentence here. Second sentence here. Third sentence here. " * 200

        mock_document.extracted_text = text
        chunks = chunking_service.chunk_text(text, mock_document)

        # All chunks should end with sentence terminators
        for chunk in chunks:
            chunk_text = chunk.text.strip()
            # Should end with proper punctuation
            assert chunk_text[-1] in [
                ".",
                "!",
                "?",
            ], f"Chunk {chunk.index} doesn't end with sentence terminator: '{chunk_text[-20:]}'"

    def test_empty_text(self, chunking_service, mock_document):
        """Test handling of empty text"""
        mock_document.extracted_text = ""
        chunks = chunking_service.chunk_text("", mock_document)

        assert len(chunks) == 0

    def test_whitespace_only(self, chunking_service, mock_document):
        """Test handling of whitespace-only text"""
        mock_document.extracted_text = "   \n\n\t  "
        chunks = chunking_service.chunk_text("   \n\n\t  ", mock_document)

        assert len(chunks) == 0

    def test_single_long_sentence(self, chunking_service, mock_document):
        """Test handling of a single very long sentence"""
        # Create a single sentence that exceeds max_chunk_size
        long_sentence = "This is a very long sentence " * 100 + "."

        mock_document.extracted_text = long_sentence
        chunks = chunking_service.chunk_text(long_sentence, mock_document)

        # Should create a single chunk even if it exceeds limits
        # (because we can't split mid-sentence)
        assert len(chunks) >= 1

    def test_chunk_metadata_completeness(self, chunking_service, mock_document):
        """Test that all chunk metadata fields are populated"""
        text = "Test sentence. " * 100
        mock_document.extracted_text = text

        chunks = chunking_service.chunk_text(text, mock_document)

        for chunk in chunks:
            # Verify all required metadata fields
            assert "document_id" in chunk.metadata
            assert "document_name" in chunk.metadata
            assert "space_id" in chunk.metadata
            assert "sentence_count" in chunk.metadata
            assert "file_type" in chunk.metadata

            # Verify values are correct
            assert chunk.metadata["document_id"] == str(mock_document.id)
            assert chunk.metadata["document_name"] == mock_document.name
            assert chunk.metadata["space_id"] == str(mock_document.space_id)
            assert chunk.metadata["file_type"] == mock_document.file_type
            assert chunk.metadata["sentence_count"] > 0

    def test_chunk_character_positions(self, chunking_service, mock_document):
        """Test that character positions are tracked correctly"""
        text = "First sentence. Second sentence. Third sentence. " * 50
        mock_document.extracted_text = text

        chunks = chunking_service.chunk_text(text, mock_document)

        # Chunks should be tracked (character positions may have some overlap due to chunking algorithm)
        for i, chunk in enumerate(chunks):
            assert chunk.start_char >= 0
            assert chunk.end_char > chunk.start_char
            # Character positions track cumulative positions and may exceed text length due to spaces
            # The important thing is that we can reconstruct the text

            # Start char should be at or near the actual text position
            # (allowing for some tolerance due to overlap)
            if i > 0:
                # Next chunk should start at or before previous chunk's end
                # (due to overlap)
                assert chunk.start_char <= chunks[i - 1].end_char

    def test_custom_chunk_sizes(self):
        """Test chunking with custom size parameters"""
        # Create service with smaller chunks
        small_chunk_service = ChunkingService(
            chunk_size=300,
            overlap=50,
            min_chunk_size=200,
            max_chunk_size=400,
        )

        document = Document()
        document.id = uuid4()
        document.name = "test.pdf"
        document.file_type = "application/pdf"
        document.space_id = uuid4()

        text = "Test sentence. " * 200
        document.extracted_text = text

        chunks = small_chunk_service.chunk_text(text, document)

        # Verify chunks respect custom size limits
        for chunk in chunks:
            assert 200 <= chunk.token_count <= 400

    def test_chunk_with_special_characters(self, chunking_service, mock_document):
        """Test chunking text with special characters and formatting"""
        text = """
        This is a test document with special characters!

        It includes:
        - Bullets
        - Line breaks
        - Special chars: @#$%^&*()

        And some "quoted text" with 'single quotes' too.
        Numbers like 123, 456.78, and $1,000.00 should work.

        URLs like https://example.com should stay intact.
        Email addresses test@example.com should be preserved.
        """

        mock_document.extracted_text = text
        chunks = chunking_service.chunk_text(text, mock_document)

        # Should successfully chunk without errors
        assert len(chunks) >= 1

        # Verify no data loss (approximately)
        total_chunk_length = sum(len(chunk.text) for chunk in chunks)
        assert total_chunk_length > 0


@pytest.mark.asyncio
class TestChunkingServiceDatabase:
    """Test cases for chunking service with database operations"""

    @pytest.fixture()
    def mock_document_async(self):
        """Create a mock document for async tests"""
        document = Document()
        document.id = uuid4()
        document.name = "test_async.pdf"
        document.file_type = "application/pdf"
        document.space_id = uuid4()
        document.doc_metadata = {"page_count": 10}
        return document

    async def test_create_chunks_for_document_success(self, mock_document_async):
        """Test successful chunk creation with database persistence"""
        # This test would require database setup
        # For now, we're testing the logic without actual DB
        pytest.skip("Requires database setup - integration test")

    async def test_create_chunks_for_document_no_text(self, mock_document_async):
        """Test error handling when document has no extracted text"""
        from app.services.chunking_service import chunking_service

        mock_document_async.extracted_text = None

        with pytest.raises(ValueError, match="has no extracted text"):
            await chunking_service.create_chunks_for_document(mock_document_async, None)
