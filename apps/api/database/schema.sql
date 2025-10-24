-- Olympus MVP - Initial Database Schema
-- This file contains the complete database schema for Supabase
-- Run this in the Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE user_role AS ENUM ('admin', 'member', 'viewer');
CREATE TYPE member_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE document_type AS ENUM ('text', 'pdf', 'image', 'url', 'code');
CREATE TYPE query_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- =====================================================
-- USERS TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Reference to Supabase auth.users
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Profile information
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    
    -- User settings
    role user_role DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- =====================================================
-- SPACES TABLE (workspaces/organizations)
-- =====================================================
CREATE TABLE public.spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    
    -- Owner
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Settings
    is_public BOOLEAN DEFAULT false,
    max_members INTEGER DEFAULT 10,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SPACE MEMBERS (many-to-many relationship)
-- =====================================================
CREATE TABLE public.space_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    member_role member_role DEFAULT 'editor',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique membership
    UNIQUE(space_id, user_id)
);

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Ownership
    space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Document metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255),
    file_size BIGINT, -- bytes
    mime_type VARCHAR(100),
    document_type document_type NOT NULL,
    
    -- File storage
    storage_path TEXT, -- Supabase Storage path
    url TEXT, -- For URL documents
    
    -- Content and processing
    content TEXT, -- Extracted text content
    content_preview TEXT, -- First 500 chars
    is_processed BOOLEAN DEFAULT false,
    processing_error TEXT,
    
    -- Search and indexing
    content_vector tsvector, -- Full-text search
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- QUERIES TABLE (AI queries/conversations)
-- =====================================================
CREATE TABLE public.queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Ownership
    space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Query content
    title VARCHAR(255),
    question TEXT NOT NULL,
    context TEXT, -- Additional context provided
    
    -- AI Response
    answer TEXT,
    sources JSONB, -- Array of document references
    model_used VARCHAR(100), -- e.g., 'gpt-4', 'claude-3'
    
    -- Processing
    status query_status DEFAULT 'pending',
    error_message TEXT,
    processing_time_ms INTEGER,
    
    -- Metadata
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 6),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- =====================================================
-- QUERY DOCUMENTS (many-to-many: queries <-> documents)
-- =====================================================
CREATE TABLE public.query_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_id UUID REFERENCES public.queries(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3, 2), -- 0.00 to 1.00
    
    UNIQUE(query_id, document_id)
);

-- =====================================================
-- INDEXES for performance
-- =====================================================

-- Users
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_users_email ON public.users(email);

-- Spaces
CREATE INDEX idx_spaces_owner_id ON public.spaces(owner_id);
CREATE INDEX idx_spaces_slug ON public.spaces(slug);

-- Space Members
CREATE INDEX idx_space_members_space_id ON public.space_members(space_id);
CREATE INDEX idx_space_members_user_id ON public.space_members(user_id);

-- Documents
CREATE INDEX idx_documents_space_id ON public.documents(space_id);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_documents_document_type ON public.documents(document_type);
CREATE INDEX idx_documents_is_processed ON public.documents(is_processed);
CREATE INDEX idx_documents_created_at ON public.documents(created_at);

-- Full-text search index
CREATE INDEX idx_documents_content_vector ON public.documents USING gin(content_vector);
CREATE INDEX idx_documents_content_search ON public.documents USING gin(to_tsvector('english', content));

-- Queries
CREATE INDEX idx_queries_space_id ON public.queries(space_id);
CREATE INDEX idx_queries_user_id ON public.queries(user_id);
CREATE INDEX idx_queries_status ON public.queries(status);
CREATE INDEX idx_queries_created_at ON public.queries(created_at);

-- Query Documents
CREATE INDEX idx_query_documents_query_id ON public.query_documents(query_id);
CREATE INDEX idx_query_documents_document_id ON public.query_documents(document_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON public.spaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_queries_updated_at BEFORE UPDATE ON public.queries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update content_vector when content changes
CREATE OR REPLACE FUNCTION update_document_content_vector()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content IS NOT NULL AND NEW.content != OLD.content THEN
        NEW.content_vector = to_tsvector('english', NEW.content);
        NEW.content_preview = LEFT(NEW.content, 500);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_vector BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_document_content_vector();

-- Function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (auth_user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();