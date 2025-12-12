import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Test data helpers for Olympus E2E tests.
 *
 * Provides functions for creating real test data using Supabase.
 * All data is automatically tracked for cleanup by Supawright.
 */

/**
 * Create test organization with unique name (per-worker safe).
 *
 * @param supabase - Supabase client (service role recommended for setup)
 * @param workerId - Worker index for unique naming
 * @param ownerId - User ID of organization owner
 * @returns Created organization
 *
 * @example
 * ```typescript
 * const org = await createTestOrganization(supaService, 0, userId);
 * expect(org.id).toBeDefined();
 * ```
 */
export async function createTestOrganization(
  supabase: SupabaseClient,
  workerId: number,
  ownerId: string
) {
  const timestamp = Date.now();
  const name = `Test Org Worker ${workerId}`;
  const slug = `test-org-worker-${workerId}-${timestamp}`;

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      owner_id: ownerId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test organization: ${error.message}`);
  }

  return data;
}

/**
 * Create test space with FK relationship to organization.
 *
 * @param supabase - Supabase client (service role recommended)
 * @param workerId - Worker index for unique naming
 * @param organizationId - Organization ID for FK relationship
 * @param ownerId - User ID of space owner
 * @returns Created space
 *
 * @example
 * ```typescript
 * const space = await createTestSpace(supaService, 0, orgId, userId);
 * expect(space.organization_id).toBe(orgId);
 * ```
 */
export async function createTestSpace(
  supabase: SupabaseClient,
  workerId: number,
  organizationId: string,
  ownerId: string
) {
  const timestamp = Date.now();
  const name = `Test Space Worker ${workerId}`;
  const slug = `test-space-worker-${workerId}-${timestamp}`;

  const { data, error } = await supabase
    .from('spaces')
    .insert({
      name,
      slug,
      description: `Test space for worker ${workerId}`,
      organization_id: organizationId,
      owner_id: ownerId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test space: ${error.message}`);
  }

  return data;
}

/**
 * Create test document in space.
 *
 * @param supabase - Supabase client (service role recommended)
 * @param workerId - Worker index for unique naming
 * @param spaceId - Space ID for FK relationship
 * @param uploadedBy - User ID who uploaded the document
 * @returns Created document
 *
 * @example
 * ```typescript
 * const doc = await createTestDocument(supaService, 0, spaceId, userId);
 * expect(doc.space_id).toBe(spaceId);
 * ```
 */
export async function createTestDocument(
  supabase: SupabaseClient,
  workerId: number,
  spaceId: string,
  uploadedBy: string
) {
  const timestamp = Date.now();
  const name = `test-document-${workerId}-${timestamp}.pdf`;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      name,
      file_type: 'application/pdf',
      file_path: `uploads/test-${workerId}-${timestamp}.pdf`,
      size_bytes: 1024,
      space_id: spaceId,
      uploaded_by: uploadedBy,
      status: 'uploaded',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test document: ${error.message}`);
  }

  return data;
}

/**
 * Create test thread with messages.
 *
 * @param supabase - Supabase client (service role recommended)
 * @param workerId - Worker index for unique naming
 * @param spaceId - Space ID for FK relationship
 * @param createdBy - User ID who created the thread
 * @returns Created thread and initial message
 *
 * @example
 * ```typescript
 * const { thread, message } = await createTestThread(
 *   supaService,
 *   0,
 *   spaceId,
 *   userId
 * );
 * expect(thread.space_id).toBe(spaceId);
 * ```
 */
export async function createTestThread(
  supabase: SupabaseClient,
  workerId: number,
  spaceId: string,
  createdBy: string
) {
  const timestamp = Date.now();
  const title = `Test Thread Worker ${workerId} - ${timestamp}`;

  // Create thread
  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .insert({
      title,
      space_id: spaceId,
      created_by: createdBy,
      status: 'active',
    })
    .select()
    .single();

  if (threadError || !thread) {
    throw new Error(`Failed to create test thread: ${threadError?.message}`);
  }

  // Create initial message
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      thread_id: thread.id,
      role: 'user',
      content: 'Test query for thread',
      created_by: createdBy,
    })
    .select()
    .single();

  if (messageError) {
    throw new Error(`Failed to create test message: ${messageError.message}`);
  }

  return { thread, message };
}

/**
 * Create test document chunk with vector embedding.
 *
 * @param supabase - Supabase client (service role recommended)
 * @param documentId - Document ID for FK relationship
 * @param chunkIndex - Index of chunk in document
 * @param embedding - Vector embedding (1536 dimensions for OpenAI)
 * @returns Created document chunk
 *
 * @example
 * ```typescript
 * const chunk = await createTestDocumentChunk(
 *   supaService,
 *   docId,
 *   0,
 *   new Array(1536).fill(0.1)
 * );
 * expect(chunk.document_id).toBe(docId);
 * ```
 */
export async function createTestDocumentChunk(
  supabase: SupabaseClient,
  documentId: string,
  chunkIndex: number,
  embedding: number[]
) {
  const { data, error } = await supabase
    .from('document_chunks')
    .insert({
      document_id: documentId,
      chunk_text: `This is test chunk ${chunkIndex} for vector search testing.`,
      chunk_index: chunkIndex,
      token_count: 15,
      embedding,
      start_char: chunkIndex * 100,
      end_char: (chunkIndex + 1) * 100,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test document chunk: ${error.message}`);
  }

  return data;
}

