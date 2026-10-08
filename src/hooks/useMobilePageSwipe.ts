import { useCallback, useRef, type TouchEventHandler } from "react";

interface TouchStart {
  x: number;
  y: number;
  startedAt: number;
}

interface MobilePageSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: (startedAtEdge: boolean) => void;
}

const SWIPE_THRESHOLD = 60;
const EDGE_WIDTH = 160;
const MAX_SWIPE_DURATION = 1000;

function isSwipeExcluded(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(
    "input, textarea, select, [contenteditable='true'], [role='dialog'], [data-radix-popper-content-wrapper], [data-no-page-swipe]",
  );
}

export function useMobilePageSwipe({ onSwipeLeft, onSwipeRight }: MobilePageSwipeOptions) {
  const touchStart = useRef<TouchStart | null>(null);

  const onTouchStart: TouchEventHandler<HTMLElement> = useCallback((event) => {
    if (event.touches.length !== 1 || isSwipeExcluded(event.target)) {
      touchStart.current = null;
      return;
    }
    if (!window.matchMedia("(max-width: 1023px)").matches) {
      touchStart.current = null;
      return;
    }

    const touch = event.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      startedAt: Date.now(),
    };
  }, []);

  const onTouchEnd: TouchEventHandler<HTMLElement> = useCallback((event) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || event.changedTouches.length !== 1 || isSwipeExcluded(event.target)) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = Math.abs(touch.clientY - start.y);
    if (
      Math.abs(dx) < SWIPE_THRESHOLD
      || dy > Math.abs(dx) * 0.75
      || Date.now() - start.startedAt > MAX_SWIPE_DURATION
    ) return;

    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.(start.x <= EDGE_WIDTH);
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchEnd };
}
