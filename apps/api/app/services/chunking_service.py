"""Document chunking service for splitting text into embedding-ready segments."""

import logging
from dataclasses import dataclass
from typing import Any

import nltk
import tiktoken
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_chunk import DocumentChunk

logger = logging.getLogger(__name__)

# Download NLTK punkt_tab tokenizer on first use
try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab", quiet=True)


@dataclass
class Chunk:
    """Represents a text chunk with metadata."""

    text: str
    index: int
    token_count: int
    start_char: int
    end_char: int
    metadata: dict[str, Any]


class ChunkingService:
    """Service for chunking document text into embedding-ready segments."""

    def __init__(
        self,
        chunk_size: int = 750,  # Target token count per chunk
        overlap: int = 100,  # Token overlap between chunks
        min_chunk_size: int = 500,  # Minimum tokens per chunk
        max_chunk_size: int = 1000,  # Maximum tokens per chunk
        model: str = "gpt-4",  # Model for token encoding
    ) -> None:
        """
        Initialize chunking service.

        Args:
            chunk_size: Target number of tokens per chunk (default: 750)
            overlap: Number of tokens to overlap between chunks (default: 100)
            min_chunk_size: Minimum tokens per chunk (default: 500)
            max_chunk_size: Maximum tokens per chunk (default: 1000)
            model: OpenAI model name for tiktoken encoding (default: gpt-4)
        """
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.min_chunk_size = min_chunk_size
        self.max_chunk_size = max_chunk_size
        self.encoding = tiktoken.encoding_for_model(model)

    def count_tokens(self, text: str) -> int:
        """
        Count the number of tokens in a text string.

        Args:
            text: Input text to count tokens

        Returns:
            Number of tokens in the text
        """
        return len(self.encoding.encode(text))

    def split_into_sentences(self, text: str) -> list[str]:
        """
        Split text into sentences using NLTK with fallback for overly long sentences.

        PDFs often have structured content (bullet lists, tables) that NLTK treats as
        single "sentences" of 1000+ characters. This method splits such long sentences
        by paragraph breaks to improve chunking granularity.

        Args:
            text: Input text to split

        Returns:
            List of sentences (with long sentences split by paragraphs)
        """
        # Use NLTK's punkt tokenizer for sentence splitting
        sentences: list[str] = nltk.sent_tokenize(text)

        # Fallback: split overly long sentences by paragraph breaks
        # This handles PDFs with bullet lists, tables, etc.
        max_sentence_chars = 500  # If a "sentence" is longer than this, split it

        refined_sentences = []
        for sentence in sentences:
            if len(sentence) > max_sentence_chars:
                # Split by double newline (paragraph break) or single newline
                paragraphs = sentence.split("\n\n")
                if len(paragraphs) == 1:
                    # Try single newline if no double newlines
                    paragraphs = sentence.split("\n")

                # Filter out empty paragraphs and add to refined list
                for para in paragraphs:
                    para_stripped = para.strip()
                    if para_stripped:
                        refined_sentences.append(para_stripped)

                logger.debug(
                    f"Split long sentence ({len(sentence)} chars) into {len(paragraphs)} paragraphs"
                )
            else:
                refined_sentences.append(sentence)

        return refined_sentences

    def chunk_text(
        self,
        text: str,
        document: Document,
    ) -> list[Chunk]:
        """
        Split text into chunks with overlap, preserving sentence boundaries.

        Args:
            text: Full document text to chunk
            document: Document instance for metadata

        Returns:
            List of Chunk objects with text, metadata, and positions
        """
        if not text or not text.strip():
            logger.warning(f"Document {document.id} has no text to chunk")
            return []

        # Split into sentences
        sentences = self.split_into_sentences(text)

        if not sentences:
            logger.warning(f"No sentences found in document {document.id}")
            return []

        chunks: list[Chunk] = []
        current_sentences: list[str] = []
        current_tokens = 0
        chunk_index = 0

        # Track character positions
        char_position = 0

        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)

            # If adding this sentence exceeds max_chunk_size, create a chunk
            if current_tokens + sentence_tokens > self.max_chunk_size and current_sentences:
                # Create chunk from current sentences
                chunk = self._create_chunk(
                    sentences=current_sentences,
                    index=chunk_index,
                    start_char=char_position - sum(len(s) for s in current_sentences),
                    document=document,
                )
                chunks.append(chunk)
                chunk_index += 1

                # Start new chunk with overlap
                overlap_sentences, overlap_tokens = self._get_overlap_sentences(
                    current_sentences, self.overlap
                )
                current_sentences = overlap_sentences
                current_tokens = overlap_tokens

            # Add sentence to current chunk
            current_sentences.append(sentence)
            current_tokens += sentence_tokens
            char_position += len(sentence) + 1  # +1 for space

            # If we've reached the target chunk_size, create a chunk
            if current_tokens >= self.chunk_size:
                chunk = self._create_chunk(
                    sentences=current_sentences,
                    index=chunk_index,
                    start_char=char_position - sum(len(s) for s in current_sentences),
                    document=document,
                )
                chunks.append(chunk)
                chunk_index += 1

                # Start new chunk with overlap
                overlap_sentences, overlap_tokens = self._get_overlap_sentences(
                    current_sentences, self.overlap
                )
                current_sentences = overlap_sentences
                current_tokens = overlap_tokens

        # Add remaining sentences as final chunk (if any)
        if current_sentences:
            # Only create chunk if it meets minimum size OR it's the only chunk
            if current_tokens >= self.min_chunk_size or not chunks:
                chunk = self._create_chunk(
                    sentences=current_sentences,
                    index=chunk_index,
                    start_char=char_position - sum(len(s) for s in current_sentences),
                    document=document,
                )
                chunks.append(chunk)
            elif chunks:
                last_chunk = chunks[-1]
                combined_text = last_chunk.text + " " + " ".join(current_sentences)
                chunks[-1] = Chunk(
                    text=combined_text,
                    index=last_chunk.index,
                    token_count=self.count_tokens(combined_text),
                    start_char=last_chunk.start_char,
                    end_char=char_position,
                    metadata=last_chunk.metadata,
                )

        logger.info(
            f"Created {len(chunks)} chunks for document {document.id} "
            f"({len(text)} chars, {self.count_tokens(text)} tokens)"
        )

        return chunks

    def _create_chunk(
        self,
        sentences: list[str],
        index: int,
        start_char: int,
        document: Document,
    ) -> Chunk:
        """
        Create a chunk from a list of sentences.

        Args:
            sentences: List of sentences for this chunk
            index: Chunk index in document
            start_char: Starting character position
            document: Source document

        Returns:
            Chunk object with metadata
        """
        chunk_text = " ".join(sentences)
        token_count = self.count_tokens(chunk_text)
        end_char = start_char + len(chunk_text)

        metadata = {
            "document_id": str(document.id),
            "document_name": document.name,
            "space_id": str(document.space_id),
            "sentence_count": len(sentences),
            "file_type": document.file_type,
        }

        # Add page number if available in document metadata
        if document.doc_metadata and "page_count" in document.doc_metadata:
            metadata["total_pages"] = document.doc_metadata["page_count"]

        return Chunk(
            text=chunk_text,
            index=index,
            token_count=token_count,
            start_char=start_char,
            end_char=end_char,
            metadata=metadata,
        )

    def _get_overlap_sentences(
        self,
        sentences: list[str],
        overlap_tokens: int,
    ) -> tuple[list[str], int]:
        """
        Get sentences from the end that fit within overlap token limit.

        Args:
            sentences: List of sentences to select from
            overlap_tokens: Target number of overlap tokens

        Returns:
            Tuple of (overlap_sentences, total_tokens)
        """
        if not sentences or overlap_tokens <= 0:
            return [], 0

        overlap_sentences: list[str] = []
        total_tokens = 0

        # Work backwards from the end
        for sentence in reversed(sentences):
            sentence_tokens = self.count_tokens(sentence)

            # Stop if adding this sentence exceeds overlap limit
            if total_tokens + sentence_tokens > overlap_tokens:
                break

            overlap_sentences.insert(0, sentence)
            total_tokens += sentence_tokens

        return overlap_sentences, total_tokens

    async def create_chunks_for_document(
        self,
        document: Document,
        db: AsyncSession,
    ) -> list[DocumentChunk]:
        """
        Create and persist chunks for a document.

        Args:
            document: Document to chunk
            db: Database session

        Returns:
            List of created DocumentChunk instances

        Raises:
            ValueError: If document has no extracted text
        """
        if not document.extracted_text:
            raise ValueError(f"Document {document.id} has no extracted text")

        # Generate chunks
        chunks = self.chunk_text(document.extracted_text, document)

        # Create DocumentChunk instances
        db_chunks: list[DocumentChunk] = []

        for chunk in chunks:
            db_chunk = DocumentChunk(
                document_id=document.id,
                chunk_text=chunk.text,
                chunk_index=chunk.index,
                token_count=chunk.token_count,
                start_char=chunk.start_char,
                end_char=chunk.end_char,
                chunk_metadata=chunk.metadata,
            )
            db_chunks.append(db_chunk)
            db.add(db_chunk)

        # Commit to database
        await db.commit()

        logger.info(f"Created {len(db_chunks)} chunks for document {document.id}")

        return db_chunks


# Global service instance
chunking_service = ChunkingService()


async def chunk_document(
    document: Document,
    db: AsyncSession,
) -> list[DocumentChunk]:
    """
    Convenience function to chunk a document using the global service.

    Args:
        document: Document to chunk
        db: Database session

    Returns:
        List of created DocumentChunk instances
    """
    return await chunking_service.create_chunks_for_document(document, db)
