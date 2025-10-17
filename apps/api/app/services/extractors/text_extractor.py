"""Text file extractor for plain text documents."""

import logging
from pathlib import Path

from .base import BaseExtractor, ExtractionResult

logger = logging.getLogger(__name__)


class TextExtractor(BaseExtractor):
    """Extractor for plain text files (.txt)."""

    SUPPORTED_MIME_TYPES = {
        "text/plain",
        "text/txt",
    }

    def extract(self, file_path: str) -> ExtractionResult:
        """
        Extract text from a plain text file.

        Args:
            file_path: Path to the text file

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

            # Read text file with UTF-8 encoding, fallback to other encodings
            text = self._read_text_file(path)

            if not text:
                return ExtractionResult(
                    text="",
                    metadata=self._create_metadata(word_count=0),
                    success=False,
                    error="Empty text file",
                )

            word_count = self._count_words(text)
            line_count = len(text.splitlines())

            metadata = self._create_metadata(
                word_count=word_count,
                line_count=line_count,
                file_size_bytes=path.stat().st_size,
            )

            logger.info(
                f"Successfully extracted text from {file_path}: "
                f"{word_count} words, {line_count} lines"
            )

            return ExtractionResult(
                text=text,
                metadata=metadata,
                success=True,
            )

        except Exception as e:
            logger.exception(f"Error extracting text from {file_path}: {e}")
            return ExtractionResult(
                text="",
                metadata={},
                success=False,
                error=str(e),
            )

    def _read_text_file(self, path: Path) -> str:
        """
        Read text file with encoding detection.

        Args:
            path: Path to the text file

        Returns:
            File contents as string

        Raises:
            Exception: If file cannot be read with any encoding
        """
        encodings = ["utf-8", "latin-1", "cp1252", "iso-8859-1"]

        for encoding in encodings:
            try:
                with path.open("r", encoding=encoding) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue

        # If all encodings fail, read as binary and decode with errors='ignore'
        with path.open("rb") as f:
            return f.read().decode("utf-8", errors="ignore")

    def supports_mime_type(self, mime_type: str) -> bool:
        """
        Check if this extractor supports the given MIME type.

        Args:
            mime_type: MIME type to check

        Returns:
            True if this extractor supports text/plain files
        """
        return mime_type in self.SUPPORTED_MIME_TYPES
