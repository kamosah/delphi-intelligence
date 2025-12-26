"""Pydantic schemas for SpiceDB service inputs.

These models provide runtime validation for SpiceDB authorization operations,
ensuring that all relationship and permission check parameters are valid before
making gRPC calls to SpiceDB.
"""

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ValidationInfo, field_validator


class CheckPermissionInput(BaseModel):
    """Input for checking permissions in SpiceDB."""

    user_id: str | UUID
    permission: str
    resource_type: str
    resource_id: str | UUID
    context: dict[str, Any] | None = None

    @field_validator("permission", "resource_type")
    @classmethod
    def validate_not_empty(cls, v: str, info: ValidationInfo) -> str:
        """Validate that string fields are not empty."""
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} cannot be empty")
        return v.strip()


class WriteRelationshipInput(BaseModel):
    """Input for writing relationships to SpiceDB."""

    resource_type: str
    resource_id: str | UUID
    relation: str
    subject_type: str
    subject_id: str | UUID
    expiration: int | None = None

    @field_validator("resource_type", "relation", "subject_type")
    @classmethod
    def validate_not_empty(cls, v: str, info: ValidationInfo) -> str:
        """Validate that string fields are not empty."""
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} cannot be empty")
        return v.strip()


class DeleteRelationshipInput(BaseModel):
    """Input for deleting relationships from SpiceDB."""

    resource_type: str
    resource_id: str | UUID
    relation: str
    subject_type: str
    subject_id: str | UUID

    @field_validator("resource_type", "relation", "subject_type")
    @classmethod
    def validate_not_empty(cls, v: str, info: ValidationInfo) -> str:
        """Validate that string fields are not empty."""
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} cannot be empty")
        return v.strip()
