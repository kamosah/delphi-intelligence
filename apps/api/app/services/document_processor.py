"""Document processing service for text extraction."""

import logging
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session_factory
from app.models.document import Document, DocumentStatus
from app.services.chunking_service import chunk_document
from app.services.embedding_service import embed_document
from app.services.extractors import BaseExtractor, DOCXExtractor, PDFExtractor, TextExtractor
from app.services.sse_manager import sse_manager
from app.services.storage_service import get_storage_service

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Service for processing documents and extracting text."""

    def __init__(self) -> None:
        """Initialize document processor with extractors."""
        self.extractors = [
            PDFExtractor(),
            DOCXExtractor(),
            TextExtractor(),
        ]

    def get_extractor_for_mime_type(self, mime_type: str) -> BaseExtractor | None:
        """
        Get the appropriate extractor for a given MIME type.

        Args:
            mime_type: MIME type of the document

        Returns:
            Extractor instance or None if no extractor supports the MIME type
        """
        for extractor in self.extractors:
            if extractor.supports_mime_type(mime_type):
                return extractor
        return None

    async def process_document(
        self,
        document_id: str,
        db: AsyncSession,
    ) -> None:
        """
        Process a document and extract text.

        This method:
        1. Fetches the document from the database
        2. Downloads the file from storage
        3. Extracts text using the appropriate extractor
        4. Updates the document with extracted text and metadata
        5. Updates the document status

        Args:
            document_id: UUID of the document to process
            db: Database session

        Raises:
            Exception: If document not found or processing fails
        """
        try:
            # Fetch document from database
            result = await db.execute(select(Document).where(Document.id == document_id))
            document = result.scalar_one_or_none()

            if not document:
                logger.error(f"Document not found: {document_id}")
                return

            # Update status to processing
            document.status = DocumentStatus.PROCESSING
            await db.commit()

            # Emit SSE event for status change
            await sse_manager.emit_document_update(
                document_id=UUID(document_id),
                space_id=UUID(str(document.space_id)),
                event="status_update",
                data={
                    "status": document.status,
                    "updated_at": datetime.now(UTC).isoformat(),
                },
            )

            logger.info(f"Processing document {document_id}: {document.name}")

            # Get appropriate extractor
            extractor = self.get_extractor_for_mime_type(document.file_type)

            if not extractor:
                error_msg = f"No extractor available for MIME type: {document.file_type}"
                logger.error(error_msg)
                document.status = DocumentStatus.FAILED
                document.processing_error = error_msg
                await db.commit()

                # Emit SSE event for failure
                await sse_manager.emit_document_update(
                    document_id=UUID(document_id),
                    space_id=UUID(str(document.space_id)),
                    event="status_update",
                    data={
                        "status": document.status,
                        "updated_at": datetime.now(UTC).isoformat(),
                        "processing_error": error_msg,
                    },
                )
                return

            # Download file from Supabase Storage
            try:
                logger.info(f"Downloading file from storage: {document.file_path}")
                file_content = await get_storage_service().download_file(document.file_path)

                # Create temporary file with appropriate extension
                file_extension = Path(document.name).suffix or ".tmp"
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                    temp_file.write(file_content)
                    temp_file_path = temp_file.name

                logger.info(f"File downloaded to temporary location: {temp_file_path}")

            except Exception as download_error:
                error_msg = f"Failed to download file from storage: {download_error}"
                logger.exception(error_msg)
                document.status = DocumentStatus.FAILED
                document.processing_error = error_msg
                await db.commit()

                # Emit SSE event for failure
                await sse_manager.emit_document_update(
                    document_id=UUID(document_id),
                    space_id=UUID(str(document.space_id)),
                    event="status_update",
                    data={
                        "status": document.status,
                        "updated_at": datetime.now(UTC).isoformat(),
                        "processing_error": error_msg,
                    },
                )
                return

            # Extract text
            try:
                result_data = extractor.extract(temp_file_path)
            finally:
                # Clean up temporary file
                try:
                    Path(temp_file_path).unlink()
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up temporary file: {cleanup_error}")

            if not result_data.success:
                logger.error(
                    f"Failed to extract text from document {document_id}: " f"{result_data.error}"
                )
                document.status = DocumentStatus.FAILED
                document.processing_error = result_data.error
                await db.commit()

                # Emit SSE event for failure
                await sse_manager.emit_document_update(
                    document_id=UUID(document_id),
                    space_id=UUID(str(document.space_id)),
                    event="status_update",
                    data={
                        "status": document.status,
                        "updated_at": datetime.now(UTC).isoformat(),
                        "processing_error": result_data.error,
                    },
                )
                return

            # Update document with extracted text and metadata
            document.extracted_text = result_data.text
            document.doc_metadata = result_data.metadata
            document.processed_at = datetime.now(UTC)
            document.processing_error = None

            await db.commit()

            logger.info(
                f"Successfully processed document {document_id}: "
                f"{result_data.metadata.get('word_count', 0)} words extracted"
            )

            # Create text chunks for embedding
            try:
                chunks = await chunk_document(document, db)
                logger.info(f"Created {len(chunks)} chunks for document {document_id}")

                # Generate embeddings for chunks
                try:
                    embedded_count = await embed_document(document, db)
                    logger.info(
                        f"Generated embeddings for {embedded_count} chunks of document {document_id}"
                    )

                    # Mark document as fully processed (with embeddings)
                    document.status = DocumentStatus.PROCESSED
                    await db.commit()

                    # Emit SSE event for successful processing
                    await sse_manager.emit_document_update(
                        document_id=UUID(document_id),
                        space_id=UUID(str(document.space_id)),
                        event="status_update",
                        data={
                            "status": document.status,
                            "updated_at": datetime.now(UTC).isoformat(),
                            "chunks_count": embedded_count,
                        },
                    )

                except Exception as embed_error:
                    logger.exception(
                        f"Error generating embeddings for document {document_id}: {embed_error}"
                    )
                    # Set document as processed but note the embedding error
                    document.status = DocumentStatus.PROCESSED
                    document.processing_error = f"Embeddings failed: {embed_error}"
                    await db.commit()

            except Exception as chunk_error:
                logger.exception(f"Error chunking document {document_id}: {chunk_error}")
                # Don't fail the entire processing if chunking fails
                # Document text extraction was successful
                document.status = DocumentStatus.PROCESSED
                document.processing_error = f"Chunking failed: {chunk_error}"
                await db.commit()

        except Exception as e:
            logger.exception(f"Error processing document {document_id}: {e}")

            # Update document status to failed
            try:
                result = await db.execute(select(Document).where(Document.id == document_id))
                document = result.scalar_one_or_none()

                if document:
                    document.status = DocumentStatus.FAILED
                    document.processing_error = str(e)
                    await db.commit()

                    # Emit SSE event for failure
                    await sse_manager.emit_document_update(
                        document_id=UUID(document_id),
                        space_id=UUID(str(document.space_id)),
                        event="status_update",
                        data={
                            "status": document.status,
                            "updated_at": datetime.now(UTC).isoformat(),
                            "processing_error": str(e),
                        },
                    )
            except Exception as db_error:
                logger.exception(f"Error updating document status after failure: {db_error}")


# Global processor instance
processor = DocumentProcessor()


async def process_document_background(
    document_id: str,
) -> None:
    """
    Background task for processing documents.

    Creates its own database session to avoid issues with
    the original request session being closed.

    Args:
        document_id: UUID of the document to process
    """
    async with get_session_factory()() as db:
        await processor.process_document(document_id, db)
