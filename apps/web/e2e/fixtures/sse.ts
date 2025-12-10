import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * SSE (Server-Sent Events) testing fixtures for Olympus
 *
 * Provides utilities for testing AI response streaming via EventSource.
 * Olympus uses SSE for real-time AI responses in Threads.
 */

interface SSEFixtures {
  sseClient: SSETestClient;
}

/**
 * SSE event types from Olympus streaming API
 */
export type SSEEventType = 'token' | 'citations' | 'done' | 'error';

/**
 * SSE event structure
 */
export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: number;
}

/**
 * Serializable SSE Event for page.evaluate context
 */
interface SerializableSSEEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * Citation source structure from SSE events
 */
export interface CitationSource {
  document_id: string;
  chunk_id?: string;
  relevance_score?: number;
  [key: string]: unknown;
}

/**
 * SSE Test Client - Test EventSource streaming in browser context
 *
 * Features:
 * - Connect to SSE streams
 * - Collect and verify events
 * - Extract tokens and citations
 * - Timeout and error handling
 */
export class SSETestClient {
  constructor(private page: Page) {}

  /**
   * Connect to SSE stream and collect all events
   *
   * Runs EventSource in the browser context to properly simulate client behavior.
   * Collects all events until 'done' event or timeout.
   *
   * @param url - SSE endpoint URL
   * @param timeout - Maximum time to wait (default: 30 seconds)
   * @returns Array of collected SSE events
   *
   * @example
   * ```typescript
   * const events = await sseClient.connectAndCollectEvents(
   *   'http://localhost:8000/api/thread/stream?query=test&space_id=123',
   *   30000
   * );
   * ```
   */
  async connectAndCollectEvents(
    url: string,
    timeout = 30000
  ): Promise<SSEEvent[]> {
    console.log(`🌊 Connecting to SSE stream: ${url}`);

    const serializedEvents = await this.page.evaluate(
      async ({ url, timeout }) => {
        return new Promise<SerializableSSEEvent[]>((resolve, reject) => {
          const events: SerializableSSEEvent[] = [];
          let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
          const eventSource = new EventSource(url);

          const messageHandler = (event: Event) => {
            const messageEvent = event as MessageEvent;
            try {
              const data = JSON.parse(messageEvent.data);
              events.push({
                type: data.type,
                data,
                timestamp: Date.now(),
              });

              console.log(`📨 SSE Event: ${data.type}`, data);

              // Stop on done event
              if (data.type === 'done') {
                eventSource.close();
                clearTimeout(timeoutId);
                console.log('✅ SSE stream completed');
                resolve(events);
              }
            } catch (error) {
              console.error('❌ SSE parse error:', error);
            }
          };

          const errorHandler = (error: Event) => {
            console.warn('⚠️ SSE connection error:', error);
            eventSource.close();
            clearTimeout(timeoutId);
            // Return events collected before error
            resolve(events);
          };

          eventSource.onmessage = messageHandler;
          eventSource.onerror = errorHandler;

          // Timeout protection
          timeoutId = setTimeout(() => {
            eventSource.close();
            console.warn(`⏱️ SSE stream timeout after ${timeout}ms`);
            reject(new Error(`SSE stream timeout after ${timeout}ms`));
          }, timeout);
        });
      },
      { url, timeout }
    );

    // Convert serialized events to SSEEvent[]
    return serializedEvents.map((e) => ({
      type: e.type as SSEEventType,
      data: e.data,
      timestamp: e.timestamp,
    }));
  }

  /**
   * Extract text tokens from streaming response
   *
   * Concatenates all 'token' events into full response text.
   *
   * @param events - Array of SSE events
   * @returns Complete response text
   *
   * @example
   * ```typescript
   * const events = await sseClient.connectAndCollectEvents(url);
   * const fullResponse = sseClient.extractTokens(events);
   * console.log('AI Response:', fullResponse);
   * ```
   */
  extractTokens(events: SSEEvent[]): string {
    return events
      .filter((e) => e.type === 'token')
      .map((e) => {
        const data = e.data as { content?: string };
        return data.content || '';
      })
      .join('');
  }

