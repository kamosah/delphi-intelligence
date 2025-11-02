"""GraphQL types for the application."""

from datetime import datetime
from enum import Enum
from typing import Any

import strawberry

from app.models.document import Document as DocumentModel
from app.models.document_chunk import DocumentChunk as DocumentChunkModel
from app.models.query import Query as QueryModel
from app.models.space import Space as SpaceModel
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
    doc_metadata: strawberry.scalars.JSON | None  # type: ignore[valid-type]
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
    chunk_metadata: strawberry.scalars.JSON  # type: ignore[valid-type]
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


@strawberry.type
class Space:
    """GraphQL Space type."""

    id: strawberry.ID
    name: str
    slug: str
    description: str | None
    icon_color: str | None
    is_public: bool
    max_members: int | None
    owner_id: strawberry.ID
    member_count: int
    document_count: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, space: SpaceModel) -> "Space":
        """Convert SQLAlchemy Space model to GraphQL Space type."""
        return cls(
            id=strawberry.ID(str(space.id)),
            name=space.name,
            slug=space.slug,
            description=space.description,
            icon_color=space.icon_color,
            is_public=space.is_public,
            max_members=space.max_members,
            owner_id=strawberry.ID(str(space.owner_id)),
            member_count=space.member_count,
            document_count=space.document_count,
            created_at=space.created_at,
            updated_at=space.updated_at,
        )


@strawberry.input
class CreateSpaceInput:
    """Input type for creating a new space."""

    name: str
    description: str | None = None
    icon_color: str | None = None


@strawberry.input
class UpdateSpaceInput:
    """Input type for updating an existing space."""

    name: str | None = None
    description: str | None = None
    icon_color: str | None = None


@strawberry.enum
class QueryStatusEnum(str, Enum):
    """GraphQL enum for query processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@strawberry.type
class Citation:
    """GraphQL Citation type for query source citations."""

    index: int
    document_id: strawberry.ID
    document_title: str
    chunk_index: int
    chunk_text: str
    relevance_score: float
    page_number: int | None = None


@strawberry.input
class CreateQueryInput:
    """Input type for creating a new query (manual creation, not via streaming)."""

    space_id: strawberry.ID
    query_text: str
    result: str | None = None
    title: str | None = None
    confidence_score: float | None = None


@strawberry.input
class UpdateQueryInput:
    """Input type for updating an existing query."""

    title: str | None = None
    result: str | None = None


@strawberry.type
class QueryResult:
    """GraphQL QueryResult type for AI agent query execution results."""

    id: strawberry.ID
    space_id: strawberry.ID
    created_by: strawberry.ID
    query_text: str
    result: str | None
    title: str | None
    context: str | None
    confidence_score: float | None
    agent_steps: strawberry.scalars.JSON | None  # type: ignore[valid-type]
    sources: strawberry.scalars.JSON | None  # type: ignore[valid-type]
    model_used: str | None
    status: QueryStatusEnum | None
    error_message: str | None
    processing_time_ms: int | None
    tokens_used: int | None
    cost_usd: float | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, query: QueryModel) -> "QueryResult":
        """Convert SQLAlchemy Query model to GraphQL QueryResult type."""
        # Convert QueryStatus enum to QueryStatusEnum if present
        status = None
        if query.status:
            status = QueryStatusEnum[query.status.name]

        return cls(
            id=strawberry.ID(str(query.id)),
            space_id=strawberry.ID(str(query.space_id)),
            created_by=strawberry.ID(str(query.created_by)),
            query_text=query.query_text,
            result=query.result,
            title=query.title,
            context=query.context,
            confidence_score=query.confidence_score,
            agent_steps=query.agent_steps,
            sources=query.sources,
            model_used=query.model_used,
            status=status,
            error_message=query.error_message,
            processing_time_ms=query.processing_time_ms,
            tokens_used=query.tokens_used,
            cost_usd=float(query.cost_usd) if query.cost_usd else None,
            completed_at=query.completed_at,
            created_at=query.created_at,
            updated_at=query.updated_at,
        )
