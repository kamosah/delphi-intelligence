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

### 5. Configure Authentication

1. **In Supabase dashboard, go to Authentication > Settings**
2. **Configure Email Authentication:**
   - Enable "Email confirmations"
   - Set "Site URL" to `http://localhost:3000` (for development)
   - Add additional URLs as needed for production
3. **Optional: Configure OAuth providers** (Google, GitHub, etc.)

### 6. Test the Setup

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

## 🚀 Next Steps

After completing Supabase setup:

1. **Initialize FastAPI app** with Supabase integration
2. **Set up Next.js app** with Supabase auth
3. **Implement document upload** to Supabase Storage
4. **Build AI query system** using the schema

## 🐛 Troubleshooting

### Common Issues

**"Missing required Supabase environment variables"**

- Check your `.env` files have all required variables
- Ensure no extra spaces or quotes around values

**"Connection refused"**

- Verify your Supabase project is active
- Check the project URL is correct

**"Row Level Security policy violation"**

- Ensure you're using the correct client (admin vs user)
- Check RLS policies are applied correctly

**"Schema not found"**

- Run the schema.sql file in Supabase SQL editor
- Check for any SQL errors in the dashboard

### Getting Help

- Check [Supabase documentation](https://supabase.com/docs)
- Review the test_supabase.py output for specific errors
- Verify environment variables are loaded correctly