  /**
   * Find citations in stream
   *
   * Extracts document sources from 'citations' events.
   *
   * @param events - Array of SSE events
   * @returns Array of citation sources
   *
   * @example
   * ```typescript
   * const citations = sseClient.findCitations(events);
   * expect(citations.length).toBeGreaterThan(0);
   * expect(citations[0]).toHaveProperty('document_id');
   * ```
   */
  findCitations(events: SSEEvent[]): CitationSource[] {
    const citationEvents = events.filter((e) => e.type === 'citations');
    return citationEvents.flatMap((e) => {
      const data = e.data as { sources?: CitationSource[] };
      return data.sources || [];
    });
  }

  /**
   * Find error events in stream
   *
   * @param events - Array of SSE events
   * @returns Array of error events
   */
  findErrors(events: SSEEvent[]): SSEEvent[] {
    return events.filter((e) => e.type === 'error');
  }

  /**
   * Find done event in stream
   *
   * @param events - Array of SSE events
   * @returns Done event or undefined
   */
  findDoneEvent(events: SSEEvent[]): SSEEvent | undefined {
    return events.find((e) => e.type === 'done');
  }

  /**
   * Verify event sequence matches expected types
   *
   * Useful for asserting the correct order of events in streaming.
   *
   * @param events - Array of SSE events
   * @param expectedTypes - Expected sequence of event types
   *
   * @example
   * ```typescript
   * sseClient.verifyEventSequence(events, [
   *   'token', 'token', 'token', 'citations', 'done'
   * ]);
   * ```
   */
  verifyEventSequence(events: SSEEvent[], expectedTypes: SSEEventType[]) {
    const actualTypes = events.map((e) => e.type);
    expect(actualTypes).toEqual(expectedTypes);
  }

  /**
   * Verify streaming completed successfully
   *
   * Checks for:
   * - At least one token event
   * - Citations present
   * - Done event with confidence score
   *
   * @param events - Array of SSE events
   * @throws AssertionError if validation fails
   */
  verifySuccessfulStream(events: SSEEvent[]) {
    // Check for tokens
    const tokens = events.filter((e) => e.type === 'token');
    expect(tokens.length, 'Expected at least one token event').toBeGreaterThan(
      0
    );

    // Check for citations (optional but expected)
    const citations = this.findCitations(events);
    console.log(`📚 Found ${citations.length} citations`);

    // Check for done event
    const doneEvent = this.findDoneEvent(events);
    expect(doneEvent, 'Expected done event').toBeDefined();
    const doneData = doneEvent!.data as { confidence_score?: number };
    expect(
      doneData.confidence_score,
      'Expected confidence score'
    ).toBeDefined();

    console.log(
      `✅ Stream verification passed:\n` +
        `- Tokens: ${tokens.length}\n` +
        `- Citations: ${citations.length}\n` +
        `- Confidence: ${doneData.confidence_score}`
    );
  }

  /**
   * Count events by type
   *
   * @param events - Array of SSE events
   * @returns Map of event type to count
   */
  countEventsByType(events: SSEEvent[]): Map<SSEEventType, number> {
    const counts = new Map<SSEEventType, number>();

    for (const event of events) {
      counts.set(event.type, (counts.get(event.type) || 0) + 1);
    }

    return counts;
  }

  /**
   * Get streaming duration
   *
   * Calculates time from first to last event.
   *
   * @param events - Array of SSE events
   * @returns Duration in milliseconds
   */
  getStreamDuration(events: SSEEvent[]): number {
    if (events.length === 0) return 0;

    const firstTimestamp = events[0].timestamp;
    const lastTimestamp = events[events.length - 1].timestamp;

    return lastTimestamp - firstTimestamp;
  }

