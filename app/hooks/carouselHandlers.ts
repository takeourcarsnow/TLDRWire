import { RefObject } from 'react';
import { centerSelected } from '../utils/carouselUtils';

export function initScrollToMiddle(carouselRef: RefObject<HTMLDivElement | null>) {
  const init = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const seg = carousel.scrollWidth / 3;
    if (seg && isFinite(seg)) {
      carousel.scrollLeft = seg;
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(init));
}

export function centerOnSelected(carouselRef: RefObject<HTMLDivElement | null>, value?: string | null | undefined) {
  // Defer to the utility which will choose the duplicate closest to the
  // carousel center (preferring the middle segment when available).
  requestAnimationFrame(() => requestAnimationFrame(() => {
    centerSelected(carouselRef.current, value || undefined, 'smooth');
  }));
}

export function doInstantJump(carousel: HTMLDivElement, newLeft: number) {
  const prevBehavior = carousel.style.scrollBehavior;
  const prevSnap = carousel.style.scrollSnapType;
  try {
    carousel.style.scrollBehavior = 'auto';
    carousel.style.scrollSnapType = 'none';
    carousel.scrollLeft = newLeft;
  } finally {
    // Keep scroll-behavior as auto to prevent smooth snapping
    carousel.style.scrollBehavior = 'auto';
    carousel.style.scrollSnapType = prevSnap || 'x mandatory';
  }
}