/**
 * Create unique test data using worker index.
 *
 * Useful for parallel test execution to avoid data conflicts.
 *
 * @param base - Base name
 * @param workerIndex - Playwright worker index
 * @returns Unique name
 *
 * @example
 * ```typescript
 * const spaceName = createUniqueTestData('Test Space', testInfo.parallelIndex);
 * // Result: "Test Space Worker 0 - 1234567890"
 * ```
 */
export function createUniqueTestData(
  base: string,
  workerIndex: number
): string {
  return `${base} Worker ${workerIndex} - ${Date.now()}`;
}

/**
 * Generate random email for testing.
 *
 * @param prefix - Email prefix (default: 'test')
 * @returns Random email address
 *
 * @example
 * ```typescript
 * const email = generateTestEmail('worker-0');
 * // Result: "worker-0-1234567890-abc123@example.com"
 * ```
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Generate random password for testing.
 *
 * Meets typical password requirements (uppercase, lowercase, number, special char).
 *
 * @returns Random secure password
 *
 * @example
 * ```typescript
 * const password = generateTestPassword();
 * // Result: "TestAbc123xyz!@#!"
 * ```
 */
export function generateTestPassword(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = 'Test'; // Start with uppercase

  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password + '!'; // Ensure special char
}

/**
 * Create complete test environment (org, space, documents).
 *
 * Creates a full test environment with organization, space, and optional documents.
 * Useful for setting up complex test scenarios.
 *
 * @param supabase - Supabase client (service role recommended)
 * @param workerId - Worker index for unique naming
 * @param ownerId - User ID of owner
 * @param options - Optional configuration
 * @returns Created organization, space, and documents
 *
 * @example
 * ```typescript
 * const env = await createTestEnvironment(supaService, 0, userId, {
 *   documentCount: 3
 * });
 * expect(env.documents.length).toBe(3);
 * ```
 */
export async function createTestEnvironment(
  supabase: SupabaseClient,
  workerId: number,
  ownerId: string,
  options: {
    documentCount?: number;
    threadCount?: number;
  } = {}
) {
  const { documentCount = 0, threadCount = 0 } = options;

  // Create organization
  const organization = await createTestOrganization(
    supabase,
    workerId,
    ownerId
  );

  // Create space
  const space = await createTestSpace(
    supabase,
    workerId,
    organization.id,
    ownerId
  );

  // Create documents
  const documents = [];
  for (let i = 0; i < documentCount; i++) {
    const doc = await createTestDocument(supabase, workerId, space.id, ownerId);
    documents.push(doc);
  }

  // Create threads
  const threads = [];
  for (let i = 0; i < threadCount; i++) {
    const threadData = await createTestThread(
      supabase,
      workerId,
      space.id,
      ownerId
    );
    threads.push(threadData);
  }

  return {
    organization,
    space,
    documents,
    threads,
  };
}

/**
 * Generate realistic test embedding vector.
 *
 * Creates a valid 1536-dimension vector for OpenAI embeddings.
 * Values are normalized to simulate real embeddings.
 *
 * @param seed - Optional seed for reproducible vectors
 * @returns 1536-dimension embedding vector
 *
 * @example
 * ```typescript
 * const embedding = generateTestEmbedding(42);
 * expect(embedding.length).toBe(1536);
 * ```
 */
export function generateTestEmbedding(seed = 0): number[] {
  const dimensions = 1536; // OpenAI text-embedding-3-small dimensions
  const embedding = [];

  for (let i = 0; i < dimensions; i++) {
    // Generate pseudo-random values based on seed
    const value = Math.sin((seed + i) * 12.9898) * 43758.5453;
    embedding.push(value - Math.floor(value)); // Normalize to [0, 1]
  }

  return embedding;
}

/**
 * Cleanup test data by deleting records.
 *
 * Note: In most cases, cleanup is automatic via Supawright.
 * Use this only when manual cleanup is needed.
 *
 * @param supabase - Supabase client (service role required)
 * @param table - Table name
 * @param recordIds - Array of record IDs to delete
 *
 * @example
 * ```typescript
 * await cleanupTestData(supaService, 'spaces', [spaceId1, spaceId2]);
 * ```
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  table: string,
  recordIds: string[]
) {
  if (recordIds.length === 0) {
    return;
  }

  const { error } = await supabase.from(table).delete().in('id', recordIds);

  if (error) {
    console.warn(`Failed to cleanup test data from ${table}:`, error.message);
  }
}
