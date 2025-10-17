"""Document upload and management API endpoints."""

from typing import Annotated
from uuid import UUID, uuid4

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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models import Document, DocumentStatus, Space, User
from app.services.document_processor import process_document_background
from app.services.storage_service import get_storage_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


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
        space_uuid = UUID(space_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid space_id format")

    # Verify space exists and user has access
    result = await db.execute(select(Space).where(Space.id == space_uuid))
    space = result.scalar_one_or_none()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    # TODO: Check if user has permission to upload to this space
    # For now, we'll allow any authenticated user

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
        doc_uuid = UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    # Get document
    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # TODO: Verify user has access to document's space

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
        doc_uuid = UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    # Get document
    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # TODO: Verify user has permission to delete

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
            space_uuid = UUID(space_id)
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
