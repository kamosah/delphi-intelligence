"""Document processing service for text extraction."""

import logging
from datetime import datetime, UTC

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.document import Document, DocumentStatus
from app.services.extractors import BaseExtractor, DOCXExtractor, PDFExtractor, TextExtractor

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

            logger.info(f"Processing document {document_id}: {document.name}")

            # Get appropriate extractor
            extractor = self.get_extractor_for_mime_type(document.file_type)

            if not extractor:
                error_msg = f"No extractor available for MIME type: {document.file_type}"
                logger.error(error_msg)
                document.status = DocumentStatus.FAILED
                document.processing_error = error_msg
                await db.commit()
                return

            # Download file from storage
            # TODO: Implement file download from Supabase Storage
            # For now, assume file_path is a local path
            file_path = document.file_path

            # Extract text
            result_data = extractor.extract(file_path)

            if not result_data.success:
                logger.error(
                    f"Failed to extract text from document {document_id}: " f"{result_data.error}"
                )
                document.status = DocumentStatus.FAILED
                document.processing_error = result_data.error
                await db.commit()
                return

            # Update document with extracted text and metadata
            document.extracted_text = result_data.text
            document.doc_metadata = result_data.metadata
            document.status = DocumentStatus.PROCESSED
            document.processed_at = datetime.now(UTC)
            document.processing_error = None

            await db.commit()

            logger.info(
                f"Successfully processed document {document_id}: "
                f"{result_data.metadata.get('word_count', 0)} words extracted"
            )

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
    async with async_session_factory() as db:
        await processor.process_document(document_id, db)
