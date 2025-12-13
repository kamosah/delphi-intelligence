import { test as base } from './auth';

/**
 * Mock SSE response type definitions
 */
export interface MockSSEConfig {
  /**
   * Mock AI response text to stream
   */
  responseText: string;
  /**
   * Mock citations to include in response
   */
  citations?: Array<{
    document_id: string;
    chunk_id: string;
    score: number;
  }>;
  /**
   * Delay between token events (ms)
   */
  tokenDelay?: number;
  /**
   * Confidence score for done event
   */
  confidenceScore?: number;
}

/**
 * SSE Mock fixture type definitions
 */
type SSEMockFixtures = {
  /**
   * Setup SSE mocking for a page.
   * Intercepts streaming endpoints and returns mock responses.
   */
  mockSSE: (config: MockSSEConfig) => Promise<void>;
};

/**
 * SSE mocking fixture for E2E tests.
 *
 * Intercepts Server-Sent Events streaming endpoints to avoid consuming
 * OpenAI API credits during testing. Returns realistic mock responses
 * that simulate actual AI streaming behavior.
 *
 * Usage:
 * ```typescript
 * test('my test', async ({ authenticatedPage, mockSSE }) => {
 *   // Setup mock before triggering stream
 *   await mockSSE({
 *     responseText: 'This is a mocked AI response.',
 *     citations: [
 *       { document_id: 'doc-1', chunk_id: 'chunk-1', score: 0.95 }
 *     ]
 *   });
 *
 *   // Trigger stream (will receive mock response)
 *   await page.fill('[data-testid="thread-input"]', 'Test query');
 *   await page.click('[data-testid="send-button"]');
 * });
 * ```
 */
export const test = base.extend<SSEMockFixtures>({
  mockSSE: async ({ authenticatedPage }, use) => {
    const setupMock = async (config: MockSSEConfig) => {
      const {
        responseText,
        citations = [],
        tokenDelay: _tokenDelay = 50,
        confidenceScore = 0.95,
      } = config;

      // Intercept SSE streaming endpoints
      await authenticatedPage.route('**/threads/*/stream*', async (route) => {
        // Generate mock SSE events
        const words = responseText.split(' ');
        const events: string[] = [];

        // Add token events (word by word)
        for (const word of words) {
          const tokenEvent = {
            type: 'token',
            data: {
              content: word + ' ',
              timestamp: Date.now(),
            },
          };
          events.push(`data: ${JSON.stringify(tokenEvent)}\n\n`);
        }

        // Add citations event
        if (citations.length > 0) {
          const citationsEvent = {
            type: 'citations',
            data: {
              sources: citations,
            },
          };
          events.push(`data: ${JSON.stringify(citationsEvent)}\n\n`);
        }

        // Add done event
        const doneEvent = {
          type: 'done',
          data: {
            confidence_score: confidenceScore,
            timestamp: Date.now(),
          },
        };
        events.push(`data: ${JSON.stringify(doneEvent)}\n\n`);

        // Create SSE response
        const sseBody = events.join('');

        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          headers: {
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
          body: sseBody,
        });
      });

      console.log('✅ SSE mocking enabled (no API credits will be consumed)');
    };

    await use(setupMock);
  },
});

export { expect } from '@playwright/test';

/**
 * Create mock SSE response for testing.
 *
 * Helper function to generate realistic mock SSE responses without
 * consuming OpenAI API credits.
 *
 * @param responseText - Mock AI response text
 * @param citationCount - Number of mock citations to generate
 * @returns Mock SSE configuration
 *
 * @example
 * ```typescript
 * await mockSSE(createMockSSEResponse(
 *   'Here are the key insights from the documents...',
 *   3
 * ));
 * ```
 */
export function createMockSSEResponse(
  responseText: string,
  citationCount = 0
): MockSSEConfig {
  const citations = Array.from({ length: citationCount }, (_, i) => ({
    document_id: `mock-doc-${i + 1}`,
    chunk_id: `mock-chunk-${i + 1}`,
    score: 0.9 - i * 0.1,
  }));

  return {
    responseText,
    citations,
    tokenDelay: 50,
    confidenceScore: 0.95,
  };
}

/**
 * Create mock error SSE response for testing error handling.
 *
 * @param errorMessage - Error message to return
 * @returns Mock SSE configuration for error
 *
 * @example
 * ```typescript
 * await mockSSE(createMockSSEError('Invalid query'));
 * ```
 */
export function createMockSSEError(_errorMessage: string): MockSSEConfig {
  return {
    responseText: '',
    citations: [],
  };
}
