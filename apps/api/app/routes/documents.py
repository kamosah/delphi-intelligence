"""Document upload and management API endpoints."""

import asyncio
import io
import json
from datetime import UTC, datetime
from typing import Annotated, Any
from collections.abc import AsyncGenerator
from uuid import UUID as PyUUID  # noqa: N811
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.auth.jwt_handler import jwt_manager
from app.db.session import get_session
from app.models import Document, DocumentStatus, Space, User
from app.services.document_processor import process_document_background
from app.services.permissions import permission_service
from app.services.sse_manager import sse_manager
from app.services.storage_service import get_storage_service

router = APIRouter(prefix="/api/documents", tags=["documents"])

# SSE configuration constants
SSE_HEARTBEAT_INTERVAL = 30.0  # seconds - how often to send heartbeat when no events


@router.post("")
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File(description="Document file to upload")],
    space_id: Annotated[str, Form(description="UUID of the space")],
    name: Annotated[str | None, Form(description="Optional custom name")] = None,
    db: AsyncSession = Depends(get_session),
) -> dict[str, str | int]:
    """
    Upload a document to a space.

    Accepts multipart/form-data with:
    - file: The document file (PDF, DOCX, TXT, CSV, or XLSX)
    - space_id: UUID of the space to upload to
    - name: Optional custom name (defaults to filename)

    Returns:
        Document metadata including ID, name, size, and upload status
    """
    # Get authenticated user from middleware
    user: User | None = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Validate space_id format
    try:
        space_uuid = PyUUID(space_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid space_id format")

    # Verify space exists and user has access
    result = await db.execute(select(Space).where(Space.id == space_uuid))
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    # Check if user has permission to upload to this space
    if not await permission_service.can_upload_to_space(user, space_uuid, db):
        raise HTTPException(
            status_code=403, detail="You do not have permission to upload to this space"
        )

    # Generate document ID
    document_id = uuid4()

    # Upload file to Supabase Storage
    try:
        file_path = await get_storage_service().upload_file(file, space_uuid, document_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    # Get file size
    file_size = 0
    if hasattr(file, "size") and file.size:
        file_size = file.size
    else:
        # If size not in headers, read file to get size
        content = await file.read()
        file_size = len(content)
        await file.seek(0)

    # Create document record
    document = Document(
        id=document_id,
        space_id=space_uuid,
        name=name or file.filename or "Untitled",
        file_type=file.content_type or "application/octet-stream",
        file_path=file_path,
        size_bytes=file_size,
        status=DocumentStatus.UPLOADED,
        uploaded_by=user.id,
    )

    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Trigger background processing
    background_tasks.add_task(process_document_background, str(document.id))

    # Return document metadata
    return {
        "id": str(document.id),
        "name": document.name,
        "file_type": document.file_type,
        "size_bytes": document.size_bytes,
        "space_id": str(document.space_id),
        "uploaded_by": str(document.uploaded_by),
        "status": document.status,
        "created_at": document.created_at.isoformat(),
        "updated_at": document.updated_at.isoformat(),
    }


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> dict[str, str | int | dict | None]:
    """
    Get document metadata by ID.

    Args:
        document_id: UUID of the document

    Returns:
        Document metadata
    """
    # Get authenticated user
    user: User | None = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Parse document_id
    try:
        doc_uuid = PyUUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    # Get document
    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verify user has access to document's space
    if not await permission_service.can_access_space(user, document.space_id, db):
        raise HTTPException(
            status_code=403, detail="You do not have access to this document's space"
        )

    return {
        "id": str(document.id),
        "name": document.name,
        "file_type": document.file_type,
        "file_path": document.file_path,
        "size_bytes": document.size_bytes,
        "space_id": str(document.space_id),
        "uploaded_by": str(document.uploaded_by),
        "status": document.status,
        "extracted_text": document.extracted_text,
        "metadata": document.doc_metadata,
        "processed_at": document.processed_at.isoformat() if document.processed_at else None,
        "processing_error": document.processing_error,
        "created_at": document.created_at.isoformat(),
        "updated_at": document.updated_at.isoformat(),
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """
    Delete a document.

    Args:
        document_id: UUID of the document

    Returns:
        Success message
    """
    # Get authenticated user
    user: User | None = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Parse document_id
    try:
        doc_uuid = PyUUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    # Get document
    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verify user has permission to delete
    if not await permission_service.can_delete_from_space(user, document.space_id, db):
        raise HTTPException(
            status_code=403, detail="You do not have permission to delete this document"
        )

    # Delete file from storage
    try:
        await get_storage_service().delete_file(document.file_path)
    except Exception as e:
        # Log error but continue with database deletion
        print(f"Failed to delete file from storage: {e}")

    # Delete document record
    await db.delete(document)
    await db.commit()

    return {"message": "Document deleted successfully", "id": document_id}


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """
    Download a document file.

    Args:
        document_id: UUID of the document

    Returns:
        File content as streaming response
    """
    # Get authenticated user
    user: User | None = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Parse document_id
    try:
        doc_uuid = PyUUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    # Get document
    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verify user has access to document's space
    if not await permission_service.can_access_space(user, document.space_id, db):
        raise HTTPException(
            status_code=403, detail="You do not have access to this document's space"
        )

    # Download file from storage
    try:
        file_content = await get_storage_service().download_file(document.file_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")

    # Return as streaming response
    return StreamingResponse(
        io.BytesIO(file_content),
        media_type=document.file_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{document.name}"'},
    )


@router.get("")
async def list_documents(
    request: Request,
    space_id: str | None = None,
    db: AsyncSession = Depends(get_session),
) -> dict[str, list[dict] | int]:
    """
    List documents, optionally filtered by space.

    Args:
        space_id: Optional UUID of the space to filter by

    Returns:
        List of documents
    """
    # Get authenticated user
    user: User | None = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Build query
    query = select(Document).order_by(Document.created_at.desc())

    # Filter by space if provided
    if space_id:
        try:
            space_uuid = PyUUID(space_id)
            query = query.where(Document.space_id == space_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid space_id format")

    # Execute query
    result = await db.execute(query)
    documents = result.scalars().all()

    return {
        "documents": [
            {
                "id": str(doc.id),
                "name": doc.name,
                "file_type": doc.file_type,
                "size_bytes": doc.size_bytes,
                "space_id": str(doc.space_id),
                "uploaded_by": str(doc.uploaded_by),
                "status": doc.status,
                "created_at": doc.created_at.isoformat(),
                "updated_at": doc.updated_at.isoformat(),
            }
            for doc in documents
        ],
        "total": len(documents),
    }


@router.get("/stream/{space_id}")
async def stream_document_updates(
    space_id: str,
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    """
    Server-Sent Events (SSE) endpoint for real-time document status updates.

    Streams document processing status changes for all documents in a space.
    Clients can listen to this endpoint to receive real-time updates without polling.

    Args:
        space_id: UUID of the space to watch
        token: Short-lived SSE token (from /auth/sse-token endpoint)
        request: FastAPI request object

    Returns:
        EventSourceResponse streaming document updates

    Event format:
        {
            "event": "status_update",
            "document_id": "uuid",
            "data": {
                "status": "processing|processed|failed",
                "updated_at": "ISO timestamp",
                "processing_error": "error message if failed"
            }
        }

    Security:
        Requires a short-lived token (5-minute TTL) obtained from /auth/sse-token
        This prevents token leakage in URLs while maintaining EventSource compatibility.
    """
    # Validate short-lived SSE token
    payload = jwt_manager.verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired SSE token")

    # Get user from token payload
    user_id = PyUUID(payload.get("sub"))
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Validate space_id format
    try:
        space_uuid = PyUUID(space_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid space_id format")

    # Verify space exists and user has access
    result = await db.execute(select(Space).where(Space.id == space_uuid))
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    # Check if user has permission to access this space
    if not await permission_service.can_access_space(user, space_uuid, db):
        raise HTTPException(status_code=403, detail="You do not have access to this space")

    # Subscribe to space updates
    queue = sse_manager.subscribe_to_space(space_uuid)

    async def event_generator() -> AsyncGenerator[dict[str, Any], None]:
        """Generate SSE events from the queue."""
        try:
            # Send initial connection event
            yield {
                "event": "connected",
                "data": json.dumps({"space_id": str(space_uuid)}),
            }

            # Stream events from queue
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break

                try:
                    # Wait for next event with timeout
                    message = await asyncio.wait_for(queue.get(), timeout=SSE_HEARTBEAT_INTERVAL)

                    # Send event to client
                    yield {
                        "event": message["event"],
                        "data": json.dumps(message),
                    }
                except TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield {
                        "event": "heartbeat",
                        "data": json.dumps({"timestamp": datetime.now(UTC).isoformat()}),
                    }

        finally:
            # Clean up subscription when client disconnects
            sse_manager.unsubscribe_from_space(space_uuid, queue)

    return EventSourceResponse(event_generator())
