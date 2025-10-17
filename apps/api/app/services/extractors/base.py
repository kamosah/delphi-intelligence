"""Base extractor interface for document text extraction."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class ExtractionResult:
    """Result of text extraction from a document."""

    text: str
    metadata: dict[str, Any]
    success: bool
    error: str | None = None


class BaseExtractor(ABC):
    """Abstract base class for document extractors."""

    @abstractmethod
    def extract(self, file_path: str) -> ExtractionResult:
        """
        Extract text and metadata from a document.

        Args:
            file_path: Path to the document file

        Returns:
            ExtractionResult containing extracted text and metadata

        Raises:
            Exception: If extraction fails
        """

    @abstractmethod
    def supports_mime_type(self, mime_type: str) -> bool:
        """
        Check if this extractor supports the given MIME type.

        Args:
            mime_type: MIME type to check

        Returns:
            True if this extractor supports the MIME type
        """

    def _count_words(self, text: str) -> int:
        """
        Count words in extracted text.

        Args:
            text: Text to count words in

        Returns:
            Number of words
        """
        return len(text.split())

    def _create_metadata(
        self,
        page_count: int | None = None,
        word_count: int | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Create standardized metadata dictionary.

        Args:
            page_count: Number of pages in document
            word_count: Number of words in document
            **kwargs: Additional metadata fields

        Returns:
            Metadata dictionary
        """
        metadata: dict[str, Any] = {}

        if page_count is not None:
            metadata["page_count"] = page_count

        if word_count is not None:
            metadata["word_count"] = word_count

        metadata.update(kwargs)

        return metadata
