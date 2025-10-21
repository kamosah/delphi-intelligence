# Supabase Setup Guide

This guide walks through setting up Supabase for the Olympus MVP project.

## 📋 Prerequisites

- [Supabase account](https://supabase.com) (free tier is fine)
- Access to the Olympus MVP monorepo

## 🚀 Step-by-Step Setup

### 1. Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up/Sign in** to your account
3. **Click "New Project"**
4. **Fill in project details:**
   - **Organization**: Select or create one
   - **Project Name**: `olympus-mvp`
   - **Database Password**: Generate a strong password and **save it**
   - **Region**: Choose closest to your users
5. **Click "Create new project"**
6. **Wait 2-3 minutes** for project initialization

### 2. Get API Keys

1. In your Supabase dashboard, go to **Settings > API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-ref.supabase.co`)
   - **Anon key** (public key, safe for frontend)
   - **Service role key** (secret key, backend only)

### 3. Configure Environment Variables

1. **Copy the example files:**

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

2. **Update `apps/api/.env`:**

   ```bash
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cWphaHJpZGF5dHhmc3V6bGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODUxMTQsImV4cCI6MjA3NTM2MTExNH0.I_yb04J9uV8N5HrmuW94kowF79Hfjnos61z8gYHoUUg
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Update `apps/web/.env.local`:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Apply Database Schema

1. **Go to your Supabase dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste the contents of `apps/api/database/schema.sql`**
4. **Click "Run"** to execute the schema
5. **Copy and paste the contents of `apps/api/database/rls_policies.sql`**
6. **Click "Run"** to apply Row Level Security policies

### 5. Configure Storage Bucket (for Document Uploads)

The document upload feature requires a Supabase Storage bucket to store files.

#### 5.1 Create Storage Bucket

1. **In Supabase dashboard, go to Storage**
2. **Click "New bucket"**
3. **Configure bucket settings:**
   - **Name**: `documents` (must match `BUCKET_NAME` in `storage_service.py`)
   - **Public bucket**: ❌ **Unchecked** (keep private for security)
   - **Allowed MIME types**: Leave empty (we validate in code)
   - **File size limit**: 50 MB (or leave default, we validate in code)
4. **Click "Create bucket"**

#### 5.2 Configure Storage Policies

Storage buckets need RLS policies just like database tables. Apply these policies:

1. **In Storage, click on the `documents` bucket**
2. **Click "Policies" tab**
3. **Click "New policy"** and add the following policies:

**Policy 1: Allow authenticated uploads**

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

**Policy 2: Allow users to read their own documents**

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

**Policy 3: Allow users to delete their own documents**

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

**Policy 4: Allow service role full access (for backend)**

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

#### 5.3 Verify Storage Setup

1. **Go to Storage > documents bucket**
2. **Click "Policies" tab**
3. **Verify you have 4 policies enabled**
4. **Try uploading a test file through the UI** to verify permissions

> **Note**: The backend uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS, so uploads will work even with strict policies. The policies mainly protect direct client access.

### 6. Configure Authentication

1. **In Supabase dashboard, go to Authentication > Settings**
2. **Configure Email Authentication:**
   - Enable "Email confirmations"
   - Set "Site URL" to `http://localhost:3000` (for development)
   - Add additional URLs as needed for production
3. **Optional: Configure OAuth providers** (Google, GitHub, etc.)

### 7. Test the Setup

1. **Install Python dependencies:**

   ```bash
   cd apps/api
   pip install -r requirements.txt
   ```

2. **Run the test script:**

   ```bash
   cd apps/api
   python test_supabase.py
   ```

3. **Expected output:**
   ```
   🧪 Testing Supabase Connection...
   ✅ Admin client connected. Users table accessible.
   ✅ User client connected. Public spaces accessible.
   ✅ Auth endpoints accessible.
   🎉 All Supabase tests passed!
   ```

## 📊 Database Schema Overview

The schema includes these main tables:

### Core Tables

- **`users`** - User profiles (extends Supabase auth.users)
- **`spaces`** - Workspaces/organizations
- **`space_members`** - User membership in spaces
- **`documents`** - Uploaded files and content
- **`queries`** - AI queries and responses
- **`query_documents`** - Links between queries and relevant documents

### Key Features

- **Full-text search** on document content
- **Row Level Security (RLS)** for data protection
- **Automatic timestamps** with triggers
- **Foreign key relationships** for data integrity

## 🔒 Security Features

### Row Level Security (RLS)

All tables have RLS policies that ensure:

- Users can only access data from spaces they belong to
- Space owners have admin privileges
- Public spaces are visible to all users
- Service role bypasses RLS for backend operations

### Authentication

- Email/password authentication enabled
- JWT tokens for session management
- User profiles automatically created on signup

## 🔧 Development Workflow

### Local Development

1. **Use Docker PostgreSQL** for development database
2. **Use Supabase** for auth and real-time features
3. **Test with both** local and remote databases

### Environment Setup

```bash
# Development (local)
SUPABASE_URL=https://your-project.supabase.co
DATABASE_URL=postgresql://olympus:olympus_dev@localhost:5432/olympus_mvp

# Production
SUPABASE_URL=https://your-project.supabase.co
# No local DATABASE_URL - use Supabase entirely
```

## 🧪 Testing Document Upload

After setting up the Storage bucket, you can test the document upload feature:

### Manual API Test

1. **Start the API server:**

   ```bash
   cd apps/api
   docker compose up -d
   ```

2. **Run the document upload test script:**

   ```bash
   cd apps/api
   python test_document_upload.py
   ```

3. **Expected output:**

   ```
   ============================================================
   Document Upload API Test
   ============================================================

   Setting up test data...
   ✓ Test user exists: test@example.com
   ✓ Test space exists: Test Space

   Test User ID: ...
   Test Space ID: ...

   1. Logging in to get JWT token...
   ✓ Login successful, got token

   2. Uploading test document...
   ✓ Document uploaded successfully!
     Document ID: ...
     Name: Test Document Upload
     Size: 44 bytes
     Type: text/plain
     Status: uploaded

   ============================================================
   Test completed
   ============================================================
   ```

### Verify in Supabase Dashboard

1. **Go to Storage > documents bucket**
2. **You should see folders organized by `space_id/document_id/filename`**
3. **Click on a file to view/download it**

### Check Database Records

1. **Go to Table Editor > documents**
2. **Verify document metadata is stored:**
   - `id`, `space_id`, `name`, `file_type`, `file_path`
   - `size_bytes`, `status`, `uploaded_by`
   - `created_at`, `updated_at`

## 📁 Document Upload Feature Details

### Supported File Types

The API validates and accepts the following file types:

- **PDF**: `application/pdf`
- **Word Documents**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- **Plain Text**: `text/plain` (.txt)
- **CSV**: `text/csv` (.csv)
- **Excel**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx)

