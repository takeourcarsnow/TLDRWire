import React, { useRef, useEffect, useState, useCallback } from 'react';
import { centerSelected } from '../utils/carouselUtils';
import { initScrollToMiddle, doInstantJump } from './carouselHandlers';
import { presets } from '../constants/presets';

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
  const isCenteringRef = useRef(false);
  // expose a pending value so the UI can show immediate feedback while waiting
  // for the scroll animation to finish and the parent to be notified.
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  // Compute logical values for wrapping logic
  const logicalValues = options ? options.map(o => o.value) : presets.map(([k]) => k);

  // Infinite / tripled behavior: position the scroll in the middle segment
  // when the carousel first mounts or when the options list changes. Use
  // an instant positioning on first render/options change and smooth
  // transitions for subsequent updates so interactions feel continuous.
  const firstCenterRef = React.useRef(true);
  const prevOptionsRef = React.useRef(options);
  const prevValueRef = React.useRef(value);

  // Center option-based carousels (region/language/category/style) based on
  // their controlled `value`. Only re-center when the value actually changes,
  // not on every render or when unrelated props update.
  useEffect(() => {
    if (!options) return; // handled by the preset-centric effect below

    const optionsChanged = prevOptionsRef.current !== options;
    const valueChanged = prevValueRef.current !== value;
    
    // Only center on mount, options change, or actual value change
    if (!firstCenterRef.current && !optionsChanged && !valueChanged) {
      return;
    }

    const behaviour: 'auto' | 'smooth' = 'smooth';

    if (value) {
      isCenteringRef.current = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        centerSelected(carouselRef.current, value, behaviour);
        setTimeout(() => { isCenteringRef.current = false; }, behaviour === 'smooth' ? 1000 : 0);
      }));
    }

    firstCenterRef.current = false;
    prevOptionsRef.current = options;
    prevValueRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, value, selectedPreset]);

  // Center the preset carousel (the one at the top of the page) when the
  // selected preset changes. This hook instance has no `options` prop and
  // only cares about `selectedPreset`.
  useEffect(() => {
    if (options) return;

    const behaviour: 'auto' | 'smooth' = 'smooth';

    isCenteringRef.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (selectedPreset) {
        centerSelected(carouselRef.current, selectedPreset, behaviour);
      } else {
        initScrollToMiddle(carouselRef);
      }
      setTimeout(() => { isCenteringRef.current = false; }, behaviour === 'smooth' ? 1000 : 0);
    }));

    firstCenterRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, selectedPreset]);

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
    isCenteringRef.current = true;
    const prevSnap = carousel.style.scrollSnapType;
    carousel.style.scrollSnapType = 'none';
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
    // Clear the flag and restore snap after animation completes (rough estimate)
    setTimeout(() => { 
      isCenteringRef.current = false; 
      carousel.style.scrollSnapType = prevSnap || 'x mandatory';
    }, behaviour === 'smooth' ? 1000 : 0);
  }, []);

  // Notify parent for a chosen logical value. This is called when a
  // programmatic scroll animation finishes and we've stabilized on the
  // correct duplicate.
  const notifyParentForValue = useCallback((val: string | null) => {
    if (!val) return;
    if (onChange) onChange(val);
    else if (onPresetClick) onPresetClick(val);
  }, [onChange, onPresetClick]);

  // Move to the previous logical item with seamless wrap. When we move
  // from the first logical item to the last, prefer the duplicate in the
  // left (segment 0) so the animation direction stays consistent.
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

    const currentEl = candidates[closestIndex];
    const currentVal = currentEl?.dataset.originalValue;
    if (!currentVal) return;
    const currentLogicalIndex = logicalValues.indexOf(currentVal);
    if (currentLogicalIndex === -1 || logicalValues.length === 0) return;

    // Compute previous index with wrap-around
    const prevLogicalIndex = (currentLogicalIndex - 1 + logicalValues.length) % logicalValues.length;
    const prevVal = logicalValues[prevLogicalIndex];

    let targetEl = candidates.find(c => c.dataset.originalValue === prevVal && c.dataset.seg === '1') || candidates.find(c => c.dataset.originalValue === prevVal);
    if (!targetEl) return;

    setPendingValue(prevVal);
    centerElement(targetEl, 'smooth');
    // notify parent immediately
    if (onChange) onChange(prevVal);
    else if (onPresetClick) onPresetClick(prevVal);
  }, [centerElement, getCandidates, getCarouselCenter, logicalValues, onChange, onPresetClick]);

  // Move to the next logical item with seamless wrap. When we move from
  // the last logical item back to the first, prefer the duplicate in the
  // right (segment 2) to keep movement direction consistent.
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

    const currentEl = candidates[closestIndex];
    const currentVal = currentEl?.dataset.originalValue;
    if (!currentVal) return;
    const currentLogicalIndex = logicalValues.indexOf(currentVal);
    if (currentLogicalIndex === -1 || logicalValues.length === 0) return;

    // Compute next index with wrap-around
    const nextLogicalIndex = (currentLogicalIndex + 1) % logicalValues.length;
    const nextVal = logicalValues[nextLogicalIndex];

    let targetEl = candidates.find(c => c.dataset.originalValue === nextVal && c.dataset.seg === '1') || candidates.find(c => c.dataset.originalValue === nextVal);
    if (!targetEl) return;

    setPendingValue(nextVal);
    centerElement(targetEl, 'smooth');
    // notify parent immediately
    if (onChange) onChange(nextVal);
    else if (onPresetClick) onPresetClick(nextVal);
  }, [centerElement, getCandidates, getCarouselCenter, logicalValues, onChange, onPresetClick]);

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

  // Scroll handler: maintain loop illusion by jumping back when crossing the midpoint for options-based carousels.
  // For preset carousels, just debounce scroll-end detection.
  const handleScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel || isCenteringRef.current || isDraggingRef.current) return;

    if (options) {
      const totalWidth = carousel.scrollWidth;
      const seg = totalWidth / 3;
      const x = carousel.scrollLeft;

      // Apply the seamless looping jump logic when crossing segment boundaries.
      if (x > seg * 2) {
        doInstantJump(carousel, x - seg);
      } else if (x < seg) {
        doInstantJump(carousel, x + seg * 2);
      }
    }

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

      // Clear pending value only if it matches the closest item (already selected)
      // to avoid unnecessary state updates that cause re-renders
      const closestVal = closest.dataset.originalValue;
      if (closestVal && pendingValue === closestVal) {
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
      // find the DOM element for the requested value, preferring middle segment
      const middleCandidates = candidates.filter(c => c.dataset.originalValue === val && c.dataset.seg === '1');
      const candidatesToCheck = middleCandidates.length > 0 ? middleCandidates : candidates.filter(c => c.dataset.originalValue === val);
      const carouselCenter = getCarouselCenter();
      let best = Number.POSITIVE_INFINITY;
      for (const c of candidatesToCheck) {
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