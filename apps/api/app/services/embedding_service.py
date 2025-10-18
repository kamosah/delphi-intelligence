"""Vector embedding service for generating OpenAI embeddings."""

import asyncio
import logging
from typing import Any

from openai import AsyncOpenAI, RateLimitError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings
from app.models.document import Document
from app.models.document_chunk import DocumentChunk

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating vector embeddings using OpenAI API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        batch_size: int | None = None,
        max_retries: int | None = None,
    ) -> None:
        """
        Initialize embedding service.

        Args:
            api_key: OpenAI API key (defaults to settings.openai_api_key)
            model: Embedding model name (defaults to settings.openai_embedding_model)
            batch_size: Number of texts to embed per batch (defaults to settings)
            max_retries: Maximum retry attempts (defaults to settings)
        """
        self.api_key = api_key or settings.openai_api_key
        self.model = model or settings.openai_embedding_model
        self.batch_size = batch_size or settings.openai_embedding_batch_size
        self.max_retries = max_retries or settings.openai_max_retries

        if not self.api_key:
            error_msg = "OpenAI API key is required. Set OPENAI_API_KEY environment variable."
            raise ValueError(error_msg)

        self.client = AsyncOpenAI(api_key=self.api_key)

        logger.info(f"Initialized EmbeddingService with model: {self.model}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type(RateLimitError),
        reraise=True,
    )
    async def generate_embedding(self, text: str) -> list[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Input text to embed

        Returns:
            List of float values representing the embedding vector

        Raises:
            RateLimitError: If API rate limit is exceeded (will retry)
            Exception: For other API errors
        """
        if not text or not text.strip():
            error_msg = "Text cannot be empty"
            raise ValueError(error_msg)

        try:
            response = await self.client.embeddings.create(input=text, model=self.model)

            embedding: list[float] = response.data[0].embedding

            logger.debug(f"Generated embedding with {len(embedding)} dimensions")
            return embedding

        except RateLimitError:
            logger.warning("OpenAI rate limit hit, retrying...")
            raise
        except Exception as e:
            logger.exception(f"Error generating embedding: {e}")
            raise

    async def generate_batch_embeddings(
        self,
        texts: list[str],
        batch_size: int | None = None,
    ) -> list[list[float]]:
        """
        Generate embeddings for multiple texts in batches.

        Args:
            texts: List of input texts to embed
            batch_size: Override default batch size

        Returns:
            List of embedding vectors (one per input text)

        Raises:
            ValueError: If texts list is empty
            Exception: For API errors
        """
        if not texts:
            error_msg = "Texts list cannot be empty"
            raise ValueError(error_msg)

        batch_size = batch_size or self.batch_size
        embeddings: list[list[float]] = []

        logger.info(f"Generating embeddings for {len(texts)} texts in batches of {batch_size}")

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]

            # Filter out empty texts
            valid_batch = [text for text in batch if text and text.strip()]

            if not valid_batch:
                logger.warning(f"Batch {i // batch_size + 1} has no valid texts, skipping")
                continue

            try:
                # Generate embeddings for batch with retry logic
                batch_embeddings = await self._generate_batch_with_retry(valid_batch)
                embeddings.extend(batch_embeddings)

                logger.info(
                    f"Generated {len(batch_embeddings)} embeddings "
                    f"(batch {i // batch_size + 1}/{(len(texts) - 1) // batch_size + 1})"
                )

                # Rate limiting: small delay between batches
                if i + batch_size < len(texts):
                    await asyncio.sleep(0.1)

            except Exception as e:
                logger.exception(
                    f"Error generating embeddings for batch {i // batch_size + 1}: {e}"
                )
                raise

        logger.info(f"Successfully generated {len(embeddings)} embeddings")
        return embeddings

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type(RateLimitError),
        reraise=True,
    )
    async def _generate_batch_with_retry(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for a batch with retry logic.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors

        Raises:
            RateLimitError: If rate limit exceeded (will retry)
            Exception: For other errors
        """
        try:
            response = await self.client.embeddings.create(input=texts, model=self.model)

            batch_embeddings = [item.embedding for item in response.data]
            return batch_embeddings

        except RateLimitError:
            logger.warning("OpenAI rate limit hit for batch, retrying...")
            raise

    async def embed_document_chunks(
        self,
        document: Document,
        db: AsyncSession,
        force_regenerate: bool = False,
    ) -> int:
        """
        Generate and store embeddings for all chunks of a document.

        Args:
            document: Document whose chunks need embeddings
            db: Database session
            force_regenerate: If True, regenerate embeddings even if they exist

        Returns:
            Number of chunks that were embedded

        Raises:
            ValueError: If document has no chunks
            Exception: For API or database errors
        """
        # Fetch all chunks for this document
        result = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document.id)
            .order_by(DocumentChunk.chunk_index)
        )
        chunks = result.scalars().all()

        if not chunks:
            raise ValueError(f"Document {document.id} has no chunks to embed")

        # Filter chunks that need embeddings
        if force_regenerate:
            chunks_to_embed = chunks
        else:
            chunks_to_embed = [chunk for chunk in chunks if chunk.embedding is None]

        if not chunks_to_embed:
            logger.info(
                f"All {len(chunks)} chunks for document {document.id} already have embeddings"
            )
            return 0

        logger.info(
            f"Embedding {len(chunks_to_embed)} chunks for document {document.id} "
            f"(total: {len(chunks)})"
        )

        # Extract texts from chunks
        texts = [chunk.chunk_text for chunk in chunks_to_embed]

        # Generate embeddings in batches
        embeddings = await self.generate_batch_embeddings(texts)

        # Store embeddings in database
        for chunk, embedding in zip(chunks_to_embed, embeddings, strict=True):
            # Store embedding as list of floats (pgvector handles the conversion)
            chunk.embedding = embedding

        await db.commit()

        logger.info(
            f"Successfully embedded {len(chunks_to_embed)} chunks for document {document.id}"
        )

        return len(chunks_to_embed)

    async def get_embedding_dimensions(self) -> int:
        """
        Get the dimensionality of embeddings from the current model.

        Returns:
            Number of dimensions in embedding vectors

        Note:
            - text-embedding-3-small: 1536 dimensions
            - text-embedding-3-large: 3072 dimensions
            - text-embedding-ada-002: 1536 dimensions
        """
        # Generate a test embedding to determine dimensions
        test_embedding = await self.generate_embedding("test")
        return len(test_embedding)

    async def estimate_cost(
        self,
        token_count: int,
        model: str | None = None,
    ) -> dict[str, Any]:
        """
        Estimate the cost of embedding a certain number of tokens.

        Args:
            token_count: Number of tokens to embed
            model: Model name (defaults to self.model)

        Returns:
            Dictionary with cost estimates

        Note:
            Pricing as of 2024 (subject to change):
            - text-embedding-3-small: $0.02 per 1M tokens
            - text-embedding-3-large: $0.13 per 1M tokens
            - text-embedding-ada-002: $0.10 per 1M tokens
        """
        model = model or self.model

        # Pricing per 1M tokens (update as needed)
        pricing = {
            "text-embedding-3-small": 0.02,
            "text-embedding-3-large": 0.13,
            "text-embedding-ada-002": 0.10,
        }

        price_per_million = pricing.get(model, 0.02)  # Default to small model pricing
        estimated_cost = (token_count / 1_000_000) * price_per_million

        return {
            "model": model,
            "token_count": token_count,
            "estimated_cost_usd": round(estimated_cost, 4),
            "price_per_million_tokens": price_per_million,
        }


# Global service instance (lazy initialization)
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """
    Get or create the global embedding service instance.

    Returns:
        Global EmbeddingService instance

    Raises:
        ValueError: If OpenAI API key is not configured
    """
    global _embedding_service  # noqa: PLW0603

    if _embedding_service is None:
        _embedding_service = EmbeddingService()

    return _embedding_service


async def embed_document(
    document: Document,
    db: AsyncSession,
    force_regenerate: bool = False,
) -> int:
    """
    Convenience function to embed a document's chunks.

    Args:
        document: Document to embed
        db: Database session
        force_regenerate: If True, regenerate embeddings even if they exist

    Returns:
        Number of chunks that were embedded
    """
    service = get_embedding_service()
    return await service.embed_document_chunks(document, db, force_regenerate)
