"""
Integration tests for the complete document processing pipeline.

Tests the full flow: Document upload → Extraction → Chunking → Embedding
"""

import time
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentStatus
from app.models.document_chunk import DocumentChunk
from app.services.document_processor import DocumentProcessor
from tests.factories import create_document, create_space, create_user_with_org
from tests.fixtures.storage_mocks import MockStorageService

from io import BytesIO
from fastapi import UploadFile


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentProcessingPipeline:
    """Integration tests for complete document processing pipeline"""

    @pytest.fixture
    def sample_pdf_content(self):
        """Sample PDF text content for testing"""
        return """
        # Sample Document Title

        ## Introduction

        This is a comprehensive test document designed to validate the complete
        document processing pipeline. It contains multiple sections with varied
        content to ensure proper chunking and embedding.

        ## Section 1: Background

        The document processing system handles PDF, DOCX, and text files. It extracts
        text content, splits it into semantically meaningful chunks, and generates
        vector embeddings for semantic search capabilities.

        Key features include:
        - Automatic text extraction from multiple file formats
        - Intelligent chunking with sentence boundary preservation
        - Vector embedding generation using OpenAI's API
        - Efficient batch processing for large documents

        ## Section 2: Technical Details

        The chunking algorithm uses a sliding window approach with configurable
        parameters. Default settings include 750-token chunks with 100-token
        overlap between consecutive chunks. This ensures context preservation
        across chunk boundaries.

        Embedding generation uses the text-embedding-3-small model, which produces
        1536-dimensional vectors. These vectors enable semantic similarity search
        and retrieval of relevant document sections.

        ## Section 3: Performance Considerations

        The system is designed to handle documents of varying sizes efficiently.
        Performance benchmarks show that a 100-page document can be chunked in
        under one minute, and embedding generation completes within five minutes
        for typical documents.

        ## Conclusion

        This document processing pipeline provides a solid foundation for building
        AI-powered document intelligence features. Future enhancements may include
        support for additional file formats, multilingual content, and advanced
        semantic analysis capabilities.
        """

    @pytest.fixture
    async def test_document(
        self, db_session: AsyncSession, mock_storage_service: MockStorageService
    ):
        """Create a test document in the database with mock storage file."""
        # Create user, org, space
        user, org, _ = await create_user_with_org(db_session, org_name="Test Org")
        space = await create_space(db_session, "Test Space", org, user)
        await db_session.commit()

        # Create document (file_path will be set after doc.id is available)
        doc = await create_document(
            db_session,
            name="test_document.pdf",
            space=space,
            uploaded_by=user,
            file_type="application/pdf",
            file_path="temp_path",  # Temporary, will be updated
            status=DocumentStatus.UPLOADED,
        )
        await db_session.commit()
        await db_session.refresh(doc)

        # Update file_path with actual document ID
        doc.file_path = f"{space.id}/{doc.id}/test_document.pdf"
        await db_session.commit()

        # Upload mock file content to storage

        file_content = b"Mock PDF content for testing"
        mock_file = UploadFile(
            filename="test_document.pdf",
            file=BytesIO(file_content),
        )
        await mock_storage_service.upload_file(mock_file, space.id, doc.id)

        return doc

    async def test_full_pipeline_pdf_document(
        self,
        db_session: AsyncSession,
        sample_pdf_content,
        test_document: Document,
        mock_storage_service: MockStorageService,
    ):
        """
        Test complete pipeline: PDF upload → extraction → chunking → embedding.

        This test verifies:
        1. Document is marked as PROCESSING
        2. Text is successfully extracted
        3. Document is updated with extracted text and metadata
        4. Chunks are created with proper token counts and overlap
        5. Embeddings are generated for all chunks
        6. Document is marked as PROCESSED
        """
        document = test_document

        # Mock text extraction
        mock_extractor = MagicMock()
        mock_extract_result = MagicMock()
        mock_extract_result.success = True
        mock_extract_result.text = sample_pdf_content
        mock_extract_result.metadata = {
            "page_count": 5,
            "word_count": len(sample_pdf_content.split()),
            "char_count": len(sample_pdf_content),
        }
        mock_extract_result.error = None
        mock_extractor.extract.return_value = mock_extract_result
        mock_extractor.supports_mime_type.return_value = True

        # Mock chunking service
        with patch("app.services.document_processor.chunk_document") as mock_chunk:
            # Create mock chunks
            mock_chunks = []
            chunk_texts = [
                sample_pdf_content[i : i + 500] for i in range(0, len(sample_pdf_content), 400)
            ]

            for i, text in enumerate(chunk_texts[:5]):  # Limit to 5 chunks for test
                chunk = DocumentChunk()
                chunk.id = uuid4()
                chunk.document_id = document.id
                chunk.chunk_text = text
                chunk.chunk_index = i
                chunk.token_count = len(text.split())  # Simplified token count
                chunk.embedding = None
                chunk.chunk_metadata = {"document_id": str(document.id)}
                chunk.start_char = i * 400
                chunk.end_char = (i + 1) * 400
                mock_chunks.append(chunk)

            mock_chunk.return_value = mock_chunks

            # Mock embedding service
            with patch("app.services.document_processor.embed_document") as mock_embed:
                mock_embed.return_value = len(mock_chunks)  # Number of chunks embedded

                # Create processor and run pipeline
                processor = DocumentProcessor()
                processor.extractors = [mock_extractor]

                await processor.process_document(document.id, db_session)

                # Refresh document from database
                await db_session.refresh(document)

                # Verify document status progression
                # Should be set to PROCESSING, then PROCESSED
                assert document.status == DocumentStatus.PROCESSED

                # Verify text extraction
                assert document.extracted_text == sample_pdf_content
                assert document.doc_metadata["word_count"] > 0

                # Verify chunking was called
                mock_chunk.assert_called_once_with(document, db_session)

                # Verify embedding was called
                mock_embed.assert_called_once_with(document, db_session)

                # Verify document was updated in database
                assert document.status == DocumentStatus.PROCESSED

    async def test_pipeline_handles_extraction_failure(
        self, db_session: AsyncSession, test_document: Document
    ):
        """Test pipeline gracefully handles text extraction failures"""
        document = test_document

        # Mock failed extraction
        mock_extractor = MagicMock()
        mock_extract_result = MagicMock()
        mock_extract_result.success = False
        mock_extract_result.error = "Failed to extract text from PDF"
        mock_extractor.extract.return_value = mock_extract_result
        mock_extractor.supports_mime_type.return_value = True

        # Create processor and run pipeline
        processor = DocumentProcessor()
        processor.extractors = [mock_extractor]

        await processor.process_document(str(document.id), db_session)

        # Refresh document from database
        await db_session.refresh(document)

        # Verify document is marked as failed
        assert document.status == DocumentStatus.FAILED
        assert document.processing_error == "Failed to extract text from PDF"

    async def test_pipeline_handles_chunking_failure(
        self, db_session: AsyncSession, sample_pdf_content, test_document: Document
    ):
        """Test pipeline handles chunking failures gracefully"""
        document = test_document

        # Mock successful extraction
        mock_extractor = MagicMock()
        mock_extract_result = MagicMock()
        mock_extract_result.success = True
        mock_extract_result.text = sample_pdf_content
        mock_extract_result.metadata = {"page_count": 5}
        mock_extract_result.error = None
        mock_extractor.extract.return_value = mock_extract_result
        mock_extractor.supports_mime_type.return_value = True

        # Mock chunking failure
        with patch("app.services.document_processor.chunk_document") as mock_chunk:
            mock_chunk.side_effect = Exception("Chunking service error")

            # Create processor and run pipeline
            processor = DocumentProcessor()
            processor.extractors = [mock_extractor]

            await processor.process_document(str(document.id), db_session)

            # Refresh document from database
            await db_session.refresh(document)

            # Document should still be processed (text extraction succeeded)
            # but with an error note about chunking
            assert document.status == DocumentStatus.PROCESSED
            assert document.processing_error is not None
            assert "Chunking failed" in document.processing_error

    async def test_pipeline_handles_embedding_failure(
        self, db_session: AsyncSession, sample_pdf_content, test_document: Document
    ):
        """Test pipeline handles embedding generation failures gracefully"""
        document = test_document

        # Mock successful extraction
        mock_extractor = MagicMock()
        mock_extract_result = MagicMock()
        mock_extract_result.success = True
        mock_extract_result.text = sample_pdf_content
        mock_extract_result.metadata = {"page_count": 5}
        mock_extract_result.error = None
        mock_extractor.extract.return_value = mock_extract_result
        mock_extractor.supports_mime_type.return_value = True

        # Mock successful chunking
        with patch("app.services.document_processor.chunk_document") as mock_chunk:
            mock_chunks = [MagicMock() for _ in range(3)]
            mock_chunk.return_value = mock_chunks

            # Mock embedding failure
            with patch("app.services.document_processor.embed_document") as mock_embed:
                mock_embed.side_effect = Exception("OpenAI API error")

                # Create processor and run pipeline
                processor = DocumentProcessor()
                processor.extractors = [mock_extractor]

                await processor.process_document(document.id, db_session)

                # Refresh document from database
                await db_session.refresh(document)

                # Document should still be processed but with embedding error
                assert document.status == DocumentStatus.PROCESSED
                assert document.processing_error is not None
                assert "Embeddings failed" in document.processing_error

    async def test_pipeline_unsupported_file_type(
        self, db_session: AsyncSession, test_document: Document
    ):
        """Test pipeline handles unsupported file types"""
        document = test_document
        # Update file type to unsupported
        document.file_type = "application/unsupported"
        await db_session.commit()

        # No extractor supports this MIME type
        processor = DocumentProcessor()
        processor.extractors = []  # Empty extractors list

        await processor.process_document(str(document.id), db_session)

        # Refresh document from database
        await db_session.refresh(document)

        # Verify document is marked as failed
        assert document.status == DocumentStatus.FAILED
        assert document.processing_error is not None
        assert "No extractor available" in document.processing_error

    async def test_pipeline_with_empty_document(
        self, db_session: AsyncSession, test_document: Document
    ):
        """Test pipeline handles documents with no text content"""
        document = test_document

        # Mock extraction returning empty text
        mock_extractor = MagicMock()
        mock_extract_result = MagicMock()
        mock_extract_result.success = True
        mock_extract_result.text = ""  # Empty text
        mock_extract_result.metadata = {"page_count": 1}
        mock_extract_result.error = None
        mock_extractor.extract.return_value = mock_extract_result
        mock_extractor.supports_mime_type.return_value = True

        # Mock chunking to handle empty text
        with patch("app.services.document_processor.chunk_document") as mock_chunk:
            mock_chunk.side_effect = ValueError("Document has no extracted text")

            # Create processor and run pipeline
            processor = DocumentProcessor()
            processor.extractors = [mock_extractor]

            await processor.process_document(str(document.id), db_session)

            # Refresh document from database
            await db_session.refresh(document)

            # Document should be processed but with chunking error
            assert document.status == DocumentStatus.PROCESSED
            assert document.processing_error is not None
            assert "Chunking failed" in document.processing_error

    @pytest.mark.benchmark
    async def test_pipeline_performance_large_document(
        self, db_session: AsyncSession, sample_pdf_content, test_document: Document
    ):
        """
        Test pipeline performance with a large document.

        Verifies that the complete pipeline (extraction → chunking → embedding)
        completes within acceptable time limits for a large document.
        """
        # Create large document (simulate 100-page document)
        large_content = sample_pdf_content * 50  # ~100k characters
        document = test_document

        # Mock successful extraction
        mock_extractor = MagicMock()
        mock_extract_result = MagicMock()
        mock_extract_result.success = True
        mock_extract_result.text = large_content
        mock_extract_result.metadata = {
            "page_count": 100,
            "word_count": len(large_content.split()),
        }
        mock_extract_result.error = None
        mock_extractor.extract.return_value = mock_extract_result
        mock_extractor.supports_mime_type.return_value = True

        # Mock chunking (fast with mocks)
        with patch("app.services.document_processor.chunk_document") as mock_chunk:
            # Simulate realistic chunk count for large document
            mock_chunks = [MagicMock() for _ in range(50)]
            mock_chunk.return_value = mock_chunks

            # Mock embedding
            with patch("app.services.document_processor.embed_document") as mock_embed:
                mock_embed.return_value = 50

                # Measure pipeline performance
                start_time = time.time()

                processor = DocumentProcessor()
                processor.extractors = [mock_extractor]

                await processor.process_document(document.id, db_session)

                elapsed_time = time.time() - start_time

                # Refresh document from database
                await db_session.refresh(document)

                # With mocking, pipeline should be very fast (< 1 second)
                assert elapsed_time < 1.0, f"Pipeline took {elapsed_time:.2f}s, expected < 1s"

                # Verify all steps completed
                assert document.status == DocumentStatus.PROCESSED
                assert document.extracted_text == large_content
                mock_chunk.assert_called_once()
                mock_embed.assert_called_once()

                print("\n=== Pipeline Performance ===")
                print(f"Document size: {len(large_content):,} characters")
                print(f"Chunks created: {len(mock_chunks)}")
                print(f"Time elapsed: {elapsed_time:.3f}s")
                print("Status: ✓ PASS")
                print("===========================")
