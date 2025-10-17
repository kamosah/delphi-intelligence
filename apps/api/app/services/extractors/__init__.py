"""Document extractors package."""

from .base import BaseExtractor, ExtractionResult
from .docx_extractor import DOCXExtractor
from .pdf_extractor import PDFExtractor
from .text_extractor import TextExtractor

__all__ = [
    "BaseExtractor",
    "ExtractionResult",
    "PDFExtractor",
    "DOCXExtractor",
    "TextExtractor",
]