  /**
   * Test SSE stream with assertions
   *
   * Convenience method that connects, collects, and runs assertions.
   *
   * @param url - SSE endpoint URL
   * @param assertions - Function to run assertions on events
   * @returns Collected events
   *
   * @example
   * ```typescript
   * const events = await sseClient.streamAndAssert(
   *   streamUrl,
   *   (events) => {
   *     expect(events.length).toBeGreaterThan(0);
   *     const fullResponse = sseClient.extractTokens(events);
   *     expect(fullResponse).toContain('risk');
   *   }
   * );
   * ```
   */
  async streamAndAssert(
    url: string,
    assertions: (events: SSEEvent[]) => void,
    timeout = 30000
  ): Promise<SSEEvent[]> {
    const events = await this.connectAndCollectEvents(url, timeout);
    assertions(events);
    return events;
  }

  /**
   * Wait for SSE connection to start in the page
   *
   * Monitors the page for EventSource creation.
   * Useful for verifying that UI properly initiates streaming.
   *
   * @param timeout - Maximum time to wait (default: 10 seconds)
   * @returns EventSource URL
   *
   * @example
   * ```typescript
   * // Click submit button
   * await page.click('button[type="submit"]');
   *
   * // Verify EventSource was created
   * const streamUrl = await sseClient.waitForStreamStart();
   * expect(streamUrl).toContain('/api/thread/stream');
   * ```
   */
  async waitForStreamStart(timeout = 10000): Promise<string> {
    console.log('⏳ Waiting for SSE stream to start...');

    return await this.page.evaluate(
      ({ timeout }) => {
        return new Promise<string>((resolve, reject) => {
          const originalEventSource = window.EventSource;
          let streamUrl: string | null = null;

          // Intercept EventSource constructor
          (window as Window & { EventSource: typeof EventSource }).EventSource =
            class extends originalEventSource {
              constructor(
                url: string | URL,
                eventSourceInitDict?: EventSourceInit
              ) {
                super(url, eventSourceInitDict);
                const urlString =
                  typeof url === 'string' ? url : url.toString();
                streamUrl = urlString;
                console.log('🌊 EventSource created:', urlString);
                resolve(urlString);
              }
            };

          // Timeout protection
          setTimeout(() => {
            if (!streamUrl) {
              reject(new Error(`No SSE stream started after ${timeout}ms`));
            }
          }, timeout);
        });
      },
      { timeout }
    );
  }

  /**
   * Mock SSE responses for testing without backend
   *
   * Useful for testing UI behavior with controlled SSE data.
   *
   * @param mockEvents - Array of mock SSE events to emit
   *
   * @example
   * ```typescript
   * await sseClient.mockSSEStream([
   *   { type: 'token', data: { content: 'Hello' } },
   *   { type: 'token', data: { content: ' world' } },
   *   { type: 'citations', data: { sources: [...] } },
   *   { type: 'done', data: { confidence_score: 0.95 } },
   * ]);
   * ```
   */
  async mockSSEStream(
    mockEvents: Array<{ type: string; data: Record<string, unknown> }>
  ) {
    await this.page.route('**/api/thread/stream**', async (route) => {
      console.log('🎭 Mocking SSE stream');

      // Create SSE response with mock events
      const sseData = mockEvents
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join('');

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseData,
      });
    });
  }
}

/**
 * SSE fixture export
 *
 * Use in tests:
 * ```typescript
 * import { test, expect } from '../fixtures/sse';
 *
 * test('should stream AI response', async ({ page, sseClient }) => {
 *   const events = await sseClient.connectAndCollectEvents(streamUrl);
 *   sseClient.verifySuccessfulStream(events);
 * });
 * ```
 */
export const test = base.extend<SSEFixtures>({
  sseClient: async ({ page }, use) => {
    const client = new SSETestClient(page);
    await use(client);
  },
});

export { expect };
