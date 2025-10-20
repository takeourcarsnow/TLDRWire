import React, { useRef, useEffect, useState, useCallback } from 'react';
import { centerSelected } from '../utils/carouselUtils';

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
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollEndTimeoutRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const movedRef = useRef(false);
  const suppressClickUntilRef = useRef<number>(0);

  // Programmatic scroll state
  const isProgrammaticScrollRef = useRef(false);
  // expose a pending value so the UI can show immediate feedback while waiting
  // for the scroll animation to finish and the parent to be notified.
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  // No infinite/tripled behavior: do not reposition the scroll on options
  // changes. We'll simply center the chosen value when needed.

  // Center on mount/when options change. Use an instant (non-animated)
  // positioning when first initializing or when the underlying options
  // list changes, but use smooth animation for subsequent selection
  // updates so the UI feels continuous when the user selects multiple
  // items in a row.
  const firstCenterRef = React.useRef(true);
  const prevOptionsRef = React.useRef(options);
  useEffect(() => {
    const optionsChanged = prevOptionsRef.current !== options;
    const behaviour: 'auto' | 'smooth' = firstCenterRef.current || optionsChanged ? 'auto' : 'smooth';

    // Center the current selection when value/selectedPreset changes.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      centerSelected(carouselRef.current, value || selectedPreset || undefined, behaviour);
    }));

    firstCenterRef.current = false;
    prevOptionsRef.current = options;
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

  // Helper: compute the current visible carousel center (client coordinates)
  const getCarouselCenter = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return 0;
    const rect = carousel.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }, []);

  // Helper: return all rendered candidate buttons (tripled duplicates)
  const getCandidates = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return [] as HTMLElement[];
    return Array.from(carousel.querySelectorAll('[data-original-value]')) as HTMLElement[];
  }, []);

  // Center a specific DOM element within the carousel (by its center).
  const centerElement = useCallback((el: HTMLElement | null, behaviour: 'auto' | 'smooth' = 'smooth') => {
    const carousel = carouselRef.current;
    if (!carousel || !el) return;
    const carouselRect = carousel.getBoundingClientRect();
    const buttonRect = el.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    const buttonCenter = buttonRect.left + buttonRect.width / 2;
    const scrollLeft = carousel.scrollLeft + (buttonCenter - carouselCenter);
    try {
      carousel.scrollTo({ left: scrollLeft, behavior: behaviour });
    } catch (e) {
      // fallback for older browsers
      carousel.scrollLeft = scrollLeft;
    }
  }, []);

  // Notify parent for a chosen logical value. This is called when a
  // programmatic scroll animation finishes and we've stabilized on the
  // correct duplicate.
  const notifyParentForValue = useCallback((val: string | null) => {
    if (!val) return;
    if (onChange) onChange(val);
    else if (onPresetClick) onPresetClick(val);
  }, [onChange, onPresetClick]);

  // Move to the previous logical item — finite behavior (no wrapping).
  const scrollLeft = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const candidates = getCandidates();
    if (candidates.length === 0) return;
    const carouselCenter = getCarouselCenter();
    let closestIndex = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    candidates.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const dist = Math.abs(center - carouselCenter);
      if (dist < bestDist) {
        bestDist = dist;
        closestIndex = idx;
      }
    });
    const prevIndex = Math.max(0, closestIndex - 1);
    if (prevIndex === closestIndex) return; // already at start
    const prevEl = candidates[prevIndex];
    const val = prevEl?.dataset.originalValue || null;
    if (!prevEl || !val) return;
    setPendingValue(val);
    centerElement(prevEl, 'smooth');
    // notify parent immediately
    if (onChange) onChange(val);
    else if (onPresetClick) onPresetClick(val);
  }, [centerElement, getCandidates, getCarouselCenter, onChange, onPresetClick]);

  // Move to the next logical item — finite behavior (no wrapping).
  const scrollRight = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const candidates = getCandidates();
    if (candidates.length === 0) return;
    const carouselCenter = getCarouselCenter();
    let closestIndex = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    candidates.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const dist = Math.abs(center - carouselCenter);
      if (dist < bestDist) {
        bestDist = dist;
        closestIndex = idx;
      }
    });
    const nextIndex = Math.min(candidates.length - 1, closestIndex + 1);
    if (nextIndex === closestIndex) return; // already at end
    const nextEl = candidates[nextIndex];
    const val = nextEl?.dataset.originalValue || null;
    if (!nextEl || !val) return;
    setPendingValue(val);
    centerElement(nextEl, 'smooth');
    // notify parent immediately
    if (onChange) onChange(val);
    else if (onPresetClick) onPresetClick(val);
  }, [centerElement, getCandidates, getCarouselCenter, onChange, onPresetClick]);

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

  // Scroll handler: maintain infinite loop illusion by jumping to the
  // middle segment when crossing either edge, and detect scroll end so we
  // can pick the closest item and notify the parent (deferred to avoid
  // interrupting ongoing animations or causing mid-scroll re-renders).
  const handleScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    // debounce scroll-end detection
    if (scrollEndTimeoutRef.current) {
      try { window.clearTimeout(scrollEndTimeoutRef.current); } catch (e) { /* ignore */ }
      scrollEndTimeoutRef.current = null;
    }
    scrollEndTimeoutRef.current = window.setTimeout(() => {
      scrollEndTimeoutRef.current = null;
      const carouselEl = carouselRef.current;
      if (!carouselEl) return;
      const candidates = getCandidates();
      if (candidates.length === 0) return;

      let closest: HTMLElement | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      const carouselRect = carouselEl.getBoundingClientRect();
      const carouselCenter = carouselRect.left + carouselRect.width / 2;
      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - carouselCenter);
        if (dist < bestDist) {
          bestDist = dist;
          closest = el;
        }
      }
      if (!closest) return;

      // Clear any optimistic pending highlight but do NOT auto-select the
      // closest item when the user scrolls. Selection remains under the
      // control of explicit actions (clicks/arrow keys/selectValue).
      setPendingValue(null);
    }, 120) as unknown as number;
  };

  // Select a logical value: center a specific duplicate (clickedElement
  // if provided, otherwise prefer the middle-segment duplicate), show an
  // optimistic pending selection and notify the parent after the scroll
  // animation ends.
  const selectValue = useCallback((val: string, el?: HTMLElement | null) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const candidates = getCandidates();
    if (candidates.length === 0) return;

    let targetEl: HTMLElement | null = null;
    if (el) targetEl = el;
    else {
      // find the closest DOM element for the requested value
      const carouselCenter = getCarouselCenter();
      let best = Number.POSITIVE_INFINITY;
      for (const c of candidates) {
        if (c.dataset.originalValue !== val) continue;
        const r = c.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - carouselCenter);
        if (dist < best) {
          best = dist;
          targetEl = c;
        }
      }
    }
    if (!targetEl) return;
    setPendingValue(val);
    centerElement(targetEl, 'smooth');
    // Notify parent immediately for a straightforward controlled API.
    if (onChange) onChange(val);
    else if (onPresetClick) onPresetClick(val);
  }, [centerElement, getCandidates, getCarouselCenter, onChange, onPresetClick]);

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
    selectValue,
    pendingValue,
  };
};