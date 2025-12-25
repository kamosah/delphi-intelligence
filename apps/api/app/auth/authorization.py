"""Authorization service using Oso policy engine for centralized access control.

This module provides the core authorization infrastructure for Olympus using the Oso
policy engine. All access control logic is defined in Polar policy files (.polar)
in the app/policies/ directory.

Key components:
- AuthorizationService: Singleton service that loads policies and checks permissions
- PermissionDenied: Exception raised when authorization fails
- authorize(): Helper function for quick authorization checks
- @require_permission(): Decorator for service methods requiring authorization

Example usage:
    # Basic authorization check
    if not await authorize(user, "update", organization):
        raise PermissionDenied("Cannot update this organization")

    # Using decorator
    @require_permission("update")
    async def update_organization(self, user: User, org: Organization, data: dict):
        # Authorization check happens automatically before method execution
        ...
"""

import logging
from functools import wraps
from pathlib import Path
from typing import Any, Callable, Type, TypeVar

from fastapi import HTTPException, status
from oso import Oso
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.models.space import Space, SpaceMember
from app.models.user import User

logger = logging.getLogger(__name__)

# Type variable for generic typing
T = TypeVar("T")


class PermissionDenied(HTTPException):
    """Exception raised when a user lacks permission to perform an action.

    This exception is raised by the authorization service when a user attempts
    to perform an action they don't have permission for. It returns a 403 Forbidden
    HTTP status code.

    Args:
        detail: Human-readable error message explaining why permission was denied

    Example:
        raise PermissionDenied("You must be an organization admin to invite members")
    """

    def __init__(self, detail: str = "You do not have permission to perform this action"):
        """Initialize PermissionDenied exception with 403 status code.

        Args:
            detail: Error message to return to the client
        """
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class AuthorizationService:
    """Centralized authorization service using Oso policy engine.

    This service provides a singleton instance that:
    1. Loads all Polar policy files from app/policies/ directory
    2. Registers SQLAlchemy models with Oso
    3. Provides methods to check user permissions on resources
    4. Supports filtering resources by user permissions

    The service is initialized once on application startup and reused throughout
    the application lifecycle. All authorization logic is defined in .polar files,
    making it easy to audit, test, and modify access control rules.

    Attributes:
        oso: The Oso policy engine instance

    Example:
        auth_service = get_auth_service()
        if await auth_service.is_allowed(user, "read", space):
            # User can read the space
            ...
    """

    _instance: "AuthorizationService | None" = None

    def __new__(cls) -> "AuthorizationService":
        """Ensure only one instance of AuthorizationService exists (singleton pattern)."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize the authorization service by loading policies and registering models."""
        # Only initialize once (singleton)
        if hasattr(self, "_initialized"):
            return

        self.oso = Oso()
        self._register_classes()
        self._load_policies()
        self._initialized = True
        logger.info("Authorization service initialized successfully")

    def _register_classes(self):
        """Register SQLAlchemy models with Oso for use in policy files.

        This method registers all models that are referenced in Polar policies,
        allowing Oso to inspect their attributes and relationships when evaluating rules.

        Registered models:
        - User: Application users
        - Organization: Top-level tenant containers
        - OrganizationMember: Organization membership with roles
        - Space: Document workspaces
        - SpaceMember: Space membership with roles
        - Document: Uploaded files
        """
        logger.debug("Registering SQLAlchemy models with Oso")

        # Register core models
        self.oso.register_class(User)
        self.oso.register_class(Organization)
        self.oso.register_class(OrganizationMember)
        self.oso.register_class(Space)
        self.oso.register_class(SpaceMember)
        self.oso.register_class(Document)

        logger.debug("Successfully registered 6 SQLAlchemy models")

    def _load_policies(self):
        """Load all Polar policy files from the app/policies/ directory.

        This method discovers and loads all .polar files in the policies directory,
        making their rules available to the Oso engine. All files are loaded together
        in a single call to ensure Oso can resolve cross-file references.

        Raises:
            Exception: If policy files cannot be loaded or contain syntax errors
        """
        policies_dir = Path(__file__).parent.parent / "policies"

        if not policies_dir.exists():
            logger.warning(f"Policies directory not found: {policies_dir}")
            return

        # Find all .polar files
        policy_files = sorted(policies_dir.glob("*.polar"))

        if not policy_files:
            logger.warning(f"No .polar files found in {policies_dir}")
            return

        # Load ALL policy files at once (Oso requirement)
        try:
            logger.debug(f"Loading {len(policy_files)} policy files")
            # Convert Path objects to strings for Oso
            policy_paths = [str(f) for f in policy_files]
            self.oso.load_files(policy_paths)
            logger.info(f"Successfully loaded {len(policy_files)} policy files from {policies_dir}")
        except Exception as e:
            logger.error(f"Failed to load policy files: {e}")
            raise

    async def is_allowed(
        self, user: User, action: str, resource: Any
    ) -> bool:
        """Check if a user is allowed to perform an action on a resource.

        This is the primary authorization method. It queries the Oso engine with
        the user, action, and resource to determine if the action is permitted
        based on the loaded Polar policies.

        Args:
            user: The user attempting the action
            action: The action being attempted (e.g., "read", "update", "delete")
            resource: The resource being acted upon (e.g., Organization, Space, Document)

        Returns:
            True if the user has permission, False otherwise

        Example:
            # Check if user can update an organization
            if await auth_service.is_allowed(user, "update", organization):
                # Proceed with update
                ...
        """
        try:
            # Oso.is_allowed is synchronous, but we make this async for consistency
            # with the rest of the FastAPI codebase
            result = self.oso.is_allowed(user, action, resource)

            logger.debug(
                f"Authorization check: user={user.id}, action={action}, "
                f"resource={type(resource).__name__}({getattr(resource, 'id', None)}), "
                f"allowed={result}"
            )

            return result
        except Exception as e:
            logger.error(
                f"Authorization check failed: user={user.id}, action={action}, "
                f"resource={type(resource).__name__}: {e}"
            )
            # Fail closed - deny access on errors
            return False

    def get_allowed_resources(
        self,
        user: User,
        action: str,
        resource_class: Type[T],
    ) -> list[T]:
        """Get all resources of a given type that a user can perform an action on.

        This method is useful for filtering lists of resources based on user permissions.
        It returns only the resources that the user has permission to act upon.

        Args:
            user: The user to check permissions for
            action: The action to check (e.g., "read", "update", "delete")
            resource_class: The SQLAlchemy model class to filter

        Returns:
            List of resources the user has permission to act upon

        Example:
            # Get all spaces the user can read
            readable_spaces = auth_service.get_allowed_resources(
                user, "read", Space
            )
        """
        try:
            # Oso.authorized_resources returns all resources the user can act on
            # Note: This requires the resources to be in memory or fetched from DB
            result = list(self.oso.authorized_resources(user, action, resource_class))

            logger.debug(
                f"Authorized resources: user={user.id}, action={action}, "
                f"resource_class={resource_class.__name__}, count={len(result)}"
            )

            return result
        except Exception as e:
            logger.error(
                f"Failed to get authorized resources: user={user.id}, "
                f"action={action}, resource_class={resource_class.__name__}: {e}"
            )
            # Fail closed - return empty list on errors
            return []


