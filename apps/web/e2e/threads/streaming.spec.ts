import { test, expect, createMockSSEResponse } from '../fixtures/sse-mock';
import {
  collectSSEEvents,
  verifySSEStream,
  extractAIResponse,
  extractCitations,
  verifySSEPerformance,
} from '../lib/sse-helpers';
import {
  createTestOrganization,
  createTestSpace,
  createTestThread,
  createTestDocument,
  createTestDocumentChunk,
  generateTestEmbedding,
} from '../lib/test-data';

/**
 * NOTE: These tests use MOCKED SSE responses to avoid consuming OpenAI API credits.
 * The mock fixture intercepts streaming endpoints and returns realistic test data.
 * All other aspects (database, auth, GraphQL) use real interactions.
 */

// TODO: Fix E2E tests in CI - requires backend API server (LOG-XXX)
test.describe.skip('Threads - AI Streaming', () => {
  test('should stream AI response with mocked SSE events', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
    mockSSE,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup: Create complete test environment (org → space → thread → documents)
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const space = await createTestSpace(
      supaService,
      workerId,
      org.id,
      authenticatedUserId
    );

    // Create documents with embeddings for vector search (mock embeddings)
    const doc1 = await createTestDocument(
      supaService,
      workerId,
      space.id,
      authenticatedUserId
    );

    await createTestDocumentChunk(
      supaService,
      doc1.id,
      0,
      generateTestEmbedding(1)
    );

    const { thread } = await createTestThread(
      supaService,
      workerId,
      space.id,
      authenticatedUserId
    );

    // Setup mock SSE response (no OpenAI credits consumed)
    await mockSSE(
      createMockSSEResponse(
        'Based on the documents, the key insights include risk management strategies, compliance frameworks, and operational best practices.',
        0
      )
    );

    // Navigate to thread page
    await authenticatedPage.goto(`/threads/${thread.id}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Send query
    const query = 'What are the key insights in our documents?';
    await authenticatedPage.fill('[data-testid="thread-input-editor"]', query);
    await authenticatedPage.click('[data-testid="send-button"]');

    // Collect mocked SSE events
    const events = await collectSSEEvents(
      authenticatedPage,
      thread.id,
      query,
      30000 // 30s timeout
    );

    // Verify: SSE stream has expected events
    verifySSEStream(events);

    // Verify: We received token events (AI response)
    const tokenEvents = events.filter((e) => e.type === 'token');
    expect(tokenEvents.length).toBeGreaterThan(0);

    // Verify: AI response appears in UI
    await expect(authenticatedPage.getByTestId('ai-response')).toBeVisible({
      timeout: 35000,
    });

    // Extract and verify full response
    const fullResponse = extractAIResponse(events);
    expect(fullResponse.length).toBeGreaterThan(0);
    expect(typeof fullResponse).toBe('string');
  });

  test('should include citations from vector search', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
    mockSSE,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup: Create environment with multiple documents
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const space = await createTestSpace(
      supaService,
      workerId,
      org.id,
      authenticatedUserId
    );

    // Create 3 documents with embeddings
    const documentCount = 3;
    for (let i = 0; i < documentCount; i++) {
      const doc = await createTestDocument(
        supaService,
        workerId + i,
        space.id,
        authenticatedUserId
      );

      // Add chunks with embeddings
      await createTestDocumentChunk(
        supaService,
        doc.id,
        0,
        generateTestEmbedding(i)
      );
    }

    const { thread } = await createTestThread(
      supaService,
      workerId,
      space.id,
      authenticatedUserId
    );

    // Setup mock SSE response with citations (no OpenAI credits consumed)
    await mockSSE(
      createMockSSEResponse(
        'Based on the documents, here are the key points: 1) Risk management is critical. 2) Compliance frameworks must be established. 3) Operational efficiency drives success.',
        3 // 3 mock citations
      )
    );

    // Navigate to thread
    await authenticatedPage.goto(`/threads/${thread.id}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Send query
    const query = 'Summarize the key points from the documents';
    await authenticatedPage.fill('[data-testid="thread-input-editor"]', query);
    await authenticatedPage.click('[data-testid="send-button"]');

    // Collect mocked SSE events
    const events = await collectSSEEvents(
      authenticatedPage,
      thread.id,
      query,
      30000
    );

    // Verify: Citations included in stream
    const citations = extractCitations(events);
    expect(citations.length).toBeGreaterThan(0);

    // Verify: Citations have required fields
    citations.forEach((citation) => {
      expect(citation.document_id).toBeDefined();
      expect(citation.chunk_id).toBeDefined();
      expect(citation.score).toBeGreaterThanOrEqual(0);
      expect(citation.score).toBeLessThanOrEqual(1);
    });

    // Verify: Citation badges appear in UI
    await expect(
      authenticatedPage.getByTestId('citation-badge').first()
    ).toBeVisible({ timeout: 35000 });
  });

  test('should handle streaming errors gracefully', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const space = await createTestSpace(
      supaService,
      workerId,
      org.id,
      authenticatedUserId
    );

    const { thread } = await createTestThread(
      supaService,
      workerId,
      space.id,
      authenticatedUserId
    );

    // Navigate to thread
    await authenticatedPage.goto(`/threads/${thread.id}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Send empty query (should trigger error)
    await authenticatedPage.fill('[data-testid="thread-input-editor"]', '');
    await authenticatedPage.click('[data-testid="send-button"]');

    // Verify: Error message appears in UI
    await expect(
      authenticatedPage.getByText(/error|failed|invalid/i)
    ).toBeVisible({ timeout: 10000 });

    // Verify: User can still interact with thread after error
    await authenticatedPage.fill(
      '[data-testid="thread-input-editor"]',
      'Valid query'
    );
    await expect(authenticatedPage.getByTestId('send-button')).toBeEnabled();
  });

  test('should verify streaming performance', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
    mockSSE,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const space = await createTestSpace(
      supaService,
      workerId,
      org.id,
      authenticatedUserId
    );

    const doc = await createTestDocument(
      supaService,
      workerId,
      space.id,
      authenticatedUserId
    );

    await createTestDocumentChunk(
      supaService,
      doc.id,
      0,
      generateTestEmbedding(1)
    );

    const { thread } = await createTestThread(
      supaService,
      workerId,
      space.id,
      authenticatedUserId
    );

    // Setup mock SSE response (no OpenAI credits consumed)
    await mockSSE(
      createMockSSEResponse(
        'Brief summary: The document covers risk management and compliance.',
        0
      )
    );

    // Navigate to thread
    await authenticatedPage.goto(`/threads/${thread.id}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Send query
    const query = 'Brief summary of the document';
    await authenticatedPage.fill('[data-testid="thread-input-editor"]', query);
    await authenticatedPage.click('[data-testid="send-button"]');

    // Collect mocked events
    const events = await collectSSEEvents(
      authenticatedPage,
      thread.id,
      query,
      30000
    );

    // Verify performance metrics
    const performance = verifySSEPerformance(events, 30000);

    expect(performance.valid).toBe(true);
    expect(performance.duration).toBeLessThan(30000);
    expect(performance.tokenCount).toBeGreaterThan(0);
    expect(performance.tokensPerSecond).toBeGreaterThan(0);

    // Log performance for monitoring
    console.log(
      `Stream performance: ${performance.tokenCount} tokens in ${performance.duration}ms (${performance.tokensPerSecond.toFixed(2)} tokens/sec)`
    );
  });

  test('should support multiple concurrent threads', async ({
    authenticatedPage,
    authenticatedUserId,
    supaService,
    mockSSE,
  }, testInfo) => {
    const workerId = testInfo.parallelIndex;

    // Setup
    const org = await createTestOrganization(
      supaService,
      workerId,
      authenticatedUserId
    );

    const space = await createTestSpace(
      supaService,
      workerId,
      org.id,
      authenticatedUserId
    );

    // Create multiple threads
    const threadCount = 2;
    const threads = [];

    for (let i = 0; i < threadCount; i++) {
      const { thread } = await createTestThread(
        supaService,
        workerId + i,
        space.id,
        authenticatedUserId
      );
      threads.push(thread);
    }

    // Setup mock SSE responses (no OpenAI credits consumed)
    await mockSSE(
      createMockSSEResponse('Response to Query 1 from thread 1.', 0)
    );

    // Navigate to first thread and send query
    await authenticatedPage.goto(`/threads/${threads[0].id}`);
    await authenticatedPage.waitForLoadState('networkidle');
    await authenticatedPage.fill(
      '[data-testid="thread-input-editor"]',
      'Query 1'
    );
    await authenticatedPage.click('[data-testid="send-button"]');

    // Wait for response to start
    await expect(authenticatedPage.getByTestId('ai-response')).toBeVisible({
      timeout: 10000,
    });

    // Navigate to second thread (first should persist)
    await authenticatedPage.goto(`/threads/${threads[1].id}`);
    await authenticatedPage.waitForLoadState('networkidle');
    await authenticatedPage.fill(
      '[data-testid="thread-input-editor"]',
      'Query 2'
    );
    await authenticatedPage.click('[data-testid="send-button"]');

    // Verify: Second thread response appears
    await expect(authenticatedPage.getByTestId('ai-response')).toBeVisible({
      timeout: 10000,
    });

    // Navigate back to first thread
    await authenticatedPage.goto(`/threads/${threads[0].id}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify: First thread's response is still visible
    await expect(authenticatedPage.getByTestId('ai-response')).toBeVisible();
  });
});
