"""PDF extractor using PyMuPDF (fitz) for text extraction."""

import logging
from pathlib import Path

import fitz  # PyMuPDF

from .base import BaseExtractor, ExtractionResult

logger = logging.getLogger(__name__)


class PDFExtractor(BaseExtractor):
    """Extractor for PDF files using PyMuPDF."""

    SUPPORTED_MIME_TYPES = {
        "application/pdf",
    }

    def extract(self, file_path: str) -> ExtractionResult:
        """
        Extract text and metadata from a PDF file.

        Args:
            file_path: Path to the PDF file

        Returns:
            ExtractionResult containing extracted text and metadata
        """
        try:
            path = Path(file_path)

            if not path.exists():
                return ExtractionResult(
                    text="",
                    metadata={},
                    success=False,
                    error=f"File not found: {file_path}",
                )

            # Open PDF document
            doc = fitz.open(file_path)

            # Check if PDF is encrypted/password protected
            if doc.is_encrypted:
                doc.close()
                return ExtractionResult(
                    text="",
                    metadata={},
                    success=False,
                    error="PDF is password protected",
                )

            # Extract text from all pages
            text_parts = []
            page_count = len(doc)

            for page_num in range(page_count):
                page = doc[page_num]
                text = page.get_text()
                text_parts.append(text)

            doc.close()

            # Combine all text
            full_text = "\n\n".join(text_parts)

            if not full_text.strip():
                return ExtractionResult(
                    text="",
                    metadata=self._create_metadata(
                        page_count=page_count,
                        word_count=0,
                    ),
                    success=False,
                    error="No text content found in PDF (may be scanned/image-based)",
                )

            word_count = self._count_words(full_text)

            metadata = self._create_metadata(
                page_count=page_count,
                word_count=word_count,
                file_size_bytes=path.stat().st_size,
            )

            logger.info(
                f"Successfully extracted text from PDF {file_path}: "
                f"{page_count} pages, {word_count} words"
            )

            return ExtractionResult(
                text=full_text,
                metadata=metadata,
                success=True,
            )

        except Exception as e:
            logger.exception(f"Error extracting text from PDF {file_path}: {e}")
            return ExtractionResult(
                text="",
                metadata={},
                success=False,
                error=str(e),
            )

    def supports_mime_type(self, mime_type: str) -> bool:
        """
        Check if this extractor supports the given MIME type.

        Args:
            mime_type: MIME type to check

        Returns:
            True if this extractor supports PDF files
        """
        return mime_type in self.SUPPORTED_MIME_TYPES
