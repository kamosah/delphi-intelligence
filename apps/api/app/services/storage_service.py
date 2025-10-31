"""Storage service for managing file uploads to Supabase Storage."""

import mimetypes
import re
import unicodedata
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile
from supabase import Client, create_client

from app.config import settings


class StorageService:
    """Service for handling file uploads to Supabase Storage."""

    BUCKET_NAME = "documents"
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
        "text/plain",
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # XLSX
    }

    def __init__(self) -> None:
        """Initialize Supabase Storage service."""
        self._client: Client | None = None

    @property
    def client(self) -> Client:
        """Get Supabase client (lazy initialization)."""
        if self._client is None:
            self._client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        return self._client

    async def upload_file(self, file: UploadFile, space_id: UUID, document_id: UUID) -> str:
        """
        Upload a file to Supabase Storage.

        Args:
            file: The uploaded file
            space_id: UUID of the space
            document_id: UUID of the document

        Returns:
            The file path in Supabase Storage

        Raises:
            HTTPException: If upload fails or file is invalid
        """
        # Validate file
        self._validate_file(file)

        # Sanitize filename for storage compatibility
        safe_filename = self._sanitize_filename(file.filename or "untitled")

        # Generate file path: {space_id}/{document_id}/{safe_filename}
        file_path = f"{space_id}/{document_id}/{safe_filename}"

        try:
            # Read file content
            content = await file.read()

            # Upload to Supabase Storage
            self.client.storage.from_(self.BUCKET_NAME).upload(
                path=file_path,
                file=content,
                file_options={
                    "content-type": file.content_type or "application/octet-stream",
                    "cache-control": "3600",
                    "upsert": "false",  # Don't overwrite existing files
                },
            )

            # Reset file pointer for potential reuse
            await file.seek(0)

            return file_path

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    async def delete_file(self, file_path: str) -> None:
        """
        Delete a file from Supabase Storage.

        Args:
            file_path: Path to the file in storage

        Raises:
            HTTPException: If deletion fails
        """
        try:
            self.client.storage.from_(self.BUCKET_NAME).remove([file_path])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

    def get_file_url(self, file_path: str) -> str:
        """
        Get a public URL for a file.

        Args:
            file_path: Path to the file in storage

        Returns:
            Public URL for the file
        """
        # Generate signed URL valid for 1 hour
        response = self.client.storage.from_(self.BUCKET_NAME).create_signed_url(
            file_path, expires_in=3600
        )
        url: str = response.get("signedURL", "")
        return url

    async def download_file(self, file_path: str) -> bytes:
        """
        Download a file from Supabase Storage.

        Args:
            file_path: Path to the file in storage

        Returns:
            File content as bytes

        Raises:
            HTTPException: If download fails
        """
        try:
            content: bytes = self.client.storage.from_(self.BUCKET_NAME).download(file_path)
            return content
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")

    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename for storage compatibility.

        Removes emojis, special characters, and normalizes to ASCII-safe format.
        Preserves file extension.

        Args:
            filename: Original filename

        Returns:
            Sanitized filename safe for storage keys

        Examples:
            "⚖️ Document.pdf" -> "Document.pdf"
            "File (1).docx" -> "File_1.docx"
            "My Document 😊.txt" -> "My_Document.txt"
        """
        if not filename or not filename.strip():
            return "untitled"

        # Separate extension
        path = Path(filename)
        name = path.stem
        ext = path.suffix

        # Remove emojis and non-ASCII characters
        # Normalize to NFD (decompose) then remove combining marks and accents
        name = unicodedata.normalize("NFD", name)
        # Keep only ASCII characters (removes accents and combining marks)
        name = "".join(char for char in name if ord(char) < 128)

        # Replace spaces and special chars with underscores
        name = re.sub(r"[^\w\-.]", "_", name)

        # Remove multiple consecutive underscores
        name = re.sub(r"_+", "_", name)

        # Remove leading/trailing underscores and periods
        name = name.strip("_.")

        # Ensure name is not empty
        if not name:
            return "untitled" if not ext else f"document{ext}"

        # Reconstruct filename with extension
        return f"{name}{ext}"

    def _validate_file(self, file: UploadFile) -> None:
        """
        Validate uploaded file.

        Args:
            file: The uploaded file

        Raises:
            HTTPException: If file is invalid
        """
        # Check file size (if available in headers)
        if hasattr(file, "size") and file.size and file.size > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {self.MAX_FILE_SIZE / (1024*1024):.0f}MB",
            )

        # Validate MIME type
        content_type = file.content_type or self._guess_mime_type(file.filename or "")
        if content_type not in self.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: {content_type}. Allowed types: PDF, DOCX, TXT, CSV, XLSX",
            )

        # Validate filename
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

    def _guess_mime_type(self, filename: str) -> str:
        """
        Guess MIME type from filename.

        Args:
            filename: Name of the file

        Returns:
            Guessed MIME type or 'application/octet-stream'
        """
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or "application/octet-stream"


# Module-level variable for lazy initialization
_storage_service: StorageService | None = None


def get_storage_service() -> StorageService:
    """Get or create the storage service (lazy initialization)."""
    global _storage_service  # noqa: PLW0603
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
