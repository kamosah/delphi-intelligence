import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * RLS (Row Level Security) testing utilities.
 *
 * Helpers for verifying Supabase RLS policies are correctly enforced.
 */

/**
 * Verify that RLS policy blocks unauthorized access to a record.
 *
 * @param supabase - Supabase client (should be anon client, not service role)
 * @param table - Table name to test
 * @param recordId - ID of the record to test access
 * @returns Object with data, error, and isBlocked flag
 *
 * @example
 * ```typescript
 * const result = await verifyRLSBlocked(supabase, 'spaces', spaceId);
 * expect(result.isBlocked).toBe(true);
 * ```
 */
export async function verifyRLSBlocked(
  supabase: SupabaseClient,
  table: string,
  recordId: string
) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', recordId)
    .maybeSingle();

  return {
    data,
    error,
    isBlocked: data === null, // No data means blocked by RLS
  };
}

/**
 * Verify that RLS policy allows authorized access to a record.
 *
 * @param supabase - Authenticated Supabase client (with user session)
 * @param table - Table name to test
 * @param recordId - ID of the record to test access
 * @returns Object with data, error, and isAllowed flag
 *
 * @example
 * ```typescript
 * const result = await verifyRLSAllowed(supabase, 'spaces', spaceId);
 * expect(result.isAllowed).toBe(true);
 * expect(result.data).toBeDefined();
 * ```
 */
export async function verifyRLSAllowed(
  supabase: SupabaseClient,
  table: string,
  recordId: string
) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', recordId)
    .single();

  return {
    data,
    error,
    isAllowed: data !== null && error === null,
  };
}

/**
 * Set user session on Supabase client for RLS testing.
 *
 * Useful for testing RLS policies with different user contexts.
 *
 * @param supabase - Supabase client
 * @param accessToken - User's access token
 * @param refreshToken - User's refresh token (optional)
 *
 * @example
 * ```typescript
 * await setUserSession(supabase, userAccessToken);
 * const result = await supabase.from('spaces').select('*');
 * // Results are filtered by RLS based on user's permissions
 * ```
 */
export async function setUserSession(
  supabase: SupabaseClient,
  accessToken: string,
  refreshToken = ''
) {
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw new Error(`Failed to set user session: ${error.message}`);
  }
}

/**
 * Verify that a user can only access their own organization's resources.
 *
 * Tests the common RLS pattern where users should only see data
 * from organizations they belong to.
 *
 * @param supabase - Supabase client with user session
 * @param table - Table name to test
 * @param userOrgId - User's organization ID
 * @returns Object with accessible and inaccessible records
 *
 * @example
 * ```typescript
 * const result = await verifyOrganizationIsolation(
 *   supabase,
 *   'spaces',
 *   userOrgId
 * );
 * expect(result.accessibleRecords.length).toBeGreaterThan(0);
 * expect(result.inaccessibleRecords.length).toBe(0);
 * ```
 */
export async function verifyOrganizationIsolation(
  supabase: SupabaseClient,
  table: string,
  userOrgId: string
) {
  // Query all records (should be filtered by RLS)
  const { data: allRecords, error } = await supabase
    .from(table)
    .select('*, organization_id');

  if (error) {
    throw new Error(`Failed to query ${table}: ${error.message}`);
  }

  // Verify all returned records belong to user's organization
  const accessibleRecords = allRecords?.filter(
    (record) => record.organization_id === userOrgId
  );
  const inaccessibleRecords = allRecords?.filter(
    (record) => record.organization_id !== userOrgId
  );

  return {
    allRecords: allRecords || [],
    accessibleRecords: accessibleRecords || [],
    inaccessibleRecords: inaccessibleRecords || [],
    isIsolated: (inaccessibleRecords?.length || 0) === 0,
  };
}

/**
 * Create a record and verify RLS blocks another user from accessing it.
 *
 * Complete RLS test pattern: create data as one user, verify another user
 * cannot access it.
 *
 * @param serviceClient - Service role client for creating test data
 * @param userClient - User client for testing RLS
 * @param table - Table name
 * @param recordData - Data to insert
 * @param recordIdField - Field name for record ID (default: 'id')
 * @returns Test result with created record and RLS verification
 *
 * @example
 * ```typescript
 * const result = await createAndVerifyRLSBlocked(
 *   supaService,
 *   supabase,
 *   'spaces',
 *   { name: 'Private Space', organization_id: otherOrgId }
 * );
 * expect(result.isBlocked).toBe(true);
 * ```
 */
export async function createAndVerifyRLSBlocked(
  serviceClient: SupabaseClient,
  userClient: SupabaseClient,
  table: string,
  recordData: Record<string, unknown>,
  recordIdField = 'id'
) {
  // Create record with service role (bypasses RLS)
  const { data: record, error: createError } = await serviceClient
    .from(table)
    .insert(recordData)
    .select()
    .single();

  if (createError || !record) {
    throw new Error(
      `Failed to create test record in ${table}: ${createError?.message}`
    );
  }

  // Try to access with user client (should be blocked by RLS)
  const recordId = record[recordIdField];
  const rlsResult = await verifyRLSBlocked(userClient, table, recordId);

  return {
    record,
    ...rlsResult,
  };
}

/**
 * Verify CRUD operations respect RLS policies.
 *
 * Tests all CRUD operations (Create, Read, Update, Delete) against RLS.
 *
 * @param supabase - User's Supabase client
 * @param table - Table to test
 * @param recordData - Data for create/update operations
 * @param recordId - Existing record ID for read/update/delete
 * @returns Results for each CRUD operation
 *
 * @example
 * ```typescript
 * const results = await verifyCRUDWithRLS(
 *   supabase,
 *   'spaces',
 *   { name: 'Test Space', organization_id: orgId },
 *   existingSpaceId
 * );
 * expect(results.create.allowed).toBe(true);
 * expect(results.read.allowed).toBe(true);
 * ```
 */
export async function verifyCRUDWithRLS(
  supabase: SupabaseClient,
  table: string,
  recordData: Record<string, unknown>,
  recordId: string
) {
  // Test CREATE
  const { data: created, error: createError } = await supabase
    .from(table)
    .insert(recordData)
    .select()
    .single();

  // Test READ
  const { data: read, error: readError } = await supabase
    .from(table)
    .select('*')
    .eq('id', recordId)
    .maybeSingle();

  // Test UPDATE
  const { data: updated, error: updateError } = await supabase
    .from(table)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', recordId)
    .select()
    .maybeSingle();

  // Test DELETE
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq('id', recordId);

  return {
    create: {
      allowed: created !== null && createError === null,
      data: created,
      error: createError,
    },
    read: {
      allowed: read !== null && readError === null,
      data: read,
      error: readError,
    },
    update: {
      allowed: updated !== null && updateError === null,
      data: updated,
      error: updateError,
    },
    delete: {
      allowed: deleteError === null,
      error: deleteError,
    },
  };
}
