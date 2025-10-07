-- Olympus MVP - Row Level Security (RLS) Policies
-- This file contains all RLS policies for data security
-- Run this AFTER running schema.sql

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_documents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Function to check if user is member of a space
CREATE OR REPLACE FUNCTION public.is_space_member(space_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.space_members sm
        JOIN public.users u ON u.id = sm.user_id
        WHERE sm.space_id = is_space_member.space_id
        AND u.auth_user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is space owner or admin
CREATE OR REPLACE FUNCTION public.is_space_admin(space_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.spaces s
        JOIN public.users u ON u.id = s.owner_id
        WHERE s.id = is_space_admin.space_id
        AND u.auth_user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.space_members sm
        JOIN public.users u ON u.id = sm.user_id
        WHERE sm.space_id = is_space_admin.space_id
        AND sm.role = 'admin'
        AND u.auth_user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can read all user profiles (for @mentions, sharing, etc.)
CREATE POLICY "Users can read all profiles" ON public.users
    FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Users can insert their own profile (handled by trigger mostly)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- =====================================================
-- SPACES TABLE POLICIES
-- =====================================================

-- Users can read spaces they are members of or public spaces
CREATE POLICY "Users can read accessible spaces" ON public.spaces
    FOR SELECT USING (
        is_public = true OR
        id IN (
            SELECT sm.space_id FROM public.space_members sm
            JOIN public.users u ON u.id = sm.user_id
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Users can create new spaces
CREATE POLICY "Authenticated users can create spaces" ON public.spaces
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = owner_id AND u.auth_user_id = auth.uid()
        )
    );

-- Only space owners can update spaces
CREATE POLICY "Space owners can update spaces" ON public.spaces
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = owner_id AND u.auth_user_id = auth.uid()
        )
    );

-- Only space owners can delete spaces
CREATE POLICY "Space owners can delete spaces" ON public.spaces
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = owner_id AND u.auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- SPACE_MEMBERS TABLE POLICIES
-- =====================================================

-- Users can read members of spaces they belong to
CREATE POLICY "Users can read space members" ON public.space_members
    FOR SELECT USING (is_space_member(space_id));

-- Space admins can add new members
CREATE POLICY "Space admins can add members" ON public.space_members
    FOR INSERT WITH CHECK (is_space_admin(space_id));

-- Space admins can update member roles, users can leave themselves
CREATE POLICY "Space admins can update members" ON public.space_members
    FOR UPDATE USING (
        is_space_admin(space_id) OR
        (user_id IN (
            SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        ))
    );

-- Space admins can remove members, users can remove themselves
CREATE POLICY "Space admins can remove members" ON public.space_members
    FOR DELETE USING (
        is_space_admin(space_id) OR
        (user_id IN (
            SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        ))
    );

-- =====================================================
-- DOCUMENTS TABLE POLICIES
-- =====================================================

-- Users can read documents in spaces they belong to
CREATE POLICY "Users can read space documents" ON public.documents
    FOR SELECT USING (is_space_member(space_id));

-- Users can upload documents to spaces they belong to
CREATE POLICY "Users can upload documents" ON public.documents
    FOR INSERT WITH CHECK (
        is_space_member(space_id) AND
        uploaded_by IN (
            SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
    );

-- Users can update documents they uploaded, space admins can update any
CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE USING (
        is_space_admin(space_id) OR
        uploaded_by IN (
            SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
    );

-- Users can delete documents they uploaded, space admins can delete any
CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING (
        is_space_admin(space_id) OR
        uploaded_by IN (
            SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- QUERIES TABLE POLICIES
-- =====================================================

-- Users can read queries in spaces they belong to
CREATE POLICY "Users can read space queries" ON public.queries
    FOR SELECT USING (is_space_member(space_id));

-- Users can create queries in spaces they belong to
CREATE POLICY "Users can create queries" ON public.queries
    FOR INSERT WITH CHECK (
        is_space_member(space_id) AND
        user_id IN (
            SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
    );

-- Users can update their own queries, space admins can update any
CREATE POLICY "Users can update own queries" ON public.queries
    FOR UPDATE USING (
        is_space_admin(space_id) OR
        user_id IN (
            SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
    );

-- Users can delete their own queries, space admins can delete any
CREATE POLICY "Users can delete own queries" ON public.queries
    FOR DELETE USING (
        is_space_admin(space_id) OR
        user_id IN (
            SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- QUERY_DOCUMENTS TABLE POLICIES
-- =====================================================

-- Users can read query-document relationships for queries/docs they can access
CREATE POLICY "Users can read query documents" ON public.query_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.queries q
            WHERE q.id = query_id AND is_space_member(q.space_id)
        )
    );

-- Users can create query-document relationships for their queries
CREATE POLICY "Users can create query documents" ON public.query_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.queries q
            JOIN public.users u ON u.id = q.user_id
            WHERE q.id = query_id AND u.auth_user_id = auth.uid()
        )
    );

-- Users can update query-document relationships for their queries
CREATE POLICY "Users can update query documents" ON public.query_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.queries q
            JOIN public.users u ON u.id = q.user_id
            WHERE q.id = query_id AND u.auth_user_id = auth.uid()
        )
    );

-- Users can delete query-document relationships for their queries
CREATE POLICY "Users can delete query documents" ON public.query_documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.queries q
            JOIN public.users u ON u.id = q.user_id
            WHERE q.id = query_id AND u.auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- SERVICE ROLE BYPASS (for server-side operations)
-- =====================================================

-- Allow service role to bypass all RLS policies
-- This is for server-side operations that need full access

-- Note: These policies automatically allow service_role to bypass RLS
-- The service role should be used carefully and only in backend APIs