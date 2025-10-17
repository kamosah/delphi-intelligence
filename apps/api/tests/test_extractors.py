"""Tests for document extractors."""

import tempfile
from pathlib import Path

from app.services.extractors import DOCXExtractor, PDFExtractor, TextExtractor


class TestTextExtractor:
    """Tests for TextExtractor."""

    def test_supports_mime_type(self) -> None:
        """Test MIME type support."""
        extractor = TextExtractor()
        assert extractor.supports_mime_type("text/plain")
        assert extractor.supports_mime_type("text/txt")
        assert not extractor.supports_mime_type("application/pdf")

    def test_extract_simple_text(self) -> None:
        """Test extracting text from a simple text file."""
        extractor = TextExtractor()

        # Create temporary text file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("Hello, World!\nThis is a test.")
            temp_path = f.name

        try:
            result = extractor.extract(temp_path)

            assert result.success
            assert result.error is None
            assert "Hello, World!" in result.text
            assert "This is a test." in result.text
            assert result.metadata["word_count"] == 6
            assert result.metadata["line_count"] == 2
        finally:
            Path(temp_path).unlink()

    def test_extract_empty_file(self) -> None:
        """Test extracting from an empty text file."""
        extractor = TextExtractor()

        # Create empty temporary text file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            temp_path = f.name

        try:
            result = extractor.extract(temp_path)

            assert not result.success
            assert result.error == "Empty text file"
        finally:
            Path(temp_path).unlink()

    def test_extract_nonexistent_file(self) -> None:
        """Test extracting from a nonexistent file."""
        extractor = TextExtractor()
        result = extractor.extract("/nonexistent/file.txt")

        assert not result.success
        assert "File not found" in result.error


class TestPDFExtractor:
    """Tests for PDFExtractor."""

    def test_supports_mime_type(self) -> None:
        """Test MIME type support."""
        extractor = PDFExtractor()
        assert extractor.supports_mime_type("application/pdf")
        assert not extractor.supports_mime_type("text/plain")

    def test_extract_nonexistent_file(self) -> None:
        """Test extracting from a nonexistent PDF."""
        extractor = PDFExtractor()
        result = extractor.extract("/nonexistent/file.pdf")

        assert not result.success
        assert "File not found" in result.error


class TestDOCXExtractor:
    """Tests for DOCXExtractor."""

    def test_supports_mime_type(self) -> None:
        """Test MIME type support."""
        extractor = DOCXExtractor()
        assert extractor.supports_mime_type(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        assert extractor.supports_mime_type("application/msword")
        assert not extractor.supports_mime_type("text/plain")

    def test_extract_nonexistent_file(self) -> None:
        """Test extracting from a nonexistent DOCX."""
        extractor = DOCXExtractor()
        result = extractor.extract("/nonexistent/file.docx")

        assert not result.success
        assert "File not found" in result.error
