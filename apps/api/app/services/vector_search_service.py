"""Vector search service for semantic similarity search using pgvector."""

import logging
from typing import NamedTuple
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.embedding_service import EmbeddingService, get_embedding_service

logger = logging.getLogger(__name__)


class SearchResult(NamedTuple):
    """Search result containing chunk and relevance score."""

    chunk: DocumentChunk
    document: Document
    similarity_score: float  # 1.0 = identical, 0.0 = completely different
    distance: float  # Cosine distance (lower is better)


class VectorSearchService:
    """Service for semantic similarity search using vector embeddings."""

    def __init__(
        self,
        embedding_service: EmbeddingService | None = None,
    ) -> None:
        """
        Initialize vector search service.

        Args:
            embedding_service: Embedding service instance (defaults to global instance)
        """
        self.embedding_service = embedding_service or get_embedding_service()
        logger.info("Initialized VectorSearchService")

    async def search_similar_chunks(
        self,
        query: str,
        db: AsyncSession,
        space_id: UUID | None = None,
        space_ids: list[UUID] | None = None,
        document_ids: list[UUID] | None = None,
        limit: int = 10,
        similarity_threshold: float = 0.0,
    ) -> list[SearchResult]:
        """
        Find similar document chunks using cosine similarity.

        Args:
            query: Search query text
            db: Database session
            space_id: Optional filter by single space (takes precedence over space_ids)
            space_ids: Optional filter by multiple spaces (user's accessible spaces)
            document_ids: Optional filter by specific documents
            limit: Maximum number of results to return (default: 10)
            similarity_threshold: Minimum similarity score (0.0-1.0, default: 0.0)

        Returns:
            List of SearchResult tuples ordered by relevance (most similar first)

        Raises:
            ValueError: If query is empty or limit is invalid
            Exception: For embedding or database errors

        Note:
            - Similarity score: 1.0 = identical, 0.0 = completely different
            - Distance: Lower is better (inverse of similarity)
            - Cosine similarity = 1 - cosine_distance
            - If both space_id and space_ids are provided, space_id takes precedence
        """
        if not query or not query.strip():
            msg = "Query cannot be empty"
            raise ValueError(msg)

        if limit < 1 or limit > 100:
            msg = "Limit must be between 1 and 100"
            raise ValueError(msg)

        if similarity_threshold < 0.0 or similarity_threshold > 1.0:
            msg = "Similarity threshold must be between 0.0 and 1.0"
            raise ValueError(msg)

        logger.info(
            f"[VECTOR_SEARCH] Starting search for: '{query[:50]}...' "
            f"space_id={space_id}, space_ids={space_ids}, document_ids={document_ids}, "
            f"limit={limit}, threshold={similarity_threshold}"
        )

        # Generate embedding for the query
        try:
            logger.info("[VECTOR_SEARCH] Generating query embedding via OpenAI...")
            query_embedding = await self.embedding_service.generate_embedding(query)
            logger.info(f"[VECTOR_SEARCH] Generated embedding: {len(query_embedding)} dimensions")
        except Exception as e:
            logger.exception(f"[VECTOR_SEARCH] Error generating query embedding: {e}")
            raise

        # Build the query with vector similarity search
        # Using cosine_distance operator from pgvector
        stmt = (
            select(
                DocumentChunk,
                Document,
                DocumentChunk.embedding.cosine_distance(query_embedding).label("distance"),
            )
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(DocumentChunk.embedding.isnot(None))  # Only search chunks with embeddings
        )

        # Apply filters
        filters = []

        # Single space_id takes precedence over space_ids
        if space_id is not None:
            filters.append(Document.space_id == space_id)
            logger.info(f"[VECTOR_SEARCH] Adding filter: single space_id={space_id}")
        elif space_ids is not None and len(space_ids) > 0:
            filters.append(Document.space_id.in_(space_ids))
            logger.info(f"[VECTOR_SEARCH] Adding filter: multiple space_ids={space_ids}")
        else:
            logger.info("[VECTOR_SEARCH] WARNING: No space filter applied!")

        if document_ids is not None and len(document_ids) > 0:
            filters.append(DocumentChunk.document_id.in_(document_ids))
            logger.info(f"[VECTOR_SEARCH] Adding filter: document_ids={document_ids}")

        logger.info(f"[VECTOR_SEARCH] Total filters: {len(filters)}")
        if filters:
            stmt = stmt.where(and_(*filters))

        # Order by distance (lower is better) and limit results
        stmt = stmt.order_by("distance").limit(limit)

        # Execute query
        try:
            logger.info("[VECTOR_SEARCH] Executing database query...")
            result = await db.execute(stmt)
            rows = result.all()
            logger.info(f"[VECTOR_SEARCH] Database returned {len(rows)} raw rows")
        except Exception as e:
            logger.exception(f"[VECTOR_SEARCH] Error executing vector search query: {e}")
            raise

        # Convert to SearchResult objects
        search_results = []
        filtered_count = 0
        for chunk, document, distance in rows:
            # Convert cosine distance to similarity score
            # Cosine distance: 0 = identical, 2 = opposite
            # Similarity: 1 = identical, 0 = completely different
            similarity_score = 1.0 - distance

            # Apply similarity threshold filter
            if similarity_score < similarity_threshold:
                filtered_count += 1
                logger.info(
                    f"[VECTOR_SEARCH] Filtered out result: score={similarity_score:.4f} < threshold={similarity_threshold}"
                )
                continue

            search_results.append(
                SearchResult(
                    chunk=chunk,
                    document=document,
                    similarity_score=similarity_score,
                    distance=distance,
                )
            )
            logger.info(
                f"[VECTOR_SEARCH] Kept result: doc={document.name}, score={similarity_score:.4f}, distance={distance:.4f}"
            )

        logger.info(
            f"[VECTOR_SEARCH] Final: {len(search_results)} results returned, {filtered_count} filtered out by threshold"
        )

        return search_results

    async def search_by_embedding(
        self,
        query_embedding: list[float],
        db: AsyncSession,
        space_id: UUID | None = None,
        document_ids: list[UUID] | None = None,
        limit: int = 10,
        similarity_threshold: float = 0.0,
    ) -> list[SearchResult]:
        """
        Find similar document chunks using a pre-computed embedding vector.

        Useful when you already have an embedding and want to avoid re-computing it.

        Args:
            query_embedding: Pre-computed embedding vector (1536 dimensions)
            db: Database session
            space_id: Optional filter by space
            document_ids: Optional filter by specific documents
            limit: Maximum number of results to return (default: 10)
            similarity_threshold: Minimum similarity score (0.0-1.0, default: 0.0)

        Returns:
            List of SearchResult tuples ordered by relevance

        Raises:
            ValueError: If embedding dimensions are invalid or limit is invalid
            Exception: For database errors
        """
        if not query_embedding or len(query_embedding) != 1536:
            msg = "Query embedding must be a 1536-dimensional vector"
            raise ValueError(msg)

        if limit < 1 or limit > 100:
            msg = "Limit must be between 1 and 100"
            raise ValueError(msg)

        logger.info(
            f"Searching with pre-computed embedding "
            f"(space_id={space_id}, document_ids={document_ids}, limit={limit})"
        )

        # Build the query
        stmt = (
            select(
                DocumentChunk,
                Document,
                DocumentChunk.embedding.cosine_distance(query_embedding).label("distance"),
            )
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(DocumentChunk.embedding.isnot(None))
        )

        # Apply filters
        filters = []

        if space_id is not None:
            filters.append(Document.space_id == space_id)

        if document_ids is not None and len(document_ids) > 0:
            filters.append(DocumentChunk.document_id.in_(document_ids))

        if filters:
            stmt = stmt.where(and_(*filters))

        # Order and limit
        stmt = stmt.order_by("distance").limit(limit)

        # Execute
        try:
            result = await db.execute(stmt)
            rows = result.all()
        except Exception as e:
            logger.exception(f"Error executing vector search: {e}")
            raise

        # Convert to SearchResult objects
        search_results = []
        for chunk, document, distance in rows:
            similarity_score = 1.0 - distance

            if similarity_score < similarity_threshold:
                continue

            search_results.append(
                SearchResult(
                    chunk=chunk,
                    document=document,
                    similarity_score=similarity_score,
                    distance=distance,
                )
            )

        logger.info(f"Found {len(search_results)} results with pre-computed embedding")

        return search_results


# Global service instance (lazy initialization)
_vector_search_service: VectorSearchService | None = None


def get_vector_search_service() -> VectorSearchService:
    """
    Get or create the global vector search service instance.

    Returns:
        Global VectorSearchService instance

    Raises:
        ValueError: If embedding service cannot be initialized
    """
    global _vector_search_service  # noqa: PLW0603

    if _vector_search_service is None:
        _vector_search_service = VectorSearchService()

    return _vector_search_service
