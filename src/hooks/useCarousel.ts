import React, { useRef, useEffect, useState, useCallback } from 'react';
import { centerSelected } from '../utils/carouselUtils';
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
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollEndTimeoutRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const movedRef = useRef(false);
  const suppressClickUntilRef = useRef<number>(0);
  const lastInteractionWasDragRef = useRef(false);

  // Programmatic scroll state
  const isProgrammaticScrollRef = useRef(false);
  // expose a pending value so the UI can show immediate feedback while waiting
  // for the scroll animation to finish and the parent to be notified.
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  // Infinite / tripled behavior: position the scroll in the middle segment
  // when the carousel first mounts or when the options list changes. Use
  // an instant positioning on first render/options change and smooth
  // transitions for subsequent updates so interactions feel continuous.
  const firstCenterRef = React.useRef(true);
  const prevOptionsRef = React.useRef(options);
  useEffect(() => {
    const optionsChanged = prevOptionsRef.current !== options;
    const behaviour: 'auto' | 'smooth' = firstCenterRef.current || optionsChanged ? 'auto' : 'smooth';

    // If this is the first render or the options changed, ensure the
    // scroll sits in the middle segment so we can create a seamless
    // infinite wrap illusion. We also center the selected value after
    // initialization (auto / smooth depending on context).
    if (firstCenterRef.current || optionsChanged) {
      initScrollToMiddle(carouselRef);
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
      centerSelected(carouselRef.current, value || selectedPreset || undefined, behaviour);
    }));

    firstCenterRef.current = false;
    prevOptionsRef.current = options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, value, selectedPreset]);

  // When a preset is selected, center all carousels on their current value
  useEffect(() => {
    if (value && selectedPreset !== undefined) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        centerSelected(carouselRef.current, value, 'smooth');
      }));
    }
  }, [selectedPreset, value]);

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

  // Move to the previous logical item — wrap seamlessly by centering the
  // middle-segment duplicate of the previous logical value.
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

    // Compute previous index with wrap so arrow always moves one logical
    // item backward even when at segment boundaries.
    const prevIndex = (closestIndex - 1 + candidates.length) % candidates.length;
    const prevVal = candidates[prevIndex]?.dataset.originalValue || null;
    if (!prevVal) return;

    // Prefer the middle-segment duplicate for smooth animation — this
    // avoids animating to an edge duplicate then teleporting to the
    // middle segment on scroll end.
    const midEl = candidates.find(c => c.dataset.originalValue === prevVal && c.dataset.seg === '1') || candidates[prevIndex];
    setPendingValue(prevVal);
    centerElement(midEl as HTMLElement, 'smooth');
    // notify parent immediately
    if (onChange) onChange(prevVal);
    else if (onPresetClick) onPresetClick(prevVal);
  }, [centerElement, getCandidates, getCarouselCenter, onChange, onPresetClick]);

  // Move to the next logical item — wrap seamlessly by centering the
  // middle-segment duplicate of the next logical value.
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

    // Compute next index with wrap so arrow always moves one logical
    // item forward even when at segment boundaries.
    const nextIndex = (closestIndex + 1) % candidates.length;
    const nextVal = candidates[nextIndex]?.dataset.originalValue || null;
    if (!nextVal) return;

    // Prefer the middle-segment duplicate for smooth animation.
    const midEl = candidates.find(c => c.dataset.originalValue === nextVal && c.dataset.seg === '1') || candidates[nextIndex];
    setPendingValue(nextVal);
    centerElement(midEl as HTMLElement, 'smooth');
    // notify parent immediately
    if (onChange) onChange(nextVal);
    else if (onPresetClick) onPresetClick(nextVal);
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
    // On non-touch pointers (mouse/pen) stop propagation so the page-level
    // swiper does not receive the gesture and accidentally advances while
    // the user is interacting with the inner carousel on desktop.
    // Keep touch events propagating so mobile swipes continue to work as
    // before.
    try {
      if (e.pointerType !== 'touch') {
        e.stopPropagation();
        // Also stop immediate propagation on the native event to try and
        // prevent any native listeners (e.g. Swiper) from running after
        // this handler.
        try { (e.nativeEvent as Event).stopImmediatePropagation(); } catch (err) { /* ignore */ }
        return; // Disable mouse dragging
      }
    } catch (err) {
      // defensive: some environments may not expose pointerType
    }
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
    lastInteractionWasDragRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = carousel ? carousel.scrollLeft : 0;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Prevent parent handlers on desktop mouse/pen pointer up too.
    try {
      if (e.pointerType !== 'touch') {
        e.stopPropagation();
        try { (e.nativeEvent as Event).stopImmediatePropagation(); } catch (err) { /* ignore */ }
      }
    } catch (err) {
      /* ignore */
    }
    isInteractingRef.current = false;
    // If we were dragging, release capture and suppress the following click
    // (so mouseup doesn't trigger a click on the element beneath).
    if (isDraggingRef.current) {
      try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }

      if (movedRef.current) {
        suppressClickUntilRef.current = Date.now() + 200; // ms
        // reset moved flag now; click handler will check the timestamp
        movedRef.current = false;
        // Auto-select the closest item after drag release
        setTimeout(() => {
          const carousel = carouselRef.current;
          if (!carousel) return;
          const candidates = getCandidates();
          if (candidates.length === 0) return;
          const carouselCenter = getCarouselCenter();
          let closest: HTMLElement | null = null;
          let bestDist = Number.POSITIVE_INFINITY;
          for (const el of candidates) {
            const r = el.getBoundingClientRect();
            const center = r.left + r.width / 2;
            const dist = Math.abs(center - carouselCenter);
            if (dist < bestDist) {
              bestDist = dist;
              closest = el;
            }
          }
          if (closest && closest.dataset.originalValue) {
            const val = closest.dataset.originalValue;
            setPendingValue(val);
            notifyParentForValue(val);
            centerElement(closest, 'smooth');
          }
        }, 150);
      }

      isDraggingRef.current = false;
    }
    // If we never promoted to a drag, this was a click — let the click handler run.
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Stop propagation for non-touch pointer moves so the parent swiper
    // doesn't receive the drag gestures on desktop.
    try {
      if (e.pointerType !== 'touch') {
        e.stopPropagation();
        try { (e.nativeEvent as Event).stopImmediatePropagation(); } catch (err) { /* ignore */ }
      }
    } catch (err) {
      /* ignore */
    }

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
      lastInteractionWasDragRef.current = true;
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      // prevent text selection while dragging
      try { e.preventDefault(); } catch (err) { /* ignore */ }
    }

    if (Math.abs(dx) > 0) movedRef.current = true;
    // Invert movement so dragging left moves content left (natural feel)
    carousel.scrollLeft = dragStartScrollRef.current - dx;
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    // Treat cancel like pointer up. Also prevent parent handlers for
    // non-touch pointer types.
    try {
      if (e.pointerType !== 'touch') {
        e.stopPropagation();
        try { (e.nativeEvent as Event).stopImmediatePropagation(); } catch (err) { /* ignore */ }
      }
    } catch (err) {
      /* ignore */
    }
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

      // If the closest duplicate lives in the left/right segment, jump
      // instantly to the equivalent middle-segment duplicate so the
      // user remains in the center segment and can continue wrapping.
      const seg = Number(closest.dataset.seg || '1');
      if (seg !== 1) {
        const orig = closest.dataset.originalValue;
        if (orig) {
          const midEl = candidates.find(c => c.dataset.originalValue === orig && c.dataset.seg === '1');
          if (midEl) {
            const closestRect = closest.getBoundingClientRect();
            const midRect = midEl.getBoundingClientRect();
            const delta = (midRect.left + midRect.width / 2) - (closestRect.left + closestRect.width / 2);
            const newLeft = carouselEl.scrollLeft + delta;
            try {
              doInstantJump(carouselEl, newLeft);
            } catch (err) {
              // ignore any errors from instant jump
            }
          }
        }
      }

      if (!isInteractingRef.current && lastInteractionWasDragRef.current) {
        const val = closest.dataset.originalValue;
        if (val) {
          setPendingValue(val);
          notifyParentForValue(val);
          centerSelected(carouselEl, val, 'smooth');
        }
        lastInteractionWasDragRef.current = false;
      } else {
        // Clear any optimistic pending highlight but do NOT auto-select the
        // closest item when the user scrolls. Selection remains under the
        // control of explicit actions (clicks/arrow keys/selectValue).
        setPendingValue(null);
      }
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