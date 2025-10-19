"""GraphQL types for the application."""

from datetime import datetime
from typing import Annotated, Any

import strawberry

from app.models.document import Document as DocumentModel
from app.models.document_chunk import DocumentChunk as DocumentChunkModel
from app.models.user import User as UserModel


@strawberry.type
class User:
    """GraphQL User type."""

    id: strawberry.ID
    email: str
    full_name: str | None
    avatar_url: str | None
    bio: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, user: UserModel) -> "User":
        """Convert SQLAlchemy User model to GraphQL User type."""
        return cls(
            id=strawberry.ID(str(user.id)),
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            bio=user.bio,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )


@strawberry.input
class CreateUserInput:
    """Input type for creating a new user."""

    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None


@strawberry.input
class UpdateUserInput:
    """Input type for updating an existing user."""

    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None


@strawberry.type
class Document:
    """GraphQL Document type."""

    id: strawberry.ID
    space_id: strawberry.ID
    name: str
    file_type: str
    file_path: str
    size_bytes: int
    status: str
    extracted_text: str | None
    doc_metadata: strawberry.scalars.JSON | None
    processed_at: datetime | None
    processing_error: str | None
    uploaded_by: strawberry.ID
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, document: DocumentModel) -> "Document":
        """Convert SQLAlchemy Document model to GraphQL Document type."""
        return cls(
            id=strawberry.ID(str(document.id)),
            space_id=strawberry.ID(str(document.space_id)),
            name=document.name,
            file_type=document.file_type,
            file_path=document.file_path,
            size_bytes=document.size_bytes,
            status=document.status,
            extracted_text=document.extracted_text,
            doc_metadata=document.doc_metadata,
            processed_at=document.processed_at,
            processing_error=document.processing_error,
            uploaded_by=strawberry.ID(str(document.uploaded_by)),
            created_at=document.created_at,
            updated_at=document.updated_at,
        )


@strawberry.type
class DocumentChunk:
    """GraphQL DocumentChunk type."""

    id: strawberry.ID
    document_id: strawberry.ID
    chunk_text: str
    chunk_index: int
    token_count: int
    chunk_metadata: strawberry.scalars.JSON
    start_char: int
    end_char: int
    created_at: datetime

    @classmethod
    def from_model(cls, chunk: DocumentChunkModel) -> "DocumentChunk":
        """Convert SQLAlchemy DocumentChunk model to GraphQL DocumentChunk type."""
        return cls(
            id=strawberry.ID(str(chunk.id)),
            document_id=strawberry.ID(str(chunk.document_id)),
            chunk_text=chunk.chunk_text,
            chunk_index=chunk.chunk_index,
            token_count=chunk.token_count,
            chunk_metadata=chunk.chunk_metadata,
            start_char=chunk.start_char,
            end_char=chunk.end_char,
            created_at=chunk.created_at,
        )


@strawberry.type
class SearchResult:
    """GraphQL SearchResult type for semantic search results."""

    chunk: DocumentChunk
    document: Document
    similarity_score: float
    distance: float

    @classmethod
    def from_service_result(
        cls,
        result: Any,  # VectorSearchService.SearchResult
    ) -> "SearchResult":
        """Convert VectorSearchService SearchResult to GraphQL SearchResult type."""
        return cls(
            chunk=DocumentChunk.from_model(result.chunk),
            document=Document.from_model(result.document),
            similarity_score=result.similarity_score,
            distance=result.distance,
        )


@strawberry.input
class SearchDocumentsInput:
    """Input type for semantic document search."""

    query: str
    space_id: strawberry.ID | None = None
    document_ids: list[strawberry.ID] | None = None
    limit: int = 10
    similarity_threshold: float = 0.0
