# Supabase Storage Setup for Document Uploads

Quick reference guide for setting up Supabase Storage bucket for the Olympus MVP document upload feature.

## Quick Setup Checklist

- [ ] Create `documents` bucket in Supabase Storage
- [ ] Configure bucket as **private** (not public)
- [ ] Apply 4 RLS policies for Storage
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to `.env`
- [ ] Test upload with `test_document_upload.py`

---

## Step 1: Create Storage Bucket

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Click **Storage** in left sidebar
3. Click **"New bucket"** button
4. Configure:
   - **Name**: `documents` ⚠️ (must be exact, lowercase)
   - **Public bucket**: ❌ **Unchecked** (keep private)
   - **File size limit**: 50 MB (or leave default)
   - **Allowed MIME types**: Leave empty (validated in code)
5. Click **"Create bucket"**

---

## Step 2: Apply Storage Policies

Storage RLS policies control who can upload, read, and delete files.

### Navigate to Policies

1. Click on the **`documents`** bucket
2. Click **"Policies"** tab
3. Click **"New policy"**

### Policy 1: Allow Authenticated Uploads

```sql
-- Policy name: "Authenticated users can upload documents"
-- Allowed operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 2: Allow Users to Read Documents

```sql
-- Policy name: "Users can read their space documents"
-- Allowed operation: SELECT
-- Target roles: authenticated

CREATE POLICY "Users can read their space documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');
```

### Policy 3: Allow Users to Delete Documents

```sql
-- Policy name: "Users can delete their documents"
-- Allowed operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Users can delete their documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

### Policy 4: Service Role Full Access

```sql
-- Policy name: "Service role has full access"
-- Allowed operation: ALL
-- Target roles: service_role

CREATE POLICY "Service role has full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
```

---

## Step 3: Environment Configuration

Add Supabase credentials to `apps/api/.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...  # From Settings > API
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ⚠️ Required for uploads
```

**Where to find keys:**

1. Go to **Settings** → **API** in Supabase dashboard
2. Copy **Project URL** → `SUPABASE_URL`
3. Copy **anon public** → `SUPABASE_ANON_KEY`
4. Copy **service_role** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep secret!**

---

## Step 4: Test the Setup

### Quick Test

```bash
cd apps/api

# Start API server
docker compose up -d

# Run upload test
python test_document_upload.py
```

### Expected Output

```
============================================================
Document Upload API Test
============================================================

Setting up test data...
✓ Test user exists: test@example.com
✓ Test space exists: Test Space

1. Logging in to get JWT token...
✓ Login successful, got token

2. Uploading test document...
✓ Document uploaded successfully!
  Document ID: abc-123-def
  Name: Test Document Upload
  Size: 44 bytes
  Type: text/plain
  Status: uploaded

============================================================
Test completed
============================================================
```

### Verify Upload

1. **In Supabase Dashboard:**
   - Go to **Storage** → **documents**
   - You should see: `{space-id}/{document-id}/test_document.txt`

2. **In Database:**
   - Go to **Table Editor** → **documents**
   - Verify record exists with metadata

---

## File Upload Specifications

### Supported File Types

| Type  | MIME Type                                                                 | Extension |
| ----- | ------------------------------------------------------------------------- | --------- |
| PDF   | `application/pdf`                                                         | `.pdf`    |
| Word  | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx`   |
| Text  | `text/plain`                                                              | `.txt`    |
| CSV   | `text/csv`                                                                | `.csv`    |
| Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`       | `.xlsx`   |

### File Size Limit

- **Maximum**: 50 MB per file
- Configured in: `apps/api/app/services/storage_service.py:16`

### Storage Structure

```
documents/
├── {space_id_1}/
│   ├── {document_id_1}/
│   │   └── filename.pdf
│   ├── {document_id_2}/
│   │   └── report.docx
│   └── ...
├── {space_id_2}/
│   └── ...
```

---

## Common Issues & Solutions

### ❌ "Bucket 'documents' does not exist"

**Solution:**

- Verify bucket name is exactly `documents` (lowercase)
- Create bucket if missing (see Step 1)

### ❌ "new row violates row-level security policy"

**Solution:**

- Apply all 4 Storage policies (see Step 2)
- Verify using **service_role key**, not anon key
- Check `.env` has `SUPABASE_SERVICE_ROLE_KEY`

### ❌ "File too large" (413 error)

**Solution:**

- File exceeds 50 MB limit
- Compress file or increase limit in `storage_service.py`

### ❌ "Unsupported file type" (415 error)

**Solution:**

- File type not in allowed list
- Check supported types above
- Add new type to `ALLOWED_MIME_TYPES` in `storage_service.py`

### ❌ "Authentication required" (401 error)

**Solution:**

- User not logged in
- JWT token expired or invalid
- Login first to get valid token

### ❌ "Space not found" (404 error)

**Solution:**

- `space_id` doesn't exist
- Create space first or use valid `space_id`

---

## API Usage Example

### Upload Document

```bash
curl -X POST http://localhost:8000/api/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "space_id=123e4567-e89b-12d3-a456-426614174000" \
  -F "name=My Document"
```

### Response

```json
{
  "id": "789e4567-e89b-12d3-a456-426614174001",
  "name": "My Document",
  "file_type": "application/pdf",
  "size_bytes": 524288,
  "space_id": "123e4567-e89b-12d3-a456-426614174000",
  "uploaded_by": "user-id-here",
  "status": "uploaded",
  "created_at": "2025-10-15T12:00:00.000Z",
  "updated_at": "2025-10-15T12:00:00.000Z"
}
```

---

## Next Steps

After successful setup:

1. ✅ Verify uploads work with test script
2. ✅ Check Storage bucket has files
3. ✅ Verify database has document records
4. 🔄 Implement frontend upload UI
5. 🔄 Add document processing (text extraction)
6. 🔄 Implement AI query system

---

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Full Setup Guide](./SUPABASE_SETUP.md)
- [Storage Service Code](../app/services/storage_service.py)
- [Document Routes](../app/routes/documents.py)

---

**Need help?** Check the [troubleshooting section](./SUPABASE_SETUP.md#storage-specific-issues) in the main setup guide.