# Global singleton instance
_auth_service: AuthorizationService | None = None


def get_auth_service() -> AuthorizationService:
    """Get the global authorization service instance.

    Returns the singleton AuthorizationService instance, creating it if it doesn't
    exist. This ensures all parts of the application use the same Oso instance
    with loaded policies.

    Returns:
        The singleton AuthorizationService instance

    Example:
        auth_service = get_auth_service()
        if await auth_service.is_allowed(user, "read", organization):
            ...
    """
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthorizationService()
    return _auth_service


async def authorize(user: User, action: str, resource: Any) -> bool:
    """Convenience function for authorization checks.

    This is a shorthand for `get_auth_service().is_allowed()`. Use this in
    places where you need a quick authorization check without accessing the
    service instance directly.

    Args:
        user: The user attempting the action
        action: The action being attempted
        resource: The resource being acted upon

    Returns:
        True if authorized, False otherwise

    Example:
        if not await authorize(user, "update", space):
            raise PermissionDenied("Cannot update this space")
    """
    auth_service = get_auth_service()
    return await auth_service.is_allowed(user, action, resource)


def require_permission(action: str):
    """Decorator to require a specific permission on a resource.

    This decorator automatically checks if a user has permission to perform
    an action on a resource before executing the decorated method. The decorated
    method must have these parameters:

    - user: User - The user performing the action
    - resource: Any - The resource being acted upon (e.g., Organization, Space)

    The resource can be passed as any parameter name (e.g., org, space, document).

    Args:
        action: The action to require permission for

    Returns:
        Decorator function that wraps the method with authorization check

    Raises:
        PermissionDenied: If the user lacks permission

    Example:
        class OrganizationService:
            @require_permission("update")
            async def update_organization(
                self, user: User, org: Organization, data: dict
            ):
                # This code only runs if user can update the org
                org.name = data["name"]
                await db.commit()
                return org
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user and resource from function arguments
            # Convention: user is always named 'user'
            # Resource can be any of: org, organization, space, document, etc.
            user = kwargs.get("user")

            # Try to find the resource in kwargs
            resource = None
            for key, value in kwargs.items():
                if key != "user" and isinstance(
                    value, (Organization, Space, Document, OrganizationMember, SpaceMember)
                ):
                    resource = value
                    break

            if not user:
                raise ValueError("Function decorated with @require_permission must have a 'user' parameter")

            if not resource:
                raise ValueError(
                    "Function decorated with @require_permission must have a resource parameter "
                    "(e.g., org, space, document)"
                )

            # Check authorization
            if not await authorize(user, action, resource):
                raise PermissionDenied(
                    f"You do not have permission to {action} this {type(resource).__name__.lower()}"
                )

            # Authorization passed - execute the function
            return await func(*args, **kwargs)

        return wrapper

    return decorator
