"""GraphQL query resolvers."""

import logging
from uuid import UUID

from sqlalchemy import select
import strawberry

from app.db.session import get_session
from app.models.document import Document as DocumentModel
from app.models.query import Query as QueryModel
from app.models.space import Space as SpaceModel, SpaceMember as SpaceMemberModel
from app.models.user import User as UserModel
from app.services.vector_search_service import get_vector_search_service

from .types import Document, QueryResult, SearchDocumentsInput, SearchResult, Space, User

logger = logging.getLogger(__name__)


@strawberry.type
class Query:
    """GraphQL query root."""

    @strawberry.field
    async def user(self, id: strawberry.ID) -> User | None:
        """Get a user by ID."""
        async for session in get_session():
            try:
                user_id = UUID(str(id))
                stmt = select(UserModel).where(UserModel.id == user_id)
                result = await session.execute(stmt)
                user_model = result.scalar_one_or_none()

                if user_model:
                    return User.from_model(user_model)
                return None
            except ValueError:
                # Invalid UUID format
                return None
        return None

    @strawberry.field
    async def users(self, limit: int = 10, offset: int = 0) -> list[User]:
        """Get a list of users with pagination."""
        async for session in get_session():
            stmt = select(UserModel).limit(limit).offset(offset)
            result = await session.execute(stmt)
            user_models = result.scalars().all()

            return [User.from_model(user) for user in user_models]
        return []

    @strawberry.field
    async def user_by_email(self, email: str) -> User | None:
        """Get a user by email address."""
        async for session in get_session():
            stmt = select(UserModel).where(UserModel.email == email)
            result = await session.execute(stmt)
            user_model = result.scalar_one_or_none()

            if user_model:
                return User.from_model(user_model)
            return None
        return None

    @strawberry.field
    async def health(self) -> str:
        """Health check endpoint for GraphQL."""
        return "GraphQL API is healthy!"

    @strawberry.field
    async def search_documents(
        self, info: strawberry.types.Info, input: SearchDocumentsInput
    ) -> list[SearchResult]:
        """
        Perform semantic search across document chunks.

        Automatically filters results to only include documents from spaces
        the authenticated user has access to (owner or member).

        Args:
            input: Search parameters including query text and filters

        Returns:
            List of search results ordered by relevance

        Example query:
            query {
              searchDocuments(input: {
                query: "What are the key risks?",
                spaceId: "space-uuid",
                limit: 5,
                similarityThreshold: 0.7
              }) {
                chunk {
                  chunkText
                  chunkIndex
                  tokenCount
                }
                document {
                  name
                  fileType
                }
                similarityScore
                distance
              }
            }
        """
        async for session in get_session():
            # Get the authenticated user from the request context
            request = info.context["request"]
            user = getattr(request.state, "user", None)

            if not user:
                # No authenticated user - return empty results
                return []

            user_id = user.id

            # Get vector search service
            search_service = get_vector_search_service()

            # Convert strawberry.ID to UUID for space_id and document_ids
            space_id = UUID(str(input.space_id)) if input.space_id else None
            document_ids = (
                [UUID(str(doc_id)) for doc_id in input.document_ids] if input.document_ids else None
            )

            # If no specific space_id provided, get all spaces user has access to
            space_ids = None
            if space_id is None:
                # Get spaces where user is owner or member
                stmt = (
                    select(SpaceModel.id)
                    .outerjoin(SpaceMemberModel, SpaceMemberModel.space_id == SpaceModel.id)
                    .where((SpaceModel.owner_id == user_id) | (SpaceMemberModel.user_id == user_id))
                    .distinct()
                )
                result = await session.execute(stmt)
                space_ids = [row[0] for row in result.all()]
                logger.info(f"User {user_id} has access to {len(space_ids)} spaces: {space_ids}")

            # Perform search with access control
            logger.info(
                f"searchDocuments: query='{input.query[:50]}...', "
                f"space_id={space_id}, space_ids={space_ids}, "
                f"document_ids={document_ids}, limit={input.limit}, threshold={input.similarity_threshold}"
            )
            results = await search_service.search_similar_chunks(
                query=input.query,
                db=session,
                space_id=space_id,
                space_ids=space_ids,
                document_ids=document_ids,
                limit=input.limit,
                similarity_threshold=input.similarity_threshold,
            )
            logger.info(f"searchDocuments returned {len(results)} results")

            # Convert service results to GraphQL types
            return [SearchResult.from_service_result(result) for result in results]

        return []

    @strawberry.field
    async def spaces(
        self, info: strawberry.types.Info, limit: int = 10, offset: int = 0
    ) -> list[Space]:
        """
        Get a list of spaces the authenticated user owns or is a member of.

        Args:
            limit: Maximum number of spaces to return
            offset: Number of spaces to skip for pagination

        Returns:
            List of spaces
        """
        async for session in get_session():
            # Get the authenticated user from the request context
            request = info.context["request"]
            user = getattr(request.state, "user", None)

            if not user:
                return []

            user_id = user.id

            # Get spaces where user is owner or member
            # Relationships are eager loaded via lazy='selectin' in model
            stmt = (
                select(SpaceModel)
                .outerjoin(SpaceMemberModel)
                .where((SpaceModel.owner_id == user_id) | (SpaceMemberModel.user_id == user_id))
                .distinct()
                .limit(limit)
                .offset(offset)
            )

            result = await session.execute(stmt)
            space_models = result.scalars().all()

            return [Space.from_model(space) for space in space_models]

        return []

    @strawberry.field
    async def documents(
        self,
        info: strawberry.types.Info,
        space_id: strawberry.ID | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Document]:
        """
        Get a list of documents the authenticated user has access to.

        Args:
            space_id: Optional space ID to filter documents. If not provided, returns documents from all accessible spaces.
            limit: Maximum number of documents to return (default: 100)
            offset: Number of documents to skip for pagination

        Returns:
            List of documents
        """
        async for session in get_session():
            # Get the authenticated user from the request context
            request = info.context["request"]
            user = getattr(request.state, "user", None)

            if not user:
                return []

            user_id = user.id

            # Build query based on whether space_id is provided
            if space_id:
                # Filter by specific space
                space_uuid = UUID(str(space_id))

                # Verify user has access to this space
                space_access_stmt = (
                    select(SpaceModel.id)
                    .outerjoin(SpaceMemberModel, SpaceMemberModel.space_id == SpaceModel.id)
                    .where(
                        (SpaceModel.id == space_uuid)
                        & ((SpaceModel.owner_id == user_id) | (SpaceMemberModel.user_id == user_id))
                    )
                    .distinct()
                )
                space_result = await session.execute(space_access_stmt)
                if not space_result.scalar_one_or_none():
                    # User doesn't have access to this space
                    return []

                stmt = (
                    select(DocumentModel)
                    .where(DocumentModel.space_id == space_uuid)
                    .order_by(DocumentModel.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
            else:
                # Get documents from all spaces user has access to
                accessible_spaces_stmt = (
                    select(SpaceModel.id)
                    .outerjoin(SpaceMemberModel, SpaceMemberModel.space_id == SpaceModel.id)
                    .where((SpaceModel.owner_id == user_id) | (SpaceMemberModel.user_id == user_id))
                    .distinct()
                )
                space_result = await session.execute(accessible_spaces_stmt)
                space_ids = [row[0] for row in space_result.all()]

                if not space_ids:
                    return []

                stmt = (
                    select(DocumentModel)
                    .where(DocumentModel.space_id.in_(space_ids))
                    .order_by(DocumentModel.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                )

            result = await session.execute(stmt)
            document_models = result.scalars().all()

            return [Document.from_model(doc) for doc in document_models]

        return []

    @strawberry.field
    async def space(self, info: strawberry.types.Info, id: strawberry.ID) -> Space | None:
        """
        Get a space by ID.

        Args:
            id: The space ID

        Returns:
            The space if found and user has access, None otherwise
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    return None

                user_id = user.id
                space_id = UUID(str(id))

                # Get space and verify user has access (owner or member)
                # Relationships are eager loaded via lazy='selectin' in model
                stmt = (
                    select(SpaceModel)
                    .outerjoin(SpaceMemberModel)
                    .where(
                        (SpaceModel.id == space_id)
                        & ((SpaceModel.owner_id == user_id) | (SpaceMemberModel.user_id == user_id))
                    )
                    .distinct()
                )

                result = await session.execute(stmt)
                space_model = result.scalar_one_or_none()

                if space_model:
                    return Space.from_model(space_model)
                return None

            except ValueError:
                # Invalid UUID format
                return None

        return None

    @strawberry.field
    async def queries(
        self,
        info: strawberry.types.Info,
        space_id: strawberry.ID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[QueryResult]:
        """
        Get a list of queries for a specific space.

        Args:
            space_id: The space ID to filter queries
            limit: Maximum number of queries to return (default: 50)
            offset: Number of queries to skip for pagination

        Returns:
            List of queries ordered by creation date (most recent first)

        Example query:
            query {
              queries(spaceId: "space-uuid", limit: 20) {
                id
                queryText
                result
                confidenceScore
                status
                createdAt
                sources
              }
            }
        """
        async for session in get_session():
            # Get the authenticated user from the request context
            request = info.context["request"]
            user = getattr(request.state, "user", None)

            if not user:
                return []

            user_id = user.id
            space_uuid = UUID(str(space_id))

            # Verify user has access to this space
            space_access_stmt = (
                select(SpaceModel.id)
                .outerjoin(SpaceMemberModel, SpaceMemberModel.space_id == SpaceModel.id)
                .where(
                    (SpaceModel.id == space_uuid)
                    & ((SpaceModel.owner_id == user_id) | (SpaceMemberModel.user_id == user_id))
                )
                .distinct()
            )
            space_result = await session.execute(space_access_stmt)
            if not space_result.scalar_one_or_none():
                # User doesn't have access to this space
                logger.warning(
                    f"User {user_id} attempted to access queries for unauthorized space {space_uuid}"
                )
                return []

            # Get queries for the space
            stmt = (
                select(QueryModel)
                .where(QueryModel.space_id == space_uuid)
                .order_by(QueryModel.created_at.desc())
                .limit(limit)
                .offset(offset)
            )

            result = await session.execute(stmt)
            query_models = result.scalars().all()

            logger.info(f"Retrieved {len(query_models)} queries for space {space_uuid}")
            return [QueryResult.from_model(query) for query in query_models]

        return []

    @strawberry.field
    async def query(self, info: strawberry.types.Info, id: strawberry.ID) -> QueryResult | None:
        """
        Get a single query by ID.

        Args:
            id: The query ID

        Returns:
            The query if found and user has access, None otherwise

        Example query:
            query {
              query(id: "query-uuid") {
                id
                queryText
                result
                confidenceScore
                citations
                agentSteps
              }
            }
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    return None

                user_id = user.id
                query_id = UUID(str(id))

                # Get query and verify user has access via space membership
                stmt = (
                    select(QueryModel)
                    .join(SpaceModel, SpaceModel.id == QueryModel.space_id)
                    .outerjoin(SpaceMemberModel, SpaceMemberModel.space_id == SpaceModel.id)
                    .where(
                        (QueryModel.id == query_id)
                        & ((SpaceModel.owner_id == user_id) | (SpaceMemberModel.user_id == user_id))
                    )
                    .distinct()
                )

                result = await session.execute(stmt)
                query_model = result.scalar_one_or_none()

                if query_model:
                    return QueryResult.from_model(query_model)
                return None

            except ValueError:
                # Invalid UUID format
                return None

        return None
