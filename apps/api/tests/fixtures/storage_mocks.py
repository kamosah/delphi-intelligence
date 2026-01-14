"""Mock storage service for testing.

This module provides MockStorageService that implements the same interface
as StorageService but uses local filesystem instead of Supabase Storage.
Files are stored in a temporary directory that is cleaned up after tests.
"""

import contextlib
import shutil
import tempfile
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile

from app.services.storage_service import StorageService
from app.utils.filename import normalize_filename


class MockStorageService(StorageService):
    """Mock storage service that uses local filesystem for testing.

    Implements the same interface as StorageService but stores files
    in a temporary directory instead of Supabase Storage.

    Usage:
        mock_storage = MockStorageService(temp_dir="/tmp/test-storage")
        file_path = await mock_storage.upload_file(file, space_id, doc_id)
    """

    def __init__(self, temp_dir: str | None = None) -> None:
        """Initialize mock storage service.

        Args:
            temp_dir: Optional temporary directory path. If None, creates a new temp directory.
        """
        # Don't call super().__init__() to avoid Supabase client initialization
        self._temp_dir = temp_dir or tempfile.mkdtemp(prefix="olympus-test-storage-")
        self._storage_root = Path(self._temp_dir)
        self._storage_root.mkdir(parents=True, exist_ok=True)

        # Track uploaded files for cleanup
        self._uploaded_files: set[str] = set()

    @property
    def temp_dir(self) -> str:
        """Get temporary directory path."""
        return self._temp_dir

    async def upload_file(self, file: UploadFile, space_id: UUID, document_id: UUID) -> str:
        """Upload a file to mock storage.

        Args:
            file: The uploaded file
            space_id: UUID of the space
            document_id: UUID of the document

        Returns:
            The file path in mock storage (same format as real storage)

        Raises:
            HTTPException: If upload fails or file is invalid
        """
        # Validate file (inherited from StorageService)
        self._validate_file(file)

        # Normalize filename to snake_case for consistency
        safe_filename = normalize_filename(file.filename or "untitled")

        # Generate file path: {space_id}/{document_id}/{safe_filename}
        file_path = f"{space_id}/{document_id}/{safe_filename}"

        try:
            # Read file content
            content = await file.read()

            # Create directory structure
            full_path = self._storage_root / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)

            # Write file to disk
            full_path.write_bytes(content)

            # Track uploaded file
            self._uploaded_files.add(file_path)

            # Reset file pointer for potential reuse
            await file.seek(0)

            return file_path

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    async def delete_file(self, file_path: str) -> None:
        """Delete a file from mock storage.

        Args:
            file_path: Path to the file in storage

        Raises:
            HTTPException: If deletion fails
        """
        try:
            full_path = self._storage_root / file_path
            if full_path.exists():
                full_path.unlink()
                # Remove empty parent directories
                with contextlib.suppress(OSError):
                    full_path.parent.rmdir()  # Directory not empty or doesn't exist

            # Remove from tracked files
            self._uploaded_files.discard(file_path)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

    def get_file_url(self, file_path: str) -> str:
        """Get a mock URL for a file.

        Args:
            file_path: Path to the file in storage

        Returns:
            Mock URL pointing to local file path
        """
        # Return a mock URL (in real implementation, this would be a signed Supabase URL)
        full_path = self._storage_root / file_path
        return f"file://{full_path}"

    async def download_file(self, file_path: str) -> bytes:
        """Download a file from mock storage.

        Args:
            file_path: Path to the file in storage

        Returns:
            File content as bytes

        Raises:
            HTTPException: If download fails
        """
        try:
            full_path = self._storage_root / file_path
            if not full_path.exists():
                raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

            content: bytes = full_path.read_bytes()
            return content

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")

    def cleanup(self) -> None:
        """Clean up temporary storage directory.

        Removes all uploaded files and the temporary directory.
        """
        # Delete all uploaded files
        for file_path in list(self._uploaded_files):
            try:
                full_path = self._storage_root / file_path
                if full_path.exists():
                    full_path.unlink()
            except Exception:
                pass  # Ignore errors during cleanup

        # Remove temporary directory if it was created by us
        if self._temp_dir and Path(self._temp_dir).exists():
            with contextlib.suppress(Exception):
                shutil.rmtree(self._temp_dir)  # Ignore errors during cleanup

        self._uploaded_files.clear()
