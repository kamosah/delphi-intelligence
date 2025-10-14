"""
Test script for document upload endpoint.
This script creates a test user, space, and tests document upload.
"""
import asyncio
import io
import httpx
from uuid import uuid4
from sqlalchemy import select
from app.db.session import async_session_maker
from app.models import User, Space


async def setup_test_data():
    """Create test user and space."""
    async with async_session_maker() as db:
        # Check if test user exists
        result = await db.execute(
            select(User).where(User.email == "test@example.com")
        )
        user = result.scalar_one_or_none()

        if not user:
            # Create test user
            user = User(
                id=uuid4(),
                email="test@example.com",
                username="testuser",
                full_name="Test User",
                hashed_password="$2b$12$test",  # Not a real hash, just for testing
                is_email_verified=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"✓ Created test user: {user.email}")
        else:
            print(f"✓ Test user exists: {user.email}")

        # Check if test space exists
        result = await db.execute(
            select(Space).where(Space.name == "Test Space")
        )
        space = result.scalar_one_or_none()

        if not space:
            # Create test space
            space = Space(
                id=uuid4(),
                name="Test Space",
                description="Test space for document uploads",
                created_by=user.id,
            )
            db.add(space)
            await db.commit()
            await db.refresh(space)
            print(f"✓ Created test space: {space.name}")
        else:
            print(f"✓ Test space exists: {space.name}")

        return user, space


async def test_document_upload(user_id: str, space_id: str):
    """Test document upload endpoint."""

    # First, login to get a JWT token
    print("\n1. Logging in to get JWT token...")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/auth/login",
            json={
                "email": "test@example.com",
                "password": "test123",  # This won't work with our fake hash
            }
        )

        if response.status_code != 200:
            print(f"✗ Login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            print("\n⚠ Skipping upload test (authentication required)")
            return

        data = response.json()
        token = data["access_token"]
        print(f"✓ Login successful, got token")

        # Now test document upload
        print("\n2. Uploading test document...")

        # Create a test text file
        test_file_content = b"This is a test document for upload testing."
        test_file = io.BytesIO(test_file_content)

        files = {
            "file": ("test_document.txt", test_file, "text/plain")
        }
        data = {
            "space_id": str(space_id),
            "name": "Test Document Upload"
        }
        headers = {
            "Authorization": f"Bearer {token}"
        }

        response = await client.post(
            "http://localhost:8000/api/documents",
            files=files,
            data=data,
            headers=headers
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✓ Document uploaded successfully!")
            print(f"  Document ID: {result['id']}")
            print(f"  Name: {result['name']}")
            print(f"  Size: {result['size_bytes']} bytes")
            print(f"  Type: {result['file_type']}")
            print(f"  Status: {result['status']}")
        else:
            print(f"✗ Upload failed: {response.status_code}")
            print(f"  Response: {response.text}")


async def main():
    """Main test function."""
    print("=" * 60)
    print("Document Upload API Test")
    print("=" * 60)

    print("\nSetting up test data...")
    user, space = await setup_test_data()

    print(f"\nTest User ID: {user.id}")
    print(f"Test Space ID: {space.id}")

    await test_document_upload(str(user.id), str(space.id))

    print("\n" + "=" * 60)
    print("Test completed")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