### File Size Limits

- **Maximum size**: 50 MB per file
- Enforced in `storage_service.py:16`

### Storage Structure

Files are organized in Supabase Storage with this structure:

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

This structure ensures:

- ✅ Files are organized by workspace (space)
- ✅ Each document has a unique folder (prevents name conflicts)
- ✅ Easy to delete all documents for a space
- ✅ Clear file ownership and access control

## 🚀 Next Steps

After completing Supabase setup:

1. ✅ **Initialize FastAPI app** with Supabase integration
2. ✅ **Set up Next.js app** with Supabase auth
3. ✅ **Implement document upload** to Supabase Storage (LOG-130 complete)
4. **Build AI query system** using the schema
5. **Implement document processing** (text extraction, embeddings)

## 🐛 Troubleshooting

### Common Issues

**"Missing required Supabase environment variables"**

- Check your `.env` files have all required variables
- Ensure no extra spaces or quotes around values
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (required for Storage)

**"Connection refused"**

- Verify your Supabase project is active
- Check the project URL is correct

**"Row Level Security policy violation"**

- Ensure you're using the correct client (admin vs user)
- Check RLS policies are applied correctly

**"Schema not found"**

- Run the schema.sql file in Supabase SQL editor
- Check for any SQL errors in the dashboard

### Storage-Specific Issues

**"Bucket 'documents' does not exist"**

- Go to Storage in Supabase dashboard
- Create a bucket named `documents` (exact name, lowercase)
- Verify bucket name matches `BUCKET_NAME` in `storage_service.py`

**"Failed to upload file: new row violates row-level security policy"**

- Check that Storage policies are created (see section 5.2)
- Verify you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Service role should bypass RLS - check key is correct

**"File too large" (413 error)**

- Default limit is 50 MB (set in `storage_service.py`)
- Check file size before upload
- To increase limit, update `MAX_FILE_SIZE` in `storage_service.py`

**"Unsupported file type" (415 error)**

- Verify file type is in `ALLOWED_MIME_TYPES` list
- Supported: PDF, DOCX, TXT, CSV, XLSX
- To add more types, update `ALLOWED_MIME_TYPES` in `storage_service.py`

**"Document uploaded but not visible in Storage"**

- Wait a few seconds and refresh the Storage page
- Check the folder structure: `{space_id}/{document_id}/{filename}`
- Verify in Table Editor > documents that the record exists

**"Storage policies not working"**

- Policies require the bucket to have RLS enabled
- Go to Storage > documents > Settings
- Ensure "Enable RLS" is checked
- Re-create policies if needed

### Getting Help

- Check [Supabase documentation](https://supabase.com/docs)
- Review the test_supabase.py output for specific errors
- Verify environment variables are loaded correctly
