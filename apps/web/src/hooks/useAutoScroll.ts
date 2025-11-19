import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutoScrollOptions {
  /**
   * Whether streaming is currently active
   */
  isStreaming: boolean;
  /**
   * The response content that triggers auto-scroll updates
   */
  response?: string;
  /**
   * Number of messages in the conversation (for initial scroll)
   */
  messageCount: number;
  /**
   * Auto-hide delay in milliseconds (default: 4000ms)
   */
  autoHideDelay?: number;
  /**
   * Scroll threshold in pixels from bottom to show button (default: 100px)
   */
  scrollThreshold?: number;
}

interface UseAutoScrollReturn {
  /**
   * Ref to attach to ScrollArea component
   */
  scrollAreaRef: (node: HTMLDivElement | null) => void;
  /**
   * Whether to show the scroll-to-bottom button
   */
  showScrollButton: boolean;
  /**
   * Whether the button is currently hovered
   */
  isButtonHovered: boolean;
  /**
   * Handler for scroll-to-bottom button click
   */
  handleScrollToBottom: () => void;
  /**
   * Handler for button mouse enter
   */
  handleButtonMouseEnter: () => void;
  /**
   * Handler for button mouse leave
   */
  handleButtonMouseLeave: () => void;
}

const DEFAULT_AUTO_HIDE_DELAY = 4000; // 4 seconds
const DEFAULT_SCROLL_THRESHOLD = 100; // pixels from bottom

/**
 * Custom hook for managing auto-scroll behavior in scrollable containers
 *
 * Features:
 * - Auto-scrolls to bottom on initial load and during streaming
 * - User scroll override to disengage auto-scroll
 * - Scroll-to-bottom button that appears when scrolled up
 * - Auto-hide timer with hover prevention
 *
 * @example
 * ```tsx
 * const {
 *   scrollAreaRef,
 *   showScrollButton,
 *   isButtonHovered,
 *   handleScrollToBottom,
 *   handleButtonMouseEnter,
 *   handleButtonMouseLeave
 * } = useAutoScroll({
 *   isStreaming,
 *   response,
 *   messageCount: messages.length
 * });
 *
 * return (
 *   <ScrollArea ref={scrollAreaRef}>
 *     {messages.map(...)}
 *     {showScrollButton && (
 *       <Button onClick={handleScrollToBottom} onMouseEnter={handleButtonMouseEnter} />
 *     )}
 *   </ScrollArea>
 * );
 * ```
 */
export function useAutoScroll({
  isStreaming,
  response,
  messageCount,
  autoHideDelay = DEFAULT_AUTO_HIDE_DELAY,
  scrollThreshold = DEFAULT_SCROLL_THRESHOLD,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll helper functions
  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const startHideTimer = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (!isButtonHovered) {
        setShowScrollButton(false);
      }
    }, autoHideDelay);
  }, [clearHideTimer, isButtonHovered, autoHideDelay]);

  const scrollToBottom = useCallback(
    (options: { behavior?: 'smooth' | 'auto' } = { behavior: 'smooth' }) => {
      const viewport = scrollViewportRef.current;
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: options.behavior,
        });
      }
    },
    []
  );

  const checkScrollPosition = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < scrollThreshold;

    if (!isNearBottom) {
      setShowScrollButton(true);
      startHideTimer();
    } else {
      setShowScrollButton(false);
      clearHideTimer();
    }

    // Disengage auto-scroll if user scrolls up during streaming
    if (!isNearBottom && isStreaming) {
      setIsAutoScrollEnabled(false);
    }
  }, [isStreaming, startHideTimer, clearHideTimer, scrollThreshold]);

  // Callback ref to capture the ScrollArea Root and find its Viewport
  const scrollAreaRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        // Find the actual scrollable viewport inside ScrollArea
        // ScrollArea forwards ref to Root, but we need Viewport for scroll events
        const viewport = node.querySelector(
          '[data-radix-scroll-area-viewport]'
        ) as HTMLDivElement;

        if (viewport) {
          scrollViewportRef.current = viewport;
          // Attach scroll listener to the viewport
          viewport.addEventListener('scroll', checkScrollPosition);
        }
      }
      return () => {
        // Cleanup scroll listener on unmount
        if (scrollViewportRef.current) {
          scrollViewportRef.current.removeEventListener(
            'scroll',
            checkScrollPosition
          );
        }
      };
    },
    [checkScrollPosition]
  );

  // Auto-scroll to bottom on initial load or when conversation loads
  useEffect(() => {
    const hasMessages = messageCount > 0;
    if (hasMessages && scrollViewportRef.current) {
      // Scroll to bottom immediately on load (no animation)
      scrollToBottom({ behavior: 'auto' });
    }
  }, [messageCount, scrollToBottom]);

  // Auto-scroll during streaming (when enabled)
  // Use requestAnimationFrame to smooth out scroll updates during token streaming
  useEffect(() => {
    if (isAutoScrollEnabled && isStreaming && response) {
      // Use requestAnimationFrame for smoother scrolling during rapid updates
      const rafId = requestAnimationFrame(() => {
        scrollToBottom({ behavior: 'auto' }); // Use 'auto' instead of 'smooth' to prevent janky animations
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [response, isAutoScrollEnabled, isStreaming, scrollToBottom]);

  // Re-enable auto-scroll when new streaming starts
  useEffect(() => {
    if (isStreaming) {
      setIsAutoScrollEnabled(true);
    }
  }, [isStreaming]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearHideTimer();
  }, [clearHideTimer]);

  // Button event handlers
  const handleScrollToBottom = useCallback(() => {
    scrollToBottom({ behavior: 'smooth' });
    setIsAutoScrollEnabled(true); // Re-engage auto-scroll
    // Don't hide button here - let it hide naturally when scroll completes and we reach bottom
    clearHideTimer();
  }, [scrollToBottom, clearHideTimer]);

  const handleButtonMouseEnter = useCallback(() => {
    setIsButtonHovered(true);
    clearHideTimer();
  }, [clearHideTimer]);

  const handleButtonMouseLeave = useCallback(() => {
    setIsButtonHovered(false);
    startHideTimer();
  }, [startHideTimer]);

  return {
    scrollAreaRef,
    showScrollButton,
    isButtonHovered,
    handleScrollToBottom,
    handleButtonMouseEnter,
    handleButtonMouseLeave,
  };
}
