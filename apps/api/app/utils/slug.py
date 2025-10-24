"""Utility functions for generating URL-safe slugs."""

import re
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


def slugify(text: str, max_length: int = 100) -> str:
    """
    Convert text to a URL-safe slug.

    Args:
        text: The text to convert to a slug
        max_length: Maximum length of the slug (default 100)

    Returns:
        A URL-safe slug string

    Example:
        >>> slugify("My New Space!")
        'my-new-space'
        >>> slugify("  Multiple   Spaces  ")
        'multiple-spaces'
    """
    # Convert to lowercase
    slug = text.lower()

    # Replace spaces and underscores with hyphens
    slug = re.sub(r"[\s_]+", "-", slug)

    # Remove all non-alphanumeric characters except hyphens
    slug = re.sub(r"[^a-z0-9-]", "", slug)

    # Remove leading/trailing hyphens
    slug = slug.strip("-")

    # Replace multiple consecutive hyphens with single hyphen
    slug = re.sub(r"-+", "-", slug)

    # Truncate to max_length
    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")

    return slug


async def generate_unique_slug(
    base_text: str, db: "AsyncSession", model_class: type, slug_field: str = "slug"
) -> str:
    """
    Generate a unique slug by appending a suffix if necessary.

    Args:
        base_text: The text to create a slug from
        db: Database session
        model_class: SQLAlchemy model class to check against
        slug_field: Name of the slug field in the model (default "slug")

    Returns:
        A unique slug that doesn't exist in the database

    Example:
        If "my-space" exists, returns "my-space-1"
        If "my-space-1" exists, returns "my-space-2"
    """
    from sqlalchemy import Select, select

    base_slug = slugify(base_text)

    # If slug is empty after slugification, use a random UUID
    if not base_slug:
        return str(uuid.uuid4())[:8]

    # Check if base slug exists
    stmt: Select = select(model_class).where(getattr(model_class, slug_field) == base_slug)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if not existing:
        return base_slug

    # If it exists, find all matching slugs in a single query
    # Query for all slugs that start with base_slug (including numbered variants)
    stmt = select(getattr(model_class, slug_field)).where(
        getattr(model_class, slug_field).like(f"{base_slug}%")
    )
    result = await db.execute(stmt)
    existing_slugs = {row[0] for row in result.fetchall()}

    # Find the next available counter by checking which numbers are taken
    counter = 1
    while counter <= 1000:
        candidate_slug = f"{base_slug}-{counter}"
        if candidate_slug not in existing_slugs:
            return candidate_slug
        counter += 1

    # Fallback to UUID if we can't find a unique slug after 1000 attempts
    return f"{base_slug}-{uuid.uuid4().hex[:6]}"
