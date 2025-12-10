/**
 * Test data builders for Olympus E2E tests
 *
 * Provides factory functions for creating mock data objects.
 * Use these to generate consistent test data across tests.
 */

/**
 * Create mock user data
 *
 * @param overrides - Properties to override defaults
 * @returns Mock user object
 *
 * @example
 * ```typescript
 * const user = createMockUser({ email: 'custom@example.com' });
 * ```
 */
export function createMockUser(
  overrides?: Partial<{
    id: string;
    email: string;
    name: string;
    organizationId: string;
    createdAt: string;
    role: string;
  }>
) {
  return {
    id: `user-${Date.now()}`,
    email: 'test@example.com',
    name: 'Test User',
    organizationId: 'org-1',
    createdAt: new Date().toISOString(),
    role: 'user',
    ...overrides,
  };
}

/**
 * Create mock organization data
 *
 * @param overrides - Properties to override defaults
 * @returns Mock organization object
 */
export function createMockOrganization(
  overrides?: Partial<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  }>
) {
  return {
    id: `org-${Date.now()}`,
    name: 'Test Organization',
    slug: 'test-org',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock space data
 *
 * @param overrides - Properties to override defaults
 * @returns Mock space object
 */
export function createMockSpace(
  overrides?: Partial<{
    id: string;
    name: string;
    description: string;
    organizationId: string;
    documentCount: number;
    createdAt: string;
  }>
) {
  return {
    id: `space-${Date.now()}`,
    name: 'Test Space',
    description: 'Test space description',
    organizationId: 'org-1',
    documentCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock document data
 *
 * @param overrides - Properties to override defaults
 * @returns Mock document object
 */
export function createMockDocument(
  overrides?: Partial<{
    id: string;
    name: string;
    spaceId: string;
    status: string;
    uploadedAt: string;
    fileSize: number;
    mimeType: string;
  }>
) {
  return {
    id: `doc-${Date.now()}`,
    name: 'Test Document.pdf',
    spaceId: 'space-123',
    status: 'processed',
    uploadedAt: new Date().toISOString(),
    fileSize: 1024000, // 1MB
    mimeType: 'application/pdf',
    ...overrides,
  };
}

/**
 * Create mock thread data
 *
 * @param overrides - Properties to override defaults
 * @returns Mock thread object
 */
export function createMockThread(
  overrides?: Partial<{
    id: string;
    spaceId: string;
    query: string;
    response: string;
    createdAt: string;
  }>
) {
  return {
    id: `thread-${Date.now()}`,
    spaceId: 'space-123',
    query: 'What is risk management?',
    response: 'Risk management is...',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock document chunk data (for vector search)
 *
 * @param overrides - Properties to override defaults
 * @returns Mock document chunk object
 */
export function createMockDocumentChunk(
  overrides?: Partial<{
    id: string;
    documentId: string;
    chunkText: string;
    chunkIndex: number;
    tokenCount: number;
  }>
) {
  return {
    id: `chunk-${Date.now()}`,
    documentId: 'doc-123',
    chunkText: 'This is a sample document chunk for testing vector search.',
    chunkIndex: 0,
    tokenCount: 15,
    ...overrides,
  };
}

/**
 * Create mock GraphQL response for spaces query
 *
 * @param count - Number of spaces to generate
 * @returns Mock GraphQL response
 */
export function createMockSpacesResponse(count = 3) {
  const spaces = Array.from({ length: count }, (_, i) =>
    createMockSpace({
      id: `space-${i + 1}`,
      name: `Space ${i + 1}`,
      documentCount: Math.floor(Math.random() * 50),
    })
  );

  return { spaces };
}

/**
 * Create mock GraphQL response for documents query
 *
 * @param count - Number of documents to generate
 * @returns Mock GraphQL response
 */
export function createMockDocumentsResponse(count = 5) {
  const documents = Array.from({ length: count }, (_, i) =>
    createMockDocument({
      id: `doc-${i + 1}`,
      name: `Document ${i + 1}.pdf`,
      status: i % 3 === 0 ? 'processing' : 'processed',
    })
  );

  return { documents };
}

/**
 * Create mock SSE token event
 *
 * @param content - Token content
 * @returns Mock SSE token event
 */
export function createMockTokenEvent(content: string) {
  return {
    type: 'token',
    data: {
      content,
      timestamp: Date.now(),
    },
  };
}

/**
 * Create mock SSE citations event
 *
 * @param sources - Array of citation sources
 * @returns Mock SSE citations event
 */
export function createMockCitationsEvent(
  sources: Array<{
    document_id: string;
    chunk_id: string;
    score: number;
  }>
) {
  return {
    type: 'citations',
    data: {
      sources,
    },
  };
}

/**
 * Create mock SSE done event
 *
 * @param confidenceScore - Confidence score (0-1)
 * @returns Mock SSE done event
 */
export function createMockDoneEvent(confidenceScore = 0.95) {
  return {
    type: 'done',
    data: {
      confidence_score: confidenceScore,
      timestamp: Date.now(),
    },
  };
}

/**
 * Create complete mock SSE stream
 *
 * Generates a full SSE event sequence with tokens, citations, and done event.
 *
 * @param responseText - The full AI response text
 * @param citationCount - Number of citations to include
 * @returns Array of mock SSE events
 */
export function createMockSSEStream(responseText: string, citationCount = 3) {
  const events = [];

  // Split response into tokens (simulate streaming)
  const words = responseText.split(' ');
  for (const word of words) {
    events.push(createMockTokenEvent(word + ' '));
  }

  // Add citations
  const sources = Array.from({ length: citationCount }, (_, i) => ({
    document_id: `doc-${i + 1}`,
    chunk_id: `chunk-${i + 1}`,
    score: 0.9 - i * 0.1,
  }));
  events.push(createMockCitationsEvent(sources));

  // Add done event
  events.push(createMockDoneEvent(0.95));

  return events;
}

/**
 * Create unique test data using worker index
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
 * Generate random email for testing
 *
 * @param prefix - Email prefix (default: 'test')
 * @returns Random email address
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Generate random password for testing
 *
 * Meets typical password requirements (uppercase, lowercase, number, special char).
 *
 * @returns Random secure password
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
