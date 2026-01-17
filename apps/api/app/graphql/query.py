"""GraphQL query resolvers."""

import logging
from datetime import datetime, UTC
from uuid import UUID

from sqlalchemy import extract, func, select
from sqlalchemy.orm import joinedload
import strawberry

from app.auth.jwt_handler import jwt_manager
from app.db.session import get_session
from app.models.document import Document as DocumentModel
from app.models.organization import Organization as OrganizationModel
from app.models.organization_invitation import InvitationStatus
from app.models.organization_member import OrganizationMember as OrganizationMemberModel
from app.models.thread import Thread as ThreadModel
from app.models.space import Space as SpaceModel, SpaceMember as SpaceMemberModel
from app.models.user import User as UserModel
from app.models.user_preferences import UserPreferences as UserPreferencesModel
from app.schemas.spicedb import CheckPermissionInput
from app.services.invitation_service import InvitationService
from app.services.organization_service import OrganizationService
from app.services.spicedb_service import get_spicedb_service
from app.services.vector_search_service import get_vector_search_service
from app.supabase_client import get_admin_client

from .types import (
    DashboardStats,
    Document,
    DocumentFilterInput,
    DocumentSortInput,
    InvitationStatusEnum,
    Organization,
    OrganizationInvitation,
    OrganizationMember,
    SearchDocumentsInput,
    SearchResult,
    SortOrder,
    Space,
    Thread,
    User,
    UserPreferences,
)

logger = logging.getLogger(__name__)


