import { useLayoutEffect } from 'react';

/**
 * Locks scrolling and touch gestures on the document body while enabled.
 * Uses inline styles and a data attribute so it's easy to override in tests.
 */
export default function useLockBodyScroll(enabled: boolean) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const doc = document.documentElement;
    const body = document.body;

    // Preserve previous values so we can restore them exactly
    const prevOverflow = body.style.overflow;
    const prevTouchAction = doc.style.touchAction;
    const prevPaddingRight = body.style.paddingRight;

    // Add a small padding to compensate for potential scrollbar disappearance
    // to avoid layout shift on desktop.
    const scrollbarWidth = window.innerWidth - doc.clientWidth;
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    body.style.overflow = 'hidden';
    // Prevent touch-based swiping / overscroll on mobile
    doc.style.touchAction = 'none';

    // Mark lock for CSS selectors if needed
    body.setAttribute('data-scroll-locked', 'true');

    return () => {
      try { body.style.overflow = prevOverflow || ''; } catch (e) {}
      try { doc.style.touchAction = prevTouchAction || ''; } catch (e) {}
      try { body.style.paddingRight = prevPaddingRight || ''; } catch (e) {}
      try { body.removeAttribute('data-scroll-locked'); } catch (e) {}
    };
  }, [enabled]);
}
