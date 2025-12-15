import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * SSE (Server-Sent Events) testing utilities.
 *
 * Helpers for testing real-time AI streaming responses in E2E tests.
 */

/**
 * Window augmentation for SSE testing properties
 */
declare global {
  interface Window {
    __sseEvents?: SSEEvent[];
    __lastSSEEvent?: SSEEvent;
    __eventSource?: EventSource;
    __collectSSEEvent?: (event: SSEEvent) => void;
  }
}

/**
 * SSE event type definitions
 */
export interface SSEEvent {
  type: string;
  data: unknown;
}

export interface TokenEvent extends SSEEvent {
  type: 'token';
  data: {
    content: string;
    timestamp: number;
  };
}

export interface CitationsEvent extends SSEEvent {
  type: 'citations';
  data: {
    sources: Array<{
      document_id: string;
      chunk_id: string;
      score: number;
    }>;
  };
}

export interface DoneEvent extends SSEEvent {
  type: 'done';
  data: {
    confidence_score?: number;
    timestamp: number;
  };
}

export interface ErrorEvent extends SSEEvent {
  type: 'error';
  data: {
    message: string;
    code?: string;
  };
}

/**
 * Collect SSE events from a streaming endpoint.
 *
 * Listens for SSE events in the page context and collects them.
 * Waits for 'done' event or timeout.
 *
 * @param page - Playwright page
 * @param threadId - Thread ID for the SSE stream
 * @param query - User query to send
 * @param timeout - Max wait time in milliseconds (default: 30000)
 * @returns Array of collected SSE events
 *
 * @example
 * ```typescript
 * const events = await collectSSEEvents(
 *   page,
 *   'thread-123',
 *   'What are the key insights?',
 *   30000
 * );
 * expect(events.length).toBeGreaterThan(0);
 * ```
 */
export async function collectSSEEvents(
  page: Page,
  threadId: string,
  query: string,
  timeout = 30000
): Promise<SSEEvent[]> {
  const events: SSEEvent[] = [];

  // Setup event collection in page context
  await page.evaluate(() => {
    window.__sseEvents = [];
  });

  // Expose function to collect events
  await page.exposeFunction('__collectSSEEvent', (event: SSEEvent) => {
    events.push(event);
  });

  // Inject EventSource listener in page context
  await page.evaluate(
    ({ threadId, query }) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const url = `${apiUrl}/threads/${threadId}/stream?query=${encodeURIComponent(query)}`;

      const eventSource = new EventSource(url, {
        withCredentials: true,
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          window.__collectSSEEvent?.(data);

          // Store in window for waitForFunction
          window.__sseEvents?.push(data);

          // Store last event
          window.__lastSSEEvent = data;
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        eventSource.close();

        // Store error event
        const errorEvent = {
          type: 'error',
          data: { message: 'Connection error' },
        };
        window.__collectSSEEvent?.(errorEvent);
        window.__lastSSEEvent = errorEvent;
      };

      // Store eventSource for cleanup
      window.__eventSource = eventSource;
    },
    { threadId, query }
  );

  // Wait for 'done' event or timeout
  try {
    await page.waitForFunction(
      () => {
        const lastEvent = window.__lastSSEEvent;
        return (
          lastEvent && (lastEvent.type === 'done' || lastEvent.type === 'error')
        );
      },
      { timeout }
    );
  } catch (_error) {
    console.error('Timeout waiting for SSE stream to complete');
  }

  // Cleanup EventSource
  await page.evaluate(() => {
    const eventSource = window.__eventSource;
    if (eventSource) {
      eventSource.close();
    }
  });

  return events;
}

/**
 * Verify SSE stream contains expected event types.
 *
 * Validates that the stream includes the expected event sequence:
 * - At least one 'token' event (AI response)
 * - Optional 'citations' event (document sources)
 * - 'done' event (stream completion)
 * - No 'error' events
 *
 * @param events - Array of SSE events
 * @returns True if stream is valid
 *
 * @example
 * ```typescript
 * const events = await collectSSEEvents(page, threadId, query);
 * verifySSEStream(events);
 * // Throws if stream is invalid
 * ```
 */
export function verifySSEStream(events: SSEEvent[]): boolean {
  const eventTypes = events.map((e) => e.type);

  // Verify we have events
  expect(events.length).toBeGreaterThan(0);

  // Verify expected event types
  expect(eventTypes).toContain('token'); // AI generated tokens
  expect(eventTypes[eventTypes.length - 1]).toBe('done'); // Stream completed

  // Verify no errors
  const errors = events.filter((e) => e.type === 'error');
  expect(errors).toHaveLength(0);

  return true;
}

