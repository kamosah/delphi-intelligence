"""Utility functions for normalizing filenames."""

import re
from pathlib import Path


def normalize_filename(filename: str, max_length: int = 255) -> str:
    """
    Normalize a filename to snake_case while preserving the file extension.

    Converts filenames to a predictable, consistent format:
    - Converts to lowercase
    - Replaces spaces, hyphens, and special characters with underscores
    - Removes consecutive underscores
    - Preserves file extension
    - Truncates to max_length if necessary

    Args:
        filename: The original filename (e.g., "My Document - Final (v2).pdf")
        max_length: Maximum length of the normalized filename (default 255)

    Returns:
        Normalized filename in snake_case (e.g., "my_document_final_v2.pdf")

    Examples:
        >>> normalize_filename("My Document.pdf")
        'my_document.pdf'
        >>> normalize_filename("Q3 Financial Report - 2024.xlsx")
        'q3_financial_report_2024.xlsx'
        >>> normalize_filename("Product_Roadmap (FINAL).docx")
        'product_roadmap_final.docx'
        >>> normalize_filename("meeting-notes-2024-01-15.txt")
        'meeting_notes_2024_01_15.txt'
        >>> normalize_filename("file!!!with@special#chars.pdf")
        'file_with_special_chars.pdf'
    """
    # Split filename and extension
    path = Path(filename)
    name = path.stem  # filename without extension
    ext = path.suffix  # extension including the dot

    # Convert to lowercase
    normalized = name.lower()

    # Replace spaces, hyphens, and special characters with underscores
    normalized = re.sub(r"[\s\-]+", "_", normalized)

    # Remove all non-alphanumeric characters except underscores
    normalized = re.sub(r"[^a-z0-9_]", "_", normalized)

    # Remove leading/trailing underscores
    normalized = normalized.strip("_")

    # Replace multiple consecutive underscores with single underscore
    normalized = re.sub(r"_+", "_", normalized)

    # If name is empty after normalization, use "untitled"
    if not normalized:
        normalized = "untitled"

    # Preserve extension (lowercase)
    ext = ext.lower()

    # Combine name and extension
    full_name = f"{normalized}{ext}"

    # Truncate if necessary (accounting for extension length)
    if len(full_name) > max_length:
        # Calculate how much to trim from the name part
        max_name_length = max_length - len(ext)
        if max_name_length > 0:
            normalized = normalized[:max_name_length].rstrip("_")
            full_name = f"{normalized}{ext}"
        else:
            # Extension is too long, just use it
            full_name = ext

    return full_name