def escape_like_pattern(text: str) -> str:
    """
    Escape special characters in LIKE/ILIKE patterns.

    Escapes wildcards (%, _) and escape character (\\) to prevent users
    from injecting wildcard patterns that could cause performance issues
    or unintended matches.

    Args:
        text: The search text to escape

    Returns:
        Escaped text safe for use in LIKE/ILIKE patterns

    Example:
        >>> escape_like_pattern("Q1_Report")
        "Q1\\_Report"
        >>> escape_like_pattern("50% done")
        "50\\% done"
    """
    # Escape backslash first, then other wildcards
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


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
    async def me(self, info: strawberry.types.Info) -> User:
        """
        Get the current authenticated user with email confirmation status from Supabase.

        Returns:
            Current user profile (User model fetched by AuthenticationMiddleware)

        Raises:
            Exception if user is not authenticated

        Example query:
            query {
              me {
                id
                email
                fullName
                role
                isActive
                avatarUrl
                emailConfirmed
              }
            }
        """
        request = info.context["request"]
        user_model = request.state.user

        if not user_model:
            error_msg = "Authentication required"
            raise ValueError(error_msg)

        # Get Supabase token from JWT payload to check email confirmation
        email_confirmed = False
        try:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                olympus_token = auth_header.replace("Bearer ", "")
                payload = jwt_manager.verify_token(olympus_token)

                if payload and "supabase_token" in payload:
                    supabase_token = payload["supabase_token"]
                    admin_client = get_admin_client()
                    user_response = admin_client.auth.get_user(supabase_token)

                    if user_response.user and user_response.user.email_confirmed_at:
                        email_confirmed = True
        except Exception as e:
            logger.warning(f"Failed to get email confirmation status: {e}")
            # Continue with email_confirmed=False

        # User model fetched by AuthenticationMiddleware
        return User.from_model(user_model, email_confirmed=email_confirmed)

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
        self,
        info: strawberry.types.Info,
        organization_id: strawberry.ID | None = None,
        limit: int = 10,
        offset: int = 0,
    ) -> list[Space]:
        """
        Get a list of spaces the authenticated user owns or is a member of.

        Args:
            organization_id: Optional organization ID to filter spaces by organization.
            limit: Maximum number of spaces to return
            offset: Number of spaces to skip for pagination

        Returns:
            List of spaces

        Note:
            If organization_id is provided, it must match the user's current organization.
        """
        async for session in get_session():
            # Get the authenticated user from the request context
            request = info.context["request"]
            user = getattr(request.state, "user", None)

            if not user:
                return []

            user_id = user.id

            # Verify organization_id matches user's current organization
            if organization_id:
                org_uuid = UUID(str(organization_id))

                # Get user's current organization from OrganizationService
                current_org_id = await OrganizationService.get_current_organization_id(
                    user_id=user_id, db=session
                )

                if not current_org_id or current_org_id != org_uuid:
                    logger.warning(
                        f"User {user_id} queried spaces for org {org_uuid} "
                        f"but current org is {current_org_id}. Returning empty list."
                    )
                    return []

                # Filter spaces by organization
                stmt = (
                    select(SpaceModel)
                    .outerjoin(SpaceMemberModel)
                    .where(
                        (SpaceModel.organization_id == org_uuid)
                        & ((SpaceModel.owner_id == user_id) | (SpaceMemberModel.user_id == user_id))
                    )
                    .distinct()
                    .limit(limit)
                    .offset(offset)
                )
            else:
                # Get spaces where user is owner or member (across all orgs)
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
    async def documents(  # noqa: PLR0911, PLR0915
        self,
        info: strawberry.types.Info,
        space_id: strawberry.ID | None = None,
        organization_id: strawberry.ID | None = None,
        limit: int = 100,
        offset: int = 0,
        sort: DocumentSortInput | None = None,
        filters: DocumentFilterInput | None = None,
    ) -> list[Document]:
        """
        Get a list of documents the authenticated user has access to.

        Args:
            space_id: Optional space ID to filter documents by specific space.
            organization_id: Optional organization ID to filter documents by organization (returns docs from all accessible spaces in org).
            limit: Maximum number of documents to return (default: 100)
            offset: Number of documents to skip for pagination
            sort: Optional sorting configuration
            filters: Optional filters (search, status, file type, date range)

        Returns:
            List of documents

        Note:
            If both space_id and organization_id are provided, space_id takes precedence.
            If organization_id is provided, it must match the user's current organization.
        """
        async for session in get_session():
            # Get the authenticated user from the request context
            request = info.context["request"]
            user = getattr(request.state, "user", None)

            if not user:
                return []

            user_id = user.id

            # Build query based on filters (space_id takes precedence)
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
                    msg = f"You do not have access to space {space_id}"
                    raise PermissionError(msg)

                stmt = select(DocumentModel).where(DocumentModel.space_id == space_uuid)
            elif organization_id:
                # Filter by organization - get documents from all accessible spaces in this org
                org_uuid = UUID(str(organization_id))

                # Verify organization_id matches user's current organization
                current_org_id = await OrganizationService.get_current_organization_id(
                    user_id=user_id, db=session
                )

                if not current_org_id or current_org_id != org_uuid:
                    # Organization doesn't match current org
                    logger.warning(
                        f"User {user_id} queried documents for org {org_uuid} "
                        f"but current org is {current_org_id}. Returning empty list."
                    )
                    return []

                # Verify user is a member of this organization
                org_access_stmt = select(OrganizationMemberModel.id).where(
                    (OrganizationMemberModel.organization_id == org_uuid)
                    & (OrganizationMemberModel.user_id == user_id)
                )
                org_result = await session.execute(org_access_stmt)
                if not org_result.scalar_one_or_none():
                    # User is not a member of this organization
                    return []

                # Get all spaces in this org that user has access to
                accessible_spaces_stmt = (
                    select(SpaceModel.id)
                    .outerjoin(SpaceMemberModel, SpaceMemberModel.space_id == SpaceModel.id)
                    .where(
                        (SpaceModel.organization_id == org_uuid)
                        & ((SpaceModel.owner_id == user_id) | (SpaceMemberModel.user_id == user_id))
                    )
                    .distinct()
                )
                space_result = await session.execute(accessible_spaces_stmt)
                space_ids = [row[0] for row in space_result.all()]

                if not space_ids:
                    return []

                stmt = select(DocumentModel).where(DocumentModel.space_id.in_(space_ids))
            else:
                # Get documents from all spaces user has access to (across all orgs)
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

                stmt = select(DocumentModel).where(DocumentModel.space_id.in_(space_ids))

            # Apply filters if provided
            if filters:
                if filters.search:
                    escaped_search = escape_like_pattern(filters.search)
                    stmt = stmt.where(DocumentModel.name.ilike(f"%{escaped_search}%"))

                if filters.statuses:
                    stmt = stmt.where(DocumentModel.status.in_(filters.statuses))

                if filters.file_types:
                    stmt = stmt.where(DocumentModel.file_type.in_(filters.file_types))

                if filters.uploaded_after:
                    stmt = stmt.where(DocumentModel.created_at >= filters.uploaded_after)

                if filters.uploaded_before:
                    stmt = stmt.where(DocumentModel.created_at <= filters.uploaded_before)

            # Apply sorting
            if sort:
                sort_column = getattr(DocumentModel, sort.field.value)
                if sort.order == SortOrder.ASC:
                    stmt = stmt.order_by(sort_column.asc())
                else:
                    stmt = stmt.order_by(sort_column.desc())
            else:
                stmt = stmt.order_by(DocumentModel.created_at.desc())

            # Apply pagination
            stmt = stmt.limit(limit).offset(offset)

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
    async def threads(
        self,
        info: strawberry.types.Info,
        space_id: strawberry.ID | None = None,
        organization_id: strawberry.ID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Thread]:
        """
        Get a list of threads accessible to the authenticated user.

        Thread visibility determines access:
        - SPACE threads: All threads in accessible spaces (all space members can see)
        - ORGANIZATION threads: All org-wide threads in user's organization
        - PERSONAL threads: Only user's own personal threads

        Args:
            space_id: Optional space ID to filter threads by space
            organization_id: Optional organization ID to filter threads
                           (defaults to user's current organization from preferences)
            limit: Maximum number of threads to return (default: 50)
            offset: Number of threads to skip for pagination

        Returns:
            List of accessible threads ordered by creation date (most recent first)

        Authorization:
            - Space threads: User must have space access (checked via SpiceDB)
            - Organization threads: User must be org member
            - Personal threads: User must be the owner

        Example query:
            query {
              threads(spaceId: "space-uuid", limit: 20) {
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

            # Build query based on filters and visibility model
            if space_id:
                # Filter by specific space - return all SPACE threads in this space
                space_uuid = UUID(str(space_id))

                # Verify user has access to this space via SpiceDB
                spicedb = get_spicedb_service()
                has_space_access = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user_id),
                        permission="read",
                        resource_type="space",
                        resource_id=str(space_uuid),
                    )
                )

                if not has_space_access:
                    logger.warning(
                        f"User {user_id} attempted to access threads for unauthorized space {space_uuid}"
                    )
                    return []

                # Get all SPACE threads in this space (not just user's threads)
                # All space members can see all threads in the space
                stmt = (
                    select(ThreadModel)
                    .options(joinedload(ThreadModel.messages))  # Eager load messages
                    .where(ThreadModel.space_id == space_uuid)
                    .order_by(ThreadModel.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
            else:
                # No space_id - filter by organization
                # Use explicit organization_id or fall back to user's current org
                org_uuid: UUID | None
                if organization_id:
                    org_uuid = UUID(str(organization_id))
                else:
                    # Fall back to user's current organization from OrganizationService
                    org_uuid = await OrganizationService.get_current_organization_id(
                        user_id=user_id, db=session
                    )

                if org_uuid:
                    # Verify user is a member of the organization
                    org_member_stmt = select(OrganizationMemberModel.id).where(
                        (OrganizationMemberModel.organization_id == org_uuid)
                        & (OrganizationMemberModel.user_id == user_id)
                    )
                    org_member_result = await session.execute(org_member_stmt)
                    if not org_member_result.scalar_one_or_none():
                        logger.warning(
                            f"User {user_id} attempted to access threads for unauthorized organization {org_uuid}"
                        )
                        return []

                    # Return ORGANIZATION threads (org-wide, no space) + user's PERSONAL threads
                    # Organization threads: All org members can see
                    # Personal threads: Only owner can see
                    stmt = (
                        select(ThreadModel)
                        .options(joinedload(ThreadModel.messages))  # Eager load messages
                        .where(
                            (ThreadModel.organization_id == org_uuid)
                            & (
                                # ORGANIZATION threads (no space_id, visible to all org members)
                                (ThreadModel.space_id.is_(None))
                                # OR user's PERSONAL threads in this org
                                | (ThreadModel.owner_user_id == user_id)
                            )
                        )
                        .order_by(ThreadModel.created_at.desc())
                        .limit(limit)
                        .offset(offset)
                    )
                else:
                    # No organization - return only user's PERSONAL threads
                    # Query filters by NULL org_id AND NULL space_id, which database constraints
                    # guarantee can only occur for visibility=PERSONAL threads:
                    # - PERSONAL: org_id=NULL, space_id=NULL, visibility=PERSONAL
                    # - SPACE: org_id!=NULL, space_id!=NULL, visibility=SPACE
                    # - ORGANIZATION: org_id!=NULL, space_id=NULL, visibility=ORGANIZATION
                    # (Constraints enforced by migration a3c105090510_fix_thread_ownership_enums_and_indexes.py)
                    stmt = (
                        select(ThreadModel)
                        .options(joinedload(ThreadModel.messages))  # Eager load messages
                        .where(
                            (ThreadModel.owner_user_id == user_id)
                            & (ThreadModel.organization_id.is_(None))
                            & (ThreadModel.space_id.is_(None))
                        )
                        .order_by(ThreadModel.created_at.desc())
                        .limit(limit)
                        .offset(offset)
                    )

            result = await session.execute(stmt)
            thread_models = result.unique().scalars().all()

            logger.info(f"Retrieved {len(thread_models)} threads for user {user_id}")
            return [Thread.from_model(thread) for thread in thread_models]

        return []

    @strawberry.field
    async def thread(self, info: strawberry.types.Info, id: strawberry.ID) -> Thread | None:
        """
        Get a single thread by ID.

        Args:
            id: The thread ID

        Returns:
            The thread if found and user has access, None otherwise

        Example query:
            query {
              thread(id: "thread-uuid") {
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
                thread_id = UUID(str(id))

                # Get thread first
                stmt = (
                    select(ThreadModel)
                    .options(joinedload(ThreadModel.messages))  # Eager load messages
                    .where(ThreadModel.id == thread_id)
                )

                result = await session.execute(stmt)
                thread_model = result.unique().scalar_one_or_none()

                if not thread_model:
                    return None

                # Check authorization via SpiceDB using appropriate permission
                # Select permission based on thread visibility:
                # - Space threads (space_id != None) → use 'read' permission (space-scoped)
                # - Organization threads (space_id == None) → use 'read_org' permission (org-wide)
                permission = "read" if thread_model.space_id else "read_org"

                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user_id),
                        permission=permission,
                        resource_type="thread",
                        resource_id=str(thread_id),
                    )
                )

                if not has_permission:
                    logger.warning(
                        f"User {user_id} attempted to access unauthorized thread {thread_id}"
                    )
                    msg = f"You do not have permission to access thread {thread_id}"
                    raise PermissionError(msg)

                if thread_model:
                    return Thread.from_model(thread_model)
                return None

            except ValueError:
                # Invalid UUID format
                return None

        return None

    @strawberry.field
    async def organizations(
        self,
        info: strawberry.types.Info,
        limit: int = 10,
        offset: int = 0,
    ) -> list[Organization]:
        """
        Get a list of organizations the authenticated user is a member of.

        Args:
            limit: Maximum number of organizations to return
            offset: Number of organizations to skip

        Returns:
            List of organizations the user belongs to

        Authorization:
            - Requires authentication
            - Only returns organizations where user is a member

        Example query:
            query {
              organizations(limit: 10, offset: 0) {
                id
                name
                slug
                memberCount
                spaceCount
              }
            }
        """
        async for session in get_session():
            # Get the authenticated user from the request context
            request = info.context["request"]
            user = getattr(request.state, "user", None)

            if not user:
                msg = "Authentication required"
                raise ValueError(msg)

            user_id = user.id

            # Get organizations where user is a member, along with membership data
            # Order by: is_default DESC → last_active_at DESC → created_at ASC
            # This ensures consistent ordering for current org computation
            stmt = (
                select(OrganizationModel, OrganizationMemberModel)
                .join(
                    OrganizationMemberModel,
                    OrganizationMemberModel.organization_id == OrganizationModel.id,
                )
                .where(OrganizationMemberModel.user_id == user_id)
                .order_by(
                    OrganizationMemberModel.is_default.desc().nulls_last(),
                    OrganizationMemberModel.last_active_at.desc().nulls_last(),
                    OrganizationModel.created_at.asc(),
                )
                .limit(limit)
                .offset(offset)
            )

            result = await session.execute(stmt)
            org_membership_pairs = result.all()

            return [
                Organization.from_model(org, membership) for org, membership in org_membership_pairs
            ]

        return []

    @strawberry.field
    async def organization(
        self, info: strawberry.types.Info, id: strawberry.ID
    ) -> Organization | None:
        """
        Get an organization by ID.

        Args:
            id: The organization ID

        Returns:
            The organization if found and user has access, None otherwise

        Authorization:
            - Requires authentication
            - User must be a member of the organization

        Example query:
            query {
              organization(id: "org-uuid") {
                id
                name
                description
                memberCount
                spaceCount
                threadCount
              }
            }
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                user_id = user.id
                organization_id = UUID(str(id))

                # Check if user is a member and get membership data
                member_stmt = select(OrganizationMemberModel).where(
                    (OrganizationMemberModel.organization_id == organization_id)
                    & (OrganizationMemberModel.user_id == user_id)
                )
                member_result = await session.execute(member_stmt)
                membership = member_result.scalar_one_or_none()

                if not membership:
                    msg = "Access denied: not a member of this organization"
                    raise ValueError(msg)

                # Get the organization
                stmt = select(OrganizationModel).where(OrganizationModel.id == organization_id)
                result = await session.execute(stmt)
                organization_model = result.scalar_one_or_none()

                if organization_model:
                    return Organization.from_model(organization_model, membership)
                return None

            except ValueError:
                # Invalid UUID format or access denied
                return None

        return None

    @strawberry.field
    async def organization_members(
        self,
        info: strawberry.types.Info,
        organization_id: strawberry.ID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[OrganizationMember]:
        """
        Get members of an organization.

        Args:
            organization_id: The organization ID
            limit: Maximum number of members to return
            offset: Number of members to skip

        Returns:
            List of organization members

        Authorization:
            - Requires authentication
            - User must be a member of the organization

        Example query:
            query {
              organizationMembers(organizationId: "org-uuid") {
                id
                userId
                role
                createdAt
              }
            }
        """
        async for session in get_session():
            try:
                # Get the authenticated user from the request context
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                user_id = user.id
                org_id = UUID(str(organization_id))

                # Check if user is a member of the organization
                member_stmt = select(OrganizationMemberModel).where(
                    (OrganizationMemberModel.organization_id == org_id)
                    & (OrganizationMemberModel.user_id == user_id)
                )
                member_result = await session.execute(member_stmt)
                is_member = member_result.scalar_one_or_none() is not None

                if not is_member:
                    msg = "Access denied: not a member of this organization"
                    raise ValueError(msg)

                # Get organization members
                stmt = (
                    select(OrganizationMemberModel)
                    .options(joinedload(OrganizationMemberModel.user))
                    .where(OrganizationMemberModel.organization_id == org_id)
                    .limit(limit)
                    .offset(offset)
                )

                result = await session.execute(stmt)
                member_models = result.unique().scalars().all()

                return [OrganizationMember.from_model(member) for member in member_models]

            except ValueError:
                # Invalid UUID format or access denied
                return []

        return []

    @strawberry.field
    async def dashboard_stats(
        self,
        info: strawberry.types.Info,
        organization_id: strawberry.ID | None = None,
    ) -> DashboardStats:
        """
        Get dashboard statistics for the authenticated user.

        Performs efficient COUNT queries instead of loading all data.

        Args:
            organization_id: Optional organization ID to scope stats to a specific org

        Returns:
            Dashboard statistics including document, space, and thread counts

        Authorization:
            - Requires authentication
            - Returns stats for accessible resources only

        Example query:
            query {
              dashboardStats(organizationId: "org-uuid") {
                totalDocuments
                totalSpaces
                totalThreads
                threadsThisMonth
              }
            }
        """
        async for session in get_session():
            # Get the authenticated user from the request context
            request = info.context["request"]
            user = getattr(request.state, "user", None)

            if not user:
                return DashboardStats(
                    total_documents=0,
                    total_spaces=0,
                    total_threads=0,
                    threads_this_month=0,
                )

            user_id = user.id
            # Use organization_id parameter if provided, else fall back to user's current org
            org_id: UUID | None
            if organization_id:
                org_id = UUID(str(organization_id))
            else:
                # Fall back to user's current organization from OrganizationService
                org_id = await OrganizationService.get_current_organization_id(
                    user_id=user_id, db=session
                )

            # Get accessible space IDs (where user is owner or member)
            space_ids_stmt = (
                select(SpaceModel.id)
                .outerjoin(SpaceMemberModel, SpaceMemberModel.space_id == SpaceModel.id)
                .where((SpaceModel.owner_id == user_id) | (SpaceMemberModel.user_id == user_id))
                .distinct()
            )
            if org_id:
                space_ids_stmt = space_ids_stmt.where(SpaceModel.organization_id == org_id)

            space_result = await session.execute(space_ids_stmt)
            space_ids = [row[0] for row in space_result.all()]

            # Count documents in accessible spaces
            if space_ids:
                doc_count_stmt = select(func.count(DocumentModel.id)).where(
                    DocumentModel.space_id.in_(space_ids)
                )
                doc_count = await session.scalar(doc_count_stmt) or 0
            else:
                doc_count = 0

            # Count accessible spaces
            space_count = len(space_ids)

            # Count threads (scoped to org or user)
            thread_count_stmt = select(func.count(ThreadModel.id))
            if org_id:
                thread_count_stmt = thread_count_stmt.where(ThreadModel.organization_id == org_id)
            else:
                thread_count_stmt = thread_count_stmt.where(ThreadModel.created_by == user_id)
            thread_count = await session.scalar(thread_count_stmt) or 0

            # Count threads created this month
            current_year = datetime.now(UTC).year
            current_month = datetime.now(UTC).month

            threads_month_stmt = select(func.count(ThreadModel.id)).where(
                extract("year", ThreadModel.created_at) == current_year,
                extract("month", ThreadModel.created_at) == current_month,
            )
            if org_id:
                threads_month_stmt = threads_month_stmt.where(ThreadModel.organization_id == org_id)
            else:
                threads_month_stmt = threads_month_stmt.where(ThreadModel.created_by == user_id)
            threads_this_month = await session.scalar(threads_month_stmt) or 0

            logger.info(
                f"Dashboard stats for user {user_id}: "
                f"docs={doc_count}, spaces={space_count}, "
                f"threads={thread_count}, threads_this_month={threads_this_month}"
            )

            return DashboardStats(
                total_documents=doc_count,
                total_spaces=space_count,
                total_threads=thread_count,
                threads_this_month=threads_this_month,
            )

        return DashboardStats(
            total_documents=0,
            total_spaces=0,
            total_threads=0,
            threads_this_month=0,
        )

    @strawberry.field
    async def user_preferences(self, info: strawberry.types.Info) -> UserPreferences | None:
        """Get preferences for the authenticated user."""
        request = info.context["request"]
        user = request.state.user

        if not user:
            logger.warning("Unauthenticated request to userPreferences query")
            return None

        async for session in get_session():
            user_id = UUID(str(user.id))
            stmt = select(UserPreferencesModel).where(UserPreferencesModel.user_id == user_id)
            result = await session.execute(stmt)
            preferences_model = result.scalar_one_or_none()

            if preferences_model:
                return UserPreferences.from_model(preferences_model)

            logger.info(f"No preferences found for user {user_id}")
            return None
        return None

    # Organization Invitations

    @strawberry.field
    async def organization_invitations(
        self,
        info: strawberry.types.Info,
        organization_id: strawberry.ID,
        status: InvitationStatusEnum | None = None,
    ) -> list[OrganizationInvitation]:
        """
        List invitations for an organization.

        Args:
            organization_id: Organization to list invitations for
            status: Optional status filter (pending, accepted, expired, revoked)

        Returns:
            List of invitations for the organization

        Authorization:
            - Only organization admins/owners can list invitations
        """
        async for session in get_session():
            try:
                # Get authenticated user
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                org_id = UUID(str(organization_id))

                # Check permission to view invitations
                spicedb = get_spicedb_service()
                has_permission = await spicedb.check_permission(
                    CheckPermissionInput(
                        user_id=str(user.id),
                        permission="invite_member",
                        resource_type="organization",
                        resource_id=str(org_id),
                    )
                )

                if not has_permission:
                    msg = "You don't have permission to view invitations for this organization"
                    raise PermissionError(msg)

                # Convert status enum to model enum if provided
                status_filter = None
                if status:
                    status_filter = InvitationStatus(status.value)

                # List invitations
                invitations = await InvitationService.list_organization_invitations(
                    db=session,
                    organization_id=org_id,
                    status=status_filter,
                )

                return [OrganizationInvitation.from_model(inv) for inv in invitations]

            except (ValueError, PermissionError):
                await session.rollback()
                raise

        # Fallback if session doesn't yield for MyPy
        msg = "Database session unavailable"
        raise RuntimeError(msg)

    @strawberry.field
    async def my_pending_invitations(
        self, info: strawberry.types.Info
    ) -> list[OrganizationInvitation]:
        """
        Get pending invitations for the authenticated user.

        Returns:
            List of pending invitations for the current user's email

        Authorization:
            - User must be authenticated
        """
        async for session in get_session():
            try:
                # Get authenticated user
                request = info.context["request"]
                user = getattr(request.state, "user", None)

                if not user:
                    msg = "Authentication required"
                    raise ValueError(msg)

                # Get pending invitations for user's email
                invitations = await InvitationService.get_user_pending_invitations(
                    db=session,
                    email=user.email,
                )

                return [OrganizationInvitation.from_model(inv) for inv in invitations]

            except ValueError:
                await session.rollback()
                raise

        # Fallback if session doesn't yield for MyPy
        msg = "Database session unavailable"
        raise RuntimeError(msg)