/**
 * Extract full AI response from token events.
 *
 * Concatenates all token events into the complete AI response text.
 *
 * @param events - Array of SSE events
 * @returns Complete AI response text
 *
 * @example
 * ```typescript
 * const events = await collectSSEEvents(page, threadId, query);
 * const response = extractAIResponse(events);
 * expect(response).toContain('key insights');
 * ```
 */
export function extractAIResponse(events: SSEEvent[]): string {
  const tokenEvents = events.filter((e) => e.type === 'token') as TokenEvent[];

  return tokenEvents.map((e) => e.data.content).join('');
}

/**
 * Extract citations from SSE stream.
 *
 * Returns array of citation sources from the stream.
 *
 * @param events - Array of SSE events
 * @returns Array of citation sources
 *
 * @example
 * ```typescript
 * const events = await collectSSEEvents(page, threadId, query);
 * const citations = extractCitations(events);
 * expect(citations.length).toBeGreaterThan(0);
 * ```
 */
export function extractCitations(
  events: SSEEvent[]
): Array<{ document_id: string; chunk_id: string; score: number }> {
  const citationEvents = events.filter(
    (e) => e.type === 'citations'
  ) as CitationsEvent[];

  if (citationEvents.length === 0) {
    return [];
  }

  // Return sources from first citation event
  return citationEvents[0].data.sources || [];
}

/**
 * Wait for specific SSE event type.
 *
 * Waits for a specific event type to appear in the stream.
 *
 * @param page - Playwright page
 * @param eventType - Event type to wait for ('token', 'citations', 'done', etc.)
 * @param timeout - Max wait time in milliseconds (default: 10000)
 * @returns True if event found
 *
 * @example
 * ```typescript
 * await waitForSSEEvent(page, 'citations', 10000);
 * // Page now has received at least one citations event
 * ```
 */
export async function waitForSSEEvent(
  page: Page,
  eventType: string,
  timeout = 10000
): Promise<boolean> {
  await page.waitForFunction(
    ({ eventType }) => {
      const events = window.__sseEvents || [];
      return events.some((e: SSEEvent) => e.type === eventType);
    },
    { eventType },
    { timeout }
  );

  return true;
}

/**
 * Verify SSE stream performance.
 *
 * Checks that the stream completes within acceptable time limits
 * and has reasonable token throughput.
 *
 * @param events - Array of SSE events
 * @param maxDuration - Max allowed duration in milliseconds (default: 30000)
 * @returns Performance metrics
 *
 * @example
 * ```typescript
 * const events = await collectSSEEvents(page, threadId, query);
 * const perf = verifySSEPerformance(events);
 * expect(perf.duration).toBeLessThan(30000);
 * ```
 */
export function verifySSEPerformance(
  events: SSEEvent[],
  maxDuration = 30000
): {
  duration: number;
  tokenCount: number;
  tokensPerSecond: number;
  valid: boolean;
} {
  const tokenEvents = events.filter((e) => e.type === 'token') as TokenEvent[];

  if (tokenEvents.length === 0) {
    throw new Error('No token events found in stream');
  }

  // Calculate duration from first to last token
  const firstTimestamp = tokenEvents[0].data.timestamp;
  const lastTimestamp = tokenEvents[tokenEvents.length - 1].data.timestamp;
  const duration = lastTimestamp - firstTimestamp;

  // Calculate throughput
  const tokenCount = tokenEvents.length;
  const tokensPerSecond = (tokenCount / duration) * 1000;

  // Verify performance
  const valid = duration <= maxDuration;

  expect(duration).toBeLessThanOrEqual(maxDuration);

  return {
    duration,
    tokenCount,
    tokensPerSecond,
    valid,
  };
}

/**
 * Monitor SSE connection health.
 *
 * Checks that the SSE connection is active and receiving events.
 *
 * @param page - Playwright page
 * @param timeout - Max wait time in milliseconds (default: 5000)
 * @returns True if connection is healthy
 *
 * @example
 * ```typescript
 * const isHealthy = await monitorSSEHealth(page);
 * expect(isHealthy).toBe(true);
 * ```
 */
export async function monitorSSEHealth(
  page: Page,
  timeout = 5000
): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const eventSource = window.__eventSource;
        return eventSource && eventSource.readyState === EventSource.OPEN;
      },
      { timeout }
    );

    return true;
  } catch {
    return false;
  }
}

/**
 * Cleanup SSE connections.
 *
 * Closes any active EventSource connections in the page.
 *
 * @param page - Playwright page
 *
 * @example
 * ```typescript
 * await cleanupSSE(page);
 * // All EventSource connections closed
 * ```
 */
export async function cleanupSSE(page: Page): Promise<void> {
  await page.evaluate(() => {
    const eventSource = window.__eventSource;
    if (eventSource) {
      eventSource.close();
    }

    // Clear stored events
    delete window.__sseEvents;
    delete window.__lastSSEEvent;
    delete window.__eventSource;
  });
}
