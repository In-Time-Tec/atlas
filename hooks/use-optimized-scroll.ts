import { useEffect, useRef, useCallback, useState } from 'react';

interface UseOptimizedScrollOptions {
  enabled?: boolean;
  threshold?: number;
  behavior?: ScrollBehavior;
  debounceMs?: number;
  containerRef?: React.RefObject<HTMLElement | null>;
}

export function useOptimizedScroll(
  targetRef: React.RefObject<HTMLElement | null>,
  options: UseOptimizedScrollOptions = {},
) {
  const { enabled = true, threshold = 100, behavior = 'smooth', debounceMs = 50, containerRef } = options;

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasManuallyScrolled, setHasManuallyScrolled] = useState(false);
  const isAutoScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPositionRef = useRef(0);

  // Check if scrolled to bottom
  const checkIfAtBottom = useCallback(
    (container: HTMLElement) => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      const atBottom = scrollHeight - (scrollTop + clientHeight) < threshold;
      return atBottom;
    },
    [threshold],
  );

  // Debounced scroll handler
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!isAutoScrollingRef.current && containerRef?.current) {
        const container = containerRef.current;
        const scrollTop = container.scrollTop;
        const atBottom = checkIfAtBottom(container);
        
        setIsAtBottom(atBottom);

        // If user scrolled up manually, disable autoscroll
        if (scrollTop < lastScrollPositionRef.current - 10 && !atBottom) {
          setHasManuallyScrolled(true);
        }
        // If user scrolled to bottom (or near bottom), re-enable autoscroll
        else if (atBottom) {
          setHasManuallyScrolled(false);
        }
        
        lastScrollPositionRef.current = scrollTop;
      }
    }, debounceMs);
  }, [containerRef, checkIfAtBottom, debounceMs]);

  // Auto scroll to element
  const scrollToElement = useCallback(
    (instant = false) => {
      if (!enabled || !targetRef.current) return;

      isAutoScrollingRef.current = true;

      targetRef.current.scrollIntoView({
        behavior: instant ? 'instant' : behavior,
        block: 'end',
      });

      // Update last scroll position after animation
      setTimeout(
        () => {
          isAutoScrollingRef.current = false;
          if (containerRef?.current) {
            lastScrollPositionRef.current = containerRef.current.scrollTop;
          }
        },
        instant ? 0 : 300,
      );
    },
    [enabled, targetRef, behavior, containerRef],
  );

  // Reset manual scroll state
  const resetManualScroll = useCallback(() => {
    setHasManuallyScrolled(false);
  }, []);

  // Set up scroll listener on container
  useEffect(() => {
    if (!enabled || !containerRef?.current) return;

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    setIsAtBottom(checkIfAtBottom(container));
    lastScrollPositionRef.current = container.scrollTop;

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [enabled, containerRef, handleScroll, checkIfAtBottom]);

  return {
    isAtBottom,
    hasManuallyScrolled,
    scrollToElement,
    resetManualScroll,
  };
}
