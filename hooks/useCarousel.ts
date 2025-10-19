import { useRef, useEffect } from 'react';
import { centerSelected, centerNeighbor, selectClosest } from '../utils/carouselUtils';
import { initScrollToMiddle, doInstantJump } from './carouselHandlers';

interface UseCarouselProps {
  options?: Array<{ value: string; label?: string; icon?: string | React.ComponentType<any> }>;
  value?: string;
  selectedPreset?: string | null;
  onChange?: (value: string) => void;
  onPresetClick?: (preset: string) => void;
}

export const useCarousel = ({
  options,
  value,
  selectedPreset,
  onChange,
  onPresetClick
}: UseCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollEndTimeoutRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const movedRef = useRef(false);
  const suppressClickUntilRef = useRef<number>(0);

  // We'll render the items 3x (tripled) and keep the scroll positioned on the middle segment
  // so the user can scroll endlessly. When near either edge we'll jump the scroll position
  // by one segment width to maintain the illusion of infinite looping.
  useEffect(() => {
    initScrollToMiddle(carouselRef);
  }, [options, value, selectedPreset]);

  // Center on mount/when options change (use instant on init to avoid jump animations)
  useEffect(() => {
    // defer to next frames so layout is stable (matches earlier logic)
    requestAnimationFrame(() => requestAnimationFrame(() => centerSelected(carouselRef.current, value || selectedPreset || undefined, 'auto')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, value, selectedPreset]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollEndTimeoutRef.current) {
        try { window.clearTimeout(scrollEndTimeoutRef.current); } catch (e) { /* ignore */ }
        scrollEndTimeoutRef.current = null;
      }
    };
  }, []);

  const scrollLeft = () => {
    // Move to the previous preset by centering the previous item in the middle segment.
    centerNeighbor(carouselRef.current, -1, onChange, onPresetClick, (val) => centerSelected(carouselRef.current, val, 'smooth'));
  };

  const scrollRight = () => {
    // Move to the next preset by centering the next item in the middle segment.
    centerNeighbor(carouselRef.current, 1, onChange, onPresetClick, (val) => centerSelected(carouselRef.current, val, 'smooth'));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollLeft();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollRight();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    isInteractingRef.current = true;
    if (scrollEndTimeoutRef.current) {
      try { window.clearTimeout(scrollEndTimeoutRef.current); } catch (e) { /* ignore */ }
      scrollEndTimeoutRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    isInteractingRef.current = false;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Mark that the user is interacting (prevents auto-selection)
    isInteractingRef.current = true;
    if (scrollEndTimeoutRef.current) {
      try { window.clearTimeout(scrollEndTimeoutRef.current); } catch (err) { /* ignore */ }
      scrollEndTimeoutRef.current = null;
    }

    // Begin tracking coordinates — don't mark as dragging yet. We'll
    // promote to a drag when the pointer moves past a small threshold.
    const carousel = carouselRef.current;
    // ensure dragging state is reset for clicks
    isDraggingRef.current = false;
    movedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = carousel ? carousel.scrollLeft : 0;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isInteractingRef.current = false;
    // If we were dragging, release capture and suppress the following click
    // (so mouseup doesn't trigger a click on the element beneath).
    if (isDraggingRef.current) {
      try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }

      if (movedRef.current) {
        suppressClickUntilRef.current = Date.now() + 200; // ms
        // reset moved flag now; click handler will check the timestamp
        movedRef.current = false;
      }

      isDraggingRef.current = false;
    }
    // If we never promoted to a drag, this was a click — let the click handler run.
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Only respond to pointermove when the pointer is down / interacting.
    if (!isInteractingRef.current) return;
    const carousel = carouselRef.current;
    if (!carousel) return;
    const dx = e.clientX - dragStartXRef.current;

    // If we haven't started a drag yet, promote to dragging when movement
    // exceeds a small threshold. When promoted, capture the pointer and
    // prevent default to avoid text selection and native gestures.
    if (!isDraggingRef.current) {
      if (Math.abs(dx) <= 3) return; // still a potential click
      // Start dragging
      isDraggingRef.current = true;
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      // prevent text selection while dragging
      try { e.preventDefault(); } catch (err) { /* ignore */ }
    }

    if (Math.abs(dx) > 0) movedRef.current = true;
    // Invert movement so dragging left moves content left (natural feel)
    carousel.scrollLeft = dragStartScrollRef.current - dx;
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    // Treat cancel like pointer up
    isInteractingRef.current = false;
    if (isDraggingRef.current) {
      try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    isDraggingRef.current = false;
  };

  // Scroll handler to jump when hitting either edge segment
  const handleScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const seg = carousel.scrollWidth / 3;
    if (!seg || !isFinite(seg)) return;

    // Use a small pixel threshold so we don't trigger during normal snapping
    const THRESHOLD = 4; // px
    const left = carousel.scrollLeft;

    // When we need to jump, disable smooth scrolling and scroll-snap so the
    // reposition is instantaneous and not visibly animated or snapped.
    const doInstantJumpLocal = (newLeft: number) => doInstantJump(carousel, newLeft);

    // if we've scrolled past the left edge into the first segment, jump right
    if (left <= THRESHOLD) {
      doInstantJumpLocal(left + seg);
      return;
    }

    // if we've scrolled into/after the last segment, jump left
    if (left >= seg * 2 - THRESHOLD) {
      doInstantJumpLocal(left - seg);
      return;
    }

    // If the user is actively interacting (pointer/touch down), skip
    // auto-selection — we'll handle selection on release.
    if (isInteractingRef.current) return;
    // Autoselect disabled: don't automatically choose the closest item after
    // scroll finishes. We still keep the edge-jump logic above for looping.
  };

  return {
    carouselRef,
    scrollLeft,
    scrollRight,
    handleKeyDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleScroll,
    suppressClickUntilRef,
  };
};